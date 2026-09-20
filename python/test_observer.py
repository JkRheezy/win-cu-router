import unittest
from types import SimpleNamespace
from cua_observer import CuaObserver, ObservationDenied
from browser_task import BrowserTask


def schema(*names):
    return {'type': 'object', 'properties': {n: {} for n in names}, 'additionalProperties': True}


class FakeClient:
    def __init__(self):
        self.calls = []
        self.data = {'elements': []}
        self.error = False

    async def call_tool(self, name, args):
        self.calls.append((name, args))
        return SimpleNamespace(structuredContent=self.data, content=[], isError=self.error)


class ObservationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.client = FakeClient()
        self.schemas = {
            'get_window_state': schema('pid', 'window_id', 'include_screenshot', 'session', 'screenshot_out_file'),
            'get_browser_state': schema('pid', 'window_id', 'target_id', 'tab_id', 'snapshot_format', 'continuation', 'query', 'scope_ref', 'session'),
            'browser_dialog': schema('target_id', 'tab_id', 'action', 'prompt_text', 'session'),
            'clipboard_read': schema('include_text', 'session'),
            'get_desktop_state': schema('session'),
            'start_session': schema('session'),
        }
        self.o = CuaObserver(self.client, self.schemas, {'windows': [{'pid': 1, 'window_id': 2}]})

    async def test_mutations_paths_sessions_and_unknown_arguments_blocked(self):
        for name, args in [('click', {}), ('page', {'action': 'execute_javascript'}),
                           ('get_window_state', {'pid': 1, 'window_id': 2, 'screenshot_out_file': 'some-file'}),
                           ('get_window_state', {'pid': 1, 'window_id': 2, 'session': 'another'}),
                           ('get_browser_state', {'pid': 1, 'window_id': 2, 'javascript': 'anything'})]:
            with self.assertRaises(ObservationDenied):
                await self.o.read(name, args)
        self.assertEqual(self.client.calls, [])

    async def test_exact_window_and_optional_scopes(self):
        for name, args in [('get_window_state', {'pid': 1, 'window_id': 3}),
                           ('get_desktop_state', {}), ('clipboard_read', {'include_text': True})]:
            with self.assertRaises(ObservationDenied):
                await self.o.read(name, args)
        result = await self.o.read('get_window_state', {'pid': 1, 'window_id': 2})
        self.assertTrue(result['ok'])
        self.assertIn('no_structured_uia_elements', [g['code'] for g in result['gaps']])

    async def test_browser_binding_pagination_and_inspect_only(self):
        target = {'target_id': 'owned', 'tab_id': 'tab'}
        with self.assertRaises(ObservationDenied):
            await self.o.read('get_browser_state', target)
        self.client.data = {'target_id': 'owned', 'tabs': [{'tab_id': 'tab'}]}
        await self.o.read('get_browser_state', {'pid': 1, 'window_id': 2})
        self.client.data = {'refs': [{'ref': 'p1:2'}], 'snapshot': {'complete': False, 'continuation': 'opaque'}}
        result = await self.o.read('get_browser_state', {**target, 'continuation': 'previous'})
        self.assertEqual(result['data']['snapshot']['continuation'], 'opaque')
        self.assertEqual(result['gaps'][0]['code'], 'partial_browser_snapshot')
        self.assertEqual(self.client.calls[-1][1]['session'], 'win-cu-router')
        for action in ('accept', 'dismiss'):
            with self.assertRaises(ObservationDenied):
                await self.o.read('browser_dialog', {**target, 'action': action})

    async def test_refusal_preserved_and_invalidates_grounding(self):
        self.client.data = {'status': 'refused', 'refusal': {'code': 'browser_requires_setup'}}
        result = await self.o.read('get_browser_state', {'pid': 1, 'window_id': 2})
        self.assertFalse(result['ok'])
        self.assertEqual(result['data']['refusal']['code'], 'browser_requires_setup')
        self.assertEqual(self.o.epoch, 1)

    async def test_read_invalidates_pending_task_action(self):
        task = BrowserTask(self.o, {'url': 'https://example.org/', 'allowedOrigins': ['https://example.org']})
        task.cache = {'revision': 'r', 'epoch': 0, 'bindings': {'a': {'mode': 'click', 'ref': 'old'}}}
        await self.o.read('get_window_state', {'pid': 1, 'window_id': 2})
        with self.assertRaises(ValueError):
            await task.execute({'revision': 'r', 'actionId': 'a'})
        self.assertEqual(len(self.client.calls), 1)

    async def test_missing_driver_tool_reported_not_fabricated(self):
        zoom = next(t for t in self.o.capabilities()['tools'] if t['tool'] == 'zoom')
        self.assertFalse(zoom['available'])
        self.assertEqual(zoom['reason'], 'not_in_installed_driver')

    async def test_expired_session_requires_explicit_restart_and_rebind(self):
        self.o.targets = {'old-target': {'old-tab'}}
        self.client.data = {'status': 'refused', 'refusal': {'code': 'session_ended'}}
        result = await self.o.read('get_window_state', {'pid': 1, 'window_id': 2})
        self.assertIn('session_restart_required', [g['code'] for g in result['gaps']])
        self.assertEqual(self.o.targets, {})
        self.assertEqual(len(self.client.calls), 1)  # No implicit lifecycle mutation.
        self.client.data = {'status': 'ok'}
        restarted = await self.o.restart_session()
        self.assertTrue(restarted['requiresRebind'])
        with self.assertRaises(ObservationDenied):
            await self.o.read('get_browser_state', {'target_id': 'old-target', 'tab_id': 'old-tab'})


if __name__ == '__main__':
    unittest.main()
