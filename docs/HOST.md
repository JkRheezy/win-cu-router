# Codex host integration

Use the current Computer Use instructions supplied by the host. This project
does not grant additional permissions or override those instructions. Request
only the task scope needed; do not advertise blanket full-access mode as an
unconditional installation requirement.

1. Start the calculator bridge and keep it alive for the task.
2. In the host's persistent JavaScript runtime, initialize its documented `sky`
   interface, list windows and select exactly one returned Calculator window.
3. Capture a current official screenshot, inspect the actual target and retain
   the returned screenshot metadata. Do not manufacture a Window object.
4. Privately load `.local/bridge.json` and a key supplied by the user; never put
   a real key in code, a transcript or a committed configuration.
5. Import the project using its actual file URL and call the example:

```js
const {calculatorTask} = await import('file:///C:/path/to/win-cu-router/examples/calculator.mjs');
// bridgeConfig, apiKey, window and screenshot are prepared by the host.
const result = await calculatorTask({
  bridgeConfig, apiKey, sky, window, screenshot,
  expression: '8*9', backend: 'sky',
});
nodeRepl.write(JSON.stringify(result));
```

The trycua executor can be selected with `backend: 'trycua'`; it does not need
the sky arguments. The example only supports single-digit multiplication and
addition on the tested Chinese Calculator. It stops when the result is already
displayed, to avoid reporting an old result as new work.

`handoff` is an intended outcome. The host may inspect the returned checkpoint,
provide a scoped stage through a `planner` callback, and retain the original
goal verifier. A real GPT API client is not included: Codex already provides a
host reasoning model, while another host can supply its own planner.

With no planner, the project returns control to the calling agent. It does not
silently open another account, charge another API, create a task or change a
model setting. Returned planning text is not executable code.

No code here launches, locates, patches, proxies the private protocol of, or
redistributes the official CU helper. The official adapter is optional and
requires an authorized host that already exposes the documented methods.

For other applications, reuse the shared CuaObservation interface documented
in OBSERVATION.md. Add a task-specific semantic projection, scoped action
policy and meaningful verifier instead of another UIA/DOM reader. Automatic
canvas/game perception is not included.
