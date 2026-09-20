# Validation status

Date: 2026-09-21. Alpha source, tested on one Windows machine with Chinese
Calculator, separately installed cua-driver 0.28.2 and the host's official CU.

## Public evidence and reproduction

[Sanitized excerpts E01–E09](evidence/local-validation-2026-09-21.json) were
selected from existing local logs, with original file names and SHA-256 hashes.
Raw logs remain private; hashes support traceability, not independent proof.
The historical runs do not have an immutable project commit recorded, so these
are maintainer-reported samples rather than release-specific benchmark certification.
No new desktop runs were made solely for the documentation rewrite.

To reproduce representative tasks, use [the Calculator host example](HOST.md)
and [the fixed-value browser input example](OBSERVATION.md#网页任务). Record every
attempt, model/driver versions, outcome verifier, handoffs and timing scope.
Use `npm run verify` for the current offline checks; those results are distinct
from the historical live samples below.

| Test | Result |
|---|---|
| Offline contract/protection suite (alpha.1) | 10 passing tests |
| Mock router -> host planner -> action -> verified completion | Passed; no live model call |
| First live UIA text format | One action, then uncertainty handoff; incomplete and retained |
| Normalized observer + live Jev + official sky, 8 × 9 | 4 decisions, 4 actions, 9 reads, verified 72, loop 3615ms |
| Live Jev + trycua, 7 + 5 without planner | Uncertainty handoff, 0 actions; not counted as success |
| Same task with host-provided stage plan | 1 real uncertainty handoff, then 4 Jev-selected actions; verified 12, loop 9554ms |

The host supplied that stage plan in advance for the bounded calculation. The
callback did not call a second GPT API. Automatic general-purpose GPT planning
and recovery have **not** been demonstrated. Automatic general app selection
and visual perception are not implemented. Alpha.2 adds generic observation
and bounded browser operations, as described below.

The first input format exposed raw UIA indexes in the summary. The observer was
changed to provide explicit expression/display facts and English descriptions
of the observed Chinese arithmetic controls. The confidence threshold was not
lowered to make the test pass. The default 0.65 remains provisional and may
cause conservative handoffs even on simple tasks.

Loop times exclude installation, service startup, window selection, calibration,
human inspection and final independent screenshot. A prior local prototype
had a larger matched-executor comparison; its numbers are not attributed to
this newly written router. No cross-app reliability or blanket speedup claim
is made.

Publication scan is heuristic: it checks the explicit text-file allowlist for
key patterns, developer home paths and bundled binaries. It does not prove
absence of every possible secret or third-party right. `.local` remains excluded.

## Alpha.2: shared observation layer

Fresh local tests on 2026-09-21, driver 0.28.2, persistent MCP connection. These
are individual samples, not percentile benchmarks. Times below include local
HTTP/JSON overhead, exclude bridge startup and human inspection.

| Test | Observed result | Time |
|---|---|---:|
| Calculator UIA without image | 80 elements | 168 ms |
| Notepad draft UIA without image | 36 elements; known test-file body present | 151 ms |
| Window screenshot | Image returned and visually inspected | 526 ms |
| Window zoom | Image returned | 297 ms |
| UIA predicate verification | Enabled equals button: satisfied, stable, one sample | 218 ms |
| Python.org semantic browser state + screenshot | 171 interactive refs, partial snapshot explicitly reported; image inspected | 242 ms |
| Browser continuation | 159 additional content refs, complete=true | 20 ms |
| Browser query | Two Success Stories refs | 161 ms |
| JS dialog inspection | Successful read | 65 ms |
| Main-screen metadata | Successful read | 10 ms |
| Bounded driver health metadata | Successful read | 21 ms |

The service exposes 21 audited read capabilities. Full-desktop capture,
clipboard access and process diagnostics are implemented but disabled in this
test scope; their positive paths were not tested. Out-of-scope window access,
desktop/clipboard reads and dialog acceptance were rejected in live HTTP tests.
Other discovery/lifecycle reads have not all been individually acceptance-tested.

Twelve JavaScript and seven Python offline tests passed, including window/tab
scope enforcement, mutation rejection, raw-data preservation, missing tools,
pagination pass-through, image-free model projection and action invalidation
after another snapshot. These tests use fake driver replies; they complement
the live reads above and do not establish driver correctness.

A later read after the navigation service had been idle returned session_ended.
The adapter now preserves that refusal and supports explicit host lifecycle
restart, invalidating old refs rather than replaying any action. A live recovery
test read 80 Calculator elements, ended its own driver session, observed the
expected refusal, restarted, and read 80 elements again. A separate browser
session-end test showed that the driver cleans up its owned isolated Chrome
process: exact-window rebind correctly refused with browser_binding_stale.
The bridge therefore reports taskReady=false rather than pretending to restore
that page or silently replaying its inputs.

While the service is alive it now renews the session every 30 seconds using only
get_screen_size metadata. A live probe confirmed idle_seconds changed from 2
to 0 and expires_in_seconds from 297 to 299 after that read. This verifies the
renewal mechanism; a multi-hour endurance run has not been performed.

## Alpha.2: actual task outcomes

| Task | Outcome |
|---|---|
| Calculator 6 + 7 through refactored shared observer | Live Jev, 5 decisions/actions, 11 reads, no handoff, verified expression and 13; 11762 ms |
| Fill Python.org searchbox with asyncio, without submitting | Live Jev, 2 decisions, 1 action, 4 reads, no handoff, observed field value matched; 3168 ms |
| Python.org Success Stories navigation | Jev requested handoff; Codex host selected the observed link, default trusted browser click and independent new URL/title verification passed; host execution/read segment 2092 ms |

The navigation number excludes preceding Jev attempts and host deliberation;
it is **not** a complete autonomous Jev task time. Initial attempts and failures
were kept in private local records. One navigation choice scored 0.63 and was
handed off at the unchanged 0.65 threshold. A host-provided stage goal also led
to another handoff. The host then explicitly chose the available navigation
action; this is not an automatic recovery feature in the runner.

An earlier browser bridge timed out while waiting for a page title to change
from about:blank even though semantic page content was already available.
Alpha.2 uses returned page structure for bounded readiness, retains raw title
metadata and may derive a display title from the root web area. Routing uses
stable page structure instead of animated code banners; full raw content is
still available to the host.

Representative observation and two bounded action types passed. Native text
editing, file selection, Office save workflows and arbitrary applications have
not passed complete acceptance tests. Games remain out of the current scope;
the earlier reviewed-game helper is experimental and unverified.
