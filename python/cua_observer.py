"""One persistent trycua transport, with an explicitly scoped observation API.

Raw structured results and image blocks stay available to the host. Observing
does not grant execution rights. The host serializes read/action transactions.
"""
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import time
from jsonschema import validate
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

READ_TOOLS = {
    'list_apps', 'list_windows', 'get_accessibility_tree', 'get_window_state',
    'verify_state', 'get_browser_state', 'browser_dialog', 'zoom',
    'get_desktop_state', 'clipboard_read', 'get_screen_size', 'get_cursor_position',
    'get_agent_cursor_state', 'check_permissions', 'health_report', 'get_config',
    'get_recording_state', 'get_session', 'list_sessions', 'get_session_state',
    'debug_window_info',
}
WINDOW_TOOLS = {'get_window_state', 'verify_state', 'zoom'}
SNAPSHOT_TOOLS = {'get_window_state', 'get_browser_state', 'verify_state', 'zoom', 'get_desktop_state'}


class ObservationDenied(ValueError):
    pass


class CuaObserver:
    def __init__(self, client, schemas, scope, label='win-cu-router'):
        self.client, self.schemas, self.label = client, schemas, label
        if set(scope) - {'windows', 'allowDesktop', 'allowClipboard', 'allowDiagnostics'}:
            raise ValueError('Unknown observation scope option')
        self.windows = set()
        for window in scope.get('windows', []):
            self.add_window(window)
        self.desktop = scope.get('allowDesktop') is True
        self.clipboard = scope.get('allowClipboard') is True
        self.diagnostics = scope.get('allowDiagnostics') is True
        self.targets = {}
        self.epoch = 0

    def add_window(self, window):
        pid, wid = window.get('pid'), window.get('window_id')
        if type(pid) is not int or pid <= 0 or type(wid) is not int or wid <= 0:
            raise ValueError('Explicit positive pid and window_id required')
        self.windows.add((pid, wid))

    def capabilities(self):
        entries = []
        for name in sorted(READ_TOOLS):
            enabled = name in self.schemas
            reason = None if enabled else 'not_in_installed_driver'
            if name == 'get_desktop_state' and not self.desktop:
                enabled, reason = False, 'desktop_scope_disabled'
            if name == 'clipboard_read' and not self.clipboard:
                enabled, reason = False, 'clipboard_scope_disabled'
            if name == 'debug_window_info' and not self.diagnostics:
                enabled, reason = False, 'process_diagnostics_disabled'
            entries.append({'tool': name, 'available': name in self.schemas,
                            'enabled': enabled, 'reason': reason,
                            'inputSchema': self.schemas.get(name),
                            'restrictions': ['exact_bound_tab', 'inspect_only'] if name == 'browser_dialog' else []})
        return {'schemaVersion': 1, 'tools': entries,
                'scope': {'windows': [{'pid': p, 'window_id': w} for p, w in sorted(self.windows)],
                          'allowDesktop': self.desktop, 'allowClipboard': self.clipboard},
                'excluded': {'page': 'Legacy targeting cannot guarantee exact tab ownership; use get_browser_state',
                             'browser_prepare': 'Setup mutates state; separate host operation',
                             'parse_visual_regions': 'No such tool in the tested driver; no OCR invented'}}

    def validate_read(self, name, args):
        if name not in READ_TOOLS or name not in self.schemas:
            raise ObservationDenied('Unsupported observation tool')
        if not isinstance(args, dict):
            raise ObservationDenied('Arguments must be an object')
        schema = self.schemas[name]
        # Even upstream additionalProperties:true is not an arbitrary extension point.
        allowed = set(schema.get('properties', {})) - {'session', 'screenshot_out_file'}
        if set(args) - allowed:
            raise ObservationDenied('Unknown, session-overriding or file-writing argument')
        effective = dict(args)
        if 'session' in schema.get('properties', {}):
            effective['session'] = self.label
        validate(effective, schema)
        if name in WINDOW_TOOLS or name == 'get_browser_state' and 'target_id' not in args:
            if (args.get('pid'), args.get('window_id')) not in self.windows:
                raise ObservationDenied('Window outside configured scope')
        if name == 'get_browser_state':
            if 'target_id' in args:
                if 'pid' in args or 'window_id' in args:
                    raise ObservationDenied('Do not mix native and browser targets')
                self.require_tab(args)
            elif set(args) - {'pid', 'window_id'}:
                raise ObservationDenied('Bind takes only the exact native window identity')
        if name == 'browser_dialog':
            self.require_tab(args)
            if args.get('action') != 'inspect' or set(args) - {'target_id', 'tab_id', 'action'}:
                raise ObservationDenied('Only dialog inspection is observation')
        if name == 'get_desktop_state' and not self.desktop:
            raise ObservationDenied('Desktop observation disabled')
        if name == 'clipboard_read' and not self.clipboard:
            raise ObservationDenied('Clipboard observation disabled')
        if name == 'debug_window_info' and (not self.diagnostics or args.get('pid') not in {p for p, _ in self.windows}):
            raise ObservationDenied('Process diagnostics outside configured scope')
        return effective

    def require_tab(self, args):
        if args.get('tab_id') not in self.targets.get(args.get('target_id'), set()):
            raise ObservationDenied('Browser target/tab was not bound in this transport')

    async def invoke(self, name, args):
        """Host-only transport; never exposed as an HTTP general execution proxy."""
        if name not in self.schemas:
            raise ObservationDenied('Tool absent from installed driver')
        arguments = dict(args)
        if 'session' in self.schemas[name].get('properties', {}):
            arguments['session'] = self.label
        return await asyncio.wait_for(self.client.call_tool(name, arguments), 20)

    async def restart_session(self):
        """Explicit host lifecycle operation, never an implicit action retry."""
        self.epoch += 1
        self.targets.clear()
        reply = await self.invoke('start_session', {})
        data = reply.structuredContent
        if reply.isError or isinstance(data, dict) and (data.get('refusal') or data.get('status') in ('refused', 'error')):
            raise RuntimeError('Session restart refused')
        return {'restarted': True, 'epoch': self.epoch, 'requiresRebind': True}

    async def read(self, name, args=None):
        args = {} if args is None else args
        self.validate_read(name, args)
        started = time.perf_counter()
        if name in SNAPSHOT_TOOLS:
            self.epoch += 1  # Even failed/unknown reads invalidate earlier action grounding.
        reply = await self.invoke(name, args)
        data = reply.structuredContent
        content = [block.model_dump(mode='json', exclude_none=True) for block in reply.content]
        refused = reply.isError or isinstance(data, dict) and (data.get('refusal') or data.get('status') in ('refused', 'error'))
        gaps = []
        if refused:
            gaps.append({'code': 'driver_refused', 'detail': data})
            if isinstance(data, dict) and isinstance(data.get('refusal'), dict) and data['refusal'].get('code') == 'session_ended':
                self.epoch += 1
                self.targets.clear()
                gaps.append({'code': 'session_restart_required'})
        if not isinstance(data, dict):
            gaps.append({'code': 'structured_data_unavailable'})
        elif not refused:
            if name == 'get_browser_state':
                target = data.get('target_id')
                if target and isinstance(data.get('tabs'), list):
                    self.targets[target] = {t['tab_id'] for t in data['tabs'] if t.get('tab_id')}
                if data.get('snapshot', {}).get('complete') is False:
                    gaps.append({'code': 'partial_browser_snapshot', 'continuation': data['snapshot'].get('continuation')})
            if name == 'get_window_state':
                if args.get('include_accessibility_tree', True) and not data.get('elements'):
                    gaps.append({'code': 'no_structured_uia_elements'})
                if data.get('total_element_count', 0) > data.get('returned_element_count', 0):
                    gaps.append({'code': 'projected_uia_tree'})
                # A bounded UIA walk cannot prove exhaustive coverage even if counts agree.
                gaps.append({'code': 'uia_exhaustiveness_not_guaranteed'})
        return {'schemaVersion': 1, 'source': 'trycua', 'tool': name,
                'observedAt': datetime.now(timezone.utc).isoformat(), 'epoch': self.epoch,
                'elapsedMs': round((time.perf_counter() - started) * 1000),
                'ok': not bool(refused), 'data': data, 'content': content, 'gaps': gaps}


@asynccontextmanager
async def open_observer(driver, scope, label='win-cu-router'):
    async with stdio_client(StdioServerParameters(command=driver, args=['mcp', '--direct'])) as (r, w):
        async with ClientSession(r, w) as client:
            await client.initialize()
            schemas = {t.name: t.inputSchema for t in (await client.list_tools()).tools}
            yield CuaObserver(client, schemas, scope, label)
