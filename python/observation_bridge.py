"""Authenticated loopback observation service; optional separately scoped task."""
import argparse
import asyncio
from contextlib import suppress
import hmac
import json
from pathlib import Path
import secrets
from cua_observer import open_observer


async def serve(observer, config_path, task=None):
    config = Path(config_path).resolve()
    if config.exists():
        raise RuntimeError('Existing bridge config: stop the old service before removing it')
    credential, lock = secrets.token_urlsafe(32), asyncio.Lock()

    async def connection(reader, writer):
        status = 200
        try:
            header = (await asyncio.wait_for(reader.readuntil(b'\r\n\r\n'), 3)).decode('ascii').split('\r\n')
            method, path, _ = header[0].split(' ')
            headers = {k.lower(): v.strip() for k, v in (line.split(':', 1) for line in header[1:] if ':' in line)}
            if not hmac.compare_digest(headers.get('authorization', ''), 'Bearer ' + credential):
                raise ValueError('Unauthorized')
            if 'transfer-encoding' in headers:
                raise ValueError('Transfer encoding unsupported')
            size = int(headers.get('content-length', '0'))
            if not 0 <= size <= 65536:
                raise ValueError('Invalid payload size')
            body = json.loads(await asyncio.wait_for(reader.readexactly(size), 3)) if size else {}
            if not isinstance(body, dict):
                raise ValueError('Object body required')
            # Browser refs and UIA tokens are scoped to this serialized MCP transport.
            async with lock:
                if method == 'GET' and path == '/capabilities':
                    out = observer.capabilities()
                elif method == 'POST' and path == '/observe' and set(body) <= {'tool', 'args'}:
                    out = await observer.read(body['tool'], body.get('args', {}))
                elif method == 'POST' and path == '/restart-session' and not body:
                    out = await observer.restart_session()
                    if task:
                        task.cache.clear()
                        if hasattr(task, 'rebind'):
                            try:
                                await task.rebind()
                                out.update(task.connection_info, taskReady=True)
                            except RuntimeError as error:
                                out.update(taskReady=False, reason=str(error))
                elif task and method == 'GET' and path == '/snapshot':
                    out = await task.snapshot()
                elif task and method == 'POST' and path == '/act':
                    out = await task.execute(body)
                else:
                    raise ValueError('Unsupported endpoint')
        except Exception as error:
            status, out = 400, {'error': type(error).__name__ + ': ' + str(error)[:500]}
        payload = json.dumps(out, ensure_ascii=False).encode()
        writer.write(f'HTTP/1.1 {status} Result\r\nContent-Type: application/json\r\nContent-Length: {len(payload)}\r\nConnection: close\r\n\r\n'.encode() + payload)
        try:
            await writer.drain()
        except ConnectionError:
            pass
        finally:
            writer.close()
            await writer.wait_closed()

    server = await asyncio.start_server(connection, '127.0.0.1', 0, limit=8192)
    port = server.sockets[0].getsockname()[1]
    config.parent.mkdir(parents=True, exist_ok=True)
    config.write_text(json.dumps({'url': f'http://127.0.0.1:{port}', 'token': credential,
                                 **(task.connection_info if task else {})}), encoding='utf8')
    print(json.dumps({'ready': True, 'port': port, 'observationTools': len(observer.capabilities()['tools'])}), flush=True)
    async def maintain_session():
        # A bridge owns a live working session. Renew using screen-size metadata
        # without capturing content, rebuilding UIA refs, or replaying inputs.
        # The driver otherwise expires idle sessions and closes owned browsers.
        while True:
            await asyncio.sleep(30)
            async with lock:
                try:
                    result = await observer.read('get_screen_size')
                    if not result['ok']:
                        return  # Explicit host restart is required after expiry.
                except Exception:
                    return
    heartbeat = asyncio.create_task(maintain_session())
    try:
        async with server:
            await server.serve_forever()
    finally:
        heartbeat.cancel()
        with suppress(asyncio.CancelledError):
            await heartbeat
        config.unlink(missing_ok=True)


async def main(args):
    scope = json.loads(Path(args.scope).read_text(encoding='utf-8-sig'))
    async with open_observer(args.driver, scope) as observer:
        await serve(observer, args.config)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--driver', required=True)
    parser.add_argument('--scope', required=True, help='JSON with explicit windows and optional observation scopes')
    parser.add_argument('--config', default='.local/observer.json')
    try:
        asyncio.run(main(parser.parse_args()))
    except KeyboardInterrupt:
        pass
