"""Calculator action policy using the shared scoped trycua observation layer."""
import argparse
import asyncio
import hashlib
import json
import re
from pathlib import Path
from cua_observer import open_observer
from observation_bridge import serve

BUTTONS = set('零 一 二 三 四 五 六 七 八 九 乘以 除以 加 减 等于 清除条目 清除'.split())
DIGITS = dict(zip('零一二三四五六七八九', '0123456789'))
OPERATORS = {'乘以': 'multiply (×)', '除以': 'divide (÷)', '加': 'add (+)', '减': 'subtract (−)',
             '等于': 'equals (=), evaluate the entered expression', '清除条目': 'clear current entry (CE)', '清除': 'clear current calculation (C)'}


def describe(label):
    if label in DIGITS:
        return f'Press digit {DIGITS[label]} (UI label {label})'
    return f'Press {OPERATORS[label]} (UI label {label})'


class CalculatorTask:
    def __init__(self, observer, identity, title):
        self.observer, self.identity, self.title = observer, identity, title
        self.cache, self.connection_info = {}, {}

    async def snapshot(self):
        self.cache.clear()
        reply = await self.observer.read('get_window_state', {**self.identity, 'include_screenshot': False})
        state = reply['data']
        if not reply['ok'] or not isinstance(state, dict):
            raise RuntimeError('Window observation failed')
        if state.get('window_title') != self.title or state.get('window_id') != self.identity['window_id']:
            raise RuntimeError('Target changed')
        controls = [e for e in state.get('elements', []) if e.get('role') == 'Button' and e.get('enabled') and e.get('label') in BUTTONS and e.get('element_token')]
        if len(controls) < 14:
            raise RuntimeError('Arithmetic controls unavailable')
        tree = state.get('tree_markdown', '')
        display = re.search(r'Text "显示为 ([^"]*)"', tree)
        expression = re.search(r'Text "表达式为 ([^"]*)"', tree)
        if not display:
            raise RuntimeError('Calculator display unavailable')
        facts = {'display': display[1], 'expression': expression[1] if expression else ''}
        summary = f"Calculator expression: {facts['expression'] or '(empty)'}. Display: {facts['display']}. After a completed equals, a digit begins a new calculation."
        actions = [{'id': 'button:' + e['label'], 'description': describe(e['label']), 'kind': 'click', 'requiresApproval': False, 'binding': {'rect': e['frame']}} for e in controls]
        if len({a['id'] for a in actions}) != len(actions):
            raise RuntimeError('Ambiguous controls')
        binding = {'windowId': self.identity['window_id'], 'bounds': state['window_bounds']}
        revision = hashlib.sha256(json.dumps([summary, actions, binding], ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        self.cache.update(revision=revision, epoch=self.observer.epoch,
                          tokens={'button:' + e['label']: e['element_token'] for e in controls})
        return {'revision': revision, 'app': 'Windows Calculator', 'summary': summary,
                'facts': facts, 'actions': actions, 'binding': binding}

    async def execute(self, request):
        if set(request) != {'revision', 'actionId'} or request['revision'] != self.cache.get('revision') or self.cache.get('epoch') != self.observer.epoch or request['actionId'] not in self.cache.get('tokens', {}):
            raise ValueError('Stale or unknown operation')
        token = self.cache['tokens'][request['actionId']]
        self.cache.clear()
        self.observer.epoch += 1
        reply = await self.observer.invoke('click', {**self.identity, 'element_token': token})
        data = reply.structuredContent or {}
        if reply.isError or data.get('refusal') or data.get('status') in ('refused', 'error'):
            raise RuntimeError('Input failed or refused; reobserve before continuing')
        return {'dispatched': True}


async def main(args):
    if Path(args.config).exists():
        raise RuntimeError('Stop old bridge before removing its configuration')
    async with open_observer(args.driver, {'windows': []}) as observer:
        windows = (await observer.read('list_windows'))['data']['windows']
        choices = [w for w in windows if w.get('app_name') == 'ApplicationFrameHost.exe' and w.get('title') == args.title and not w.get('minimized')]
        if len(choices) != 1:
            raise RuntimeError('Open exactly one visible Calculator with the requested title')
        identity = {k: choices[0][k] for k in ('pid', 'window_id')}
        observer.add_window(identity)
        await serve(observer, args.config, CalculatorTask(observer, identity, args.title))


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--driver', required=True)
    p.add_argument('--config', default='.local/bridge.json')
    p.add_argument('--title', default='计算器')
    try:
        asyncio.run(main(p.parse_args()))
    except KeyboardInterrupt:
        pass
