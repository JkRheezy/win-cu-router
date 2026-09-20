# 贡献归属与设计来源

记录日期：2026-09-21。本文说明谁提供了什么、本项目如何使用，以及由此得到的启发。**本项目是基于既有成果的适配与编排实验，不主张拥有模型、驱动、UIA、DOM/AX 或观察—决策—执行思路的原创贡献。**

## 直接依赖与基础能力

| 来源 | 贡献 | 本项目如何使用 | 不应归入本项目的成果 |
|---|---|---|---|
| [TypeSafe / Jev](https://docs.typesafe.ai/introduction) | 提供可调用的模型和结构化判断 API | `src/router.mjs` 发出 Choice 请求，读取动作选择与置信信息 | 模型训练、推理能力、模型自身的时延与精度 |
| [trycua / Cua AI 与贡献者](https://github.com/trycua/cua) | 提供跨平台 driver、Windows UIA 读取、浏览器语义状态、截图、输入与状态核验接口 | 通过另行安装的 driver 和 MCP 调用这些接口 | UIA/DOM/AX 获取、截图与底层执行引擎；本项目没有重新实现它们 |
| OpenAI Codex 与 Computer Use 插件维护者 | 宿主推理环境和官方电脑操作运行时 | 接收宿主提供的 `sky` 对象；宿主在部分实验中处理接管 | 官方运行时、GPT 能力与其底层输入实现；没有官方合作或授权移植关系 |
| Windows UI Automation、应用的无障碍实现、Chromium | 产生可访问控件、页面语义和浏览器协议能力 | 经 trycua 或宿主接口间接使用 | 不是所有控件信息都来自本项目或单一第三方库；应用自身的可访问性直接影响效果 |
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)、[jsonschema](https://github.com/python-jsonschema/jsonschema) | 通信客户端与 schema 验证 | 作为独立安装的 Python 依赖使用 | 本项目不把协议、SDK 或验证算法当作新发明 |

上述名称用于准确归属和兼容性说明。组件许可证与运行时分发边界见[外部组件说明](THIRD_PARTY_NOTICES.md)。

## 设计启发与此前实验

| 来源 | 对本项目的启发 | 采用方式与差异 | 固定来源 |
|---|---|---|---|
| Sac-Y / Jev-cu | 从界面文字候选中让 Jev 选择下一步；由已有 CU 工具读取和执行；使用本地策略与持续循环 | 本项目沿用这种分工，在 Windows 上加入 trycua 观察封装、独立的执行适配与接管契约；不声称首先提出 Jev + CU 组合 | [README，38fb31d](https://github.com/Sac-Y/Jev-cu/blob/38fb31de7dfe6209bbe6e04057c00c6e885ba577/README.md) |
| Browser Use / Jev Ultrafast | 按观察生成候选动作、减少简单决策对截图的依赖、把选择与文字生成分工，并用独立结果核验约束演示 | 本项目前期部署和修改过该独立项目用于试验；本仓库并未纳入它的源码文件。当前网页例子仍使用预先指定字段文字，不能认领其动态文字生成或通用动作空间的完成度 | [README，1231850](https://github.com/browser-use/jev-ultrafast/blob/1231850a0bf1a0c0341fe408ef1668dbbfdfac46/README.md) |
| Browser Use / Browser Harness | 前期 Ultrafast 试验使用的浏览器连接基础设施 | 是前期试验的间接依赖；当前 win-cu-router 网页路径通过 trycua，不宣称实现 Browser Harness | [Ultrafast 的 Browser Harness 说明](https://github.com/browser-use/jev-ultrafast/blob/1231850a0bf1a0c0341fe408ef1668dbbfdfac46/README.md) |
| trycua 的工具契约与源码 | 准确窗口/标签绑定、结构化语义、引用失效、会话生命周期和确定性核验 | 读取已安装 driver 的工具 schema，并在排查闲置问题时查阅 session 实现；本项目只封装这些能力和处理缺失/失败 | [研究时源码快照，9bbfa7d](https://github.com/trycua/cua/tree/9bbfa7dd3e27ca7f1861ede70aaca390174493f9)；实际运行 driver 版本 0.28.2 |

上游源码快照与实际 driver 制品版本分别记录，不假定某次仓库提交就是该二进制的构建来源。上游的飞行查询演示、其他平台游戏案例和历史原型计时不计入本项目成果。

名称也应区分：`Jev-cu` 是 Sac-Y 的项目；`jev-use` 是该上游仓库里的技能目录；`Jev Ultrafast` 是 Browser Use 的另一个项目；`trycua` 是提供驱动等基础设施的项目；`win-cu-router` 是本适配实验。它们不是一个项目的不同官方版本。

## 本仓库编写的部分

| 文件 | 本项目新增的工程工作 | 依赖前提 |
|---|---|---|
| `src/router.mjs` | 把有限动作、刷新、完成核验和接管放入一次 Choice 请求；解析响应并执行置信阈值策略 | TypeSafe 提供判断能力 |
| `src/runner.mjs` | 组织循环、checkpoint、阶段目标、状态变化检查和独立 verifier；拒绝重放结果不明的输入 | 观察和执行接口由宿主或适配器提供 |
| `src/adapters/sky.mjs` | 把经检查的 UIA 矩形映射到宿主截图坐标，并检查窗口变化 | 坐标、窗口状态与真实输入能力来自上游 |
| `python/cua_observer.py`、`python/observation_bridge.py`、`src/adapters/cua-observer.mjs` | 常驻连接、统一数据封装、读取范围、能力表、引用版本、会话续期与显式恢复入口 | 不重写 trycua 的 UIA/浏览器/截图底层实现 |
| `python/calc_bridge.py`、`python/browser_task.py`、`python/browser_bridge.py` | 中文计算器与有限网页任务的候选动作和语义视图适配 | 只覆盖当前例子的动作类型与核验条件 |
| `examples`、`test`、`scripts`、`skills`、`docs` | 使用例子、协议测试、本机安装和源码打包，以及事实、来源和局限记录 | 测试通过不意味着通用电脑操作通过 |

上述代码由维护者借助 AI 编写。研发中阅读过上游代码和文档，不能称为严格的 clean-room 实现，也不能把“本仓库编写”扩张成“这些设计首次出现”。当前源码包未包含上游项目源码文件或供应商二进制；这一发布清单说明不等于形式化代码相似性审计或不侵权保证。

开发工作流另外参考 [Anthropic 的 AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)，采用阶段产物与维护反馈思路。通用宿主检查和 Hook 工具已提到独立本机目录；本仓库保留自己的计划、审查与证据、可选接入配置和 GitHub 运维。生命周期方法、GitHub CI/Issue/Release 能力及 Codex Hooks 由各自来源提供，没有 Anthropic 联名或官方集成。Actions 使用的 checkout、setup-node、setup-python、github-script、upload-artifact 来自 GitHub 的 actions 组织，运行时另行获取，不打包其源码。

## 如何维护这份记录

引入依赖、改写上游实现、复制片段或移植文档时，应记录项目、作者或组织、文件、版本/提交、修改范围及许可通知。直接使用、改写和仅受启发必须分别写明，致谢不能代替许可证义务。

如果发现归属遗漏或描述过度，欢迎提供可定位的来源并修正。本次已补记此前文档遗漏的 Jev Ultrafast / Browser Use 和 Browser Harness 关系。文档结构参考项目另列于[文档写作参考](docs/DOCUMENTATION_REFERENCES.md)，不把它们误列为本项目技术依赖。
