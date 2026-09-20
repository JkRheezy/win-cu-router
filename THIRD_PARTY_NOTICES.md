# External components and acknowledgements

These are separately installed or remotely accessed. No third-party source or
binary distribution is included in the repository archive.

| Component | Relationship and notice |
|---|---|
| [trycua/cua](https://github.com/trycua/cua/blob/main/LICENSE.md) | External Windows observer/executor used by the current examples. Root repository declares MIT, copyright 2025 Cua AI, Inc. Tested driver: 0.28.2. If redistributed later, include the applicable license and dependency notices for those actual artifacts. |
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) | External Python dependency, pinned to 1.30.0 for the example. Its own license governs it; `pip` downloads it separately. |
| jsonschema | External Python dependency, pinned to 4.26.0 for runtime validation of the installed driver's observation schemas. Installed separately; its own license applies. |
| [TypeSafe](https://docs.typesafe.ai/legal) | Remote Jev API. Users supply their own credentials and accept applicable service terms. No weights or SDK code included. |
| [OpenAI](https://openai.com/policies/service-terms/) | Optional host-provided Computer Use runtime. No redistribution license is asserted. The adapter accepts an existing `sky` object from an authorized Codex host. |
| [Sac-Y/Jev-cu](https://github.com/Sac-Y/Jev-cu) | Architectural inspiration. No source copied; see PROVENANCE.md. |
| [Browser Use / Jev Ultrafast](https://github.com/browser-use/jev-ultrafast) | Design inspiration and a separately installed earlier evaluation project. Its dynamic browser policy, text-generation features and benchmark results are not this project's achievements. |
| [Browser Harness](https://github.com/browser-use/browser-harness) | Used indirectly by the earlier Ultrafast evaluation. Not a dependency of the current trycua browser path. |
| [Anthropic / AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) | Workflow design reference, adapted for this repository and Codex. No Anthropic integration, endorsement or copied playbook content is bundled. |

Node.js and Python are user-installed runtimes governed by their respective
licenses. They are not bundled. Product names identify compatibility and
research references only. This project is not endorsed by, affiliated with, or
an official Windows release of any of the organizations above.
