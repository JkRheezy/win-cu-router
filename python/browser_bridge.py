"""Browser task entry point using the shared trycua observation service."""
import argparse
import asyncio
import json
from pathlib import Path
from cua_observer import open_observer
from observation_bridge import serve
from browser_task import BrowserTask


async def main(args):
    task_spec = json.loads(Path(args.task).read_text(encoding='utf-8-sig'))
    scope = json.loads(Path(args.scope).read_text(encoding='utf-8-sig')) if args.scope else {'windows': []}
    if Path(args.config).exists():
        raise RuntimeError('Stop old service and remove stale configuration first')
    async with open_observer(args.driver, scope) as observer:
        task = BrowserTask(observer, task_spec)
        await task.prepare()
        await serve(observer, args.config, task)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--driver', required=True)
    p.add_argument('--task', required=True)
    p.add_argument('--scope', help='Optional additional native-window observation scope')
    p.add_argument('--config', default='.local/browser.json')
    try:
        asyncio.run(main(p.parse_args()))
    except KeyboardInterrupt:
        pass
