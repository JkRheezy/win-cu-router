"""Bounded action policy for browser examples, separate from generic observation.

Only exact task-supplied labels and literal values can become executable actions.
The shared observer retains the entire browser response for other host consumers.
"""
import asyncio
import hashlib
import json
import time
from urllib.parse import urlsplit


def origin(url):
    p = urlsplit(url)
    if p.scheme not in ('http', 'https') or not p.netloc or p.username or p.password:
        raise ValueError('Invalid browser URL')
    return p.scheme + '://' + p.netloc


class BrowserTask:
    def __init__(self, observer, spec):
        self.observer, self.spec = observer, spec
        self.origins = set(spec['allowedOrigins'])
        if origin(spec['url']) not in self.origins:
            raise ValueError('Initial URL outside task scope')
        self.labels, self.fields = set(spec.get('clickNames', [])), spec.get('fields', {})
        if len(self.labels) + len(self.fields) > 48 or any(not isinstance(v, str) for v in self.fields.values()):
            raise ValueError('Too many actions or invalid literal field value')
        if spec.get('clickRoute', 'trusted') not in ('trusted', 'dom_event'):
            raise ValueError('Unknown click route')
        self.cache = {}
        self.connection_info = {}

    async def dispatch(self, name, args):
        self.observer.epoch += 1
        response = await self.observer.invoke(name, args)
        data = response.structuredContent
        if response.isError or not isinstance(data, dict) or data.get('refusal') or data.get('status') in ('refused', 'error'):
            raise RuntimeError(name + ' failed or refused')
        return data

    async def read(self, name, args):
        envelope = await self.observer.read(name, args)
        if not envelope['ok'] or not isinstance(envelope['data'], dict):
            refusal = (envelope.get('data') or {}).get('refusal') or {}
            raise RuntimeError(name + ' failed or refused: ' + str(refusal.get('code', 'unknown')))
        return envelope['data']

    async def prepare(self):
        # Explicit launch/setup; observation never enables CDP in a personal profile.
        prepared = await self.dispatch('browser_prepare', {'allow_launch': True, 'profile': {'mode': 'isolated_new'}})
        pid, windows = prepared['prepared_pid'], []
        for _ in range(25):
            windows = (await self.read('list_windows', {'pid': pid}))['windows']
            if windows:
                break
            await asyncio.sleep(.2)
        if not windows:
            raise RuntimeError('Isolated browser has no native window')
        window = max(windows, key=lambda w: w['bounds']['width'] * w['bounds']['height'])
        self.identity = {k: window[k] for k in ('pid', 'window_id')}
        self.observer.add_window(self.identity)
        bound = await self.read('get_browser_state', self.identity)
        tab = next((t for t in bound['tabs'] if t.get('active')), bound['tabs'][0])
        self.target = {'target_id': bound['target_id'], 'tab_id': tab['tab_id']}
        self.connection_info = {'browserPid': pid, 'windowId': window['window_id'], 'browserTarget': self.target}
        await self.dispatch('browser_navigate', {**self.target, 'url': self.spec['url']})

    async def rebind(self):
        self.cache.clear()
        bound = await self.read('get_browser_state', self.identity)
        # The example owns one isolated tab. Never silently pick another tab
        # when a human or external process has changed that condition.
        tabs = bound.get('tabs', [])
        if len(tabs) != 1:
            raise RuntimeError('Session resumed but isolated browser tab is ambiguous')
        self.target = {'target_id': bound['target_id'], 'tab_id': tabs[0]['tab_id']}
        self.connection_info['browserTarget'] = self.target

    async def snapshot(self):
        self.cache.clear()
        deadline = time.monotonic() + 5
        while True:
            state = await self.read('get_browser_state', {**self.target, 'snapshot_format': 'semantic_v2'})
            # Tab title may remain about:blank after navigation despite a ready semantic tree.
            if state.get('refs') or time.monotonic() >= deadline:
                break
            await asyncio.sleep(.15)
        page = state.get('page', {})
        if origin(page.get('url', '')) not in self.origins:
            raise RuntimeError('Browser navigated outside task origins')
        actions, bindings, values, seen = [], {}, {}, set()
        refs = sorted(state.get('refs', []), key=lambda r: 0 if r.get('visibility') == 'in_viewport' else 1)
        for ref in refs:
            name, role = ref.get('name') or '', ref.get('role')
            if ref.get('states', {}).get('disabled') or ref.get('visibility') in ('css_hidden', 'no_layout', 'page_occluded'):
                continue
            mode = None
            if name in self.fields and 'type' in ref.get('actions', []):
                values[name] = ref.get('value')
                if ref.get('value') != self.fields[name]:
                    mode = 'type'
            elif name in self.labels and 'click' in ref.get('actions', []):
                mode = 'click'
            if not mode or (mode, name) in seen:
                continue
            seen.add((mode, name))
            aid = hashlib.sha256((mode + '\0' + name).encode()).hexdigest()[:20]
            description = f'Click {role} {name}' if mode == 'click' else f'Fill {role} {name} with {self.fields[name]!r}'
            actions.append({'id': aid, 'kind': mode, 'description': description, 'requiresApproval': False})
            bindings[aid] = {'ref': ref['ref'], 'mode': mode, 'name': name}
        content = state.get('content_refs', [])
        text = '\n'.join(str(r['name']) for r in content if r.get('name') and r.get('role') in ('heading', 'statictext', 'paragraph'))
        title = page.get('title')
        if title in (None, '', 'about:blank'):
            title = next((r['name'] for r in content if r.get('role') == 'rootwebarea' and r.get('name')), title)
        facts = {'url': page.get('url'), 'title': title, 'text': text[:10000], 'fields': values}
        coverage = {'snapshot': state.get('snapshot'), 'textTruncated': len(text) > 10000,
                    'actionsProjectedByTask': True, 'rawTitle': page.get('title')}
        # Route on stable page structure; rotating banners must not invalidate an
        # unchanged navigation choice. Full content remains available in facts/raw reads.
        route_state = {'url': facts['url'], 'title': title, 'fields': values,
                       'headings': [r['name'] for r in content if r.get('role') == 'heading' and r.get('name')][:30]}
        revision = hashlib.sha256(json.dumps([route_state, actions], sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        self.cache.update(revision=revision, bindings=bindings, epoch=self.observer.epoch)
        return {'revision': revision, 'app': 'Isolated Chromium via trycua',
                'summary': json.dumps(route_state, ensure_ascii=False), 'facts': facts,
                'actions': actions, 'coverage': coverage}

    async def execute(self, request):
        if set(request) != {'revision', 'actionId'} or request['revision'] != self.cache.get('revision') or self.cache.get('epoch') != self.observer.epoch or request['actionId'] not in self.cache.get('bindings', {}):
            raise ValueError('Stale or unknown operation; observe again')
        chosen = self.cache['bindings'][request['actionId']]
        self.cache.clear()
        if chosen['mode'] == 'type':
            await self.dispatch('browser_type', {**self.target, 'ref': chosen['ref'], 'text': self.fields[chosen['name']], 'replace': True})
        else:
            await self.dispatch('browser_click', {**self.target, 'ref': chosen['ref'], 'input_route': self.spec.get('clickRoute', 'trusted')})
        return {'dispatched': True}
