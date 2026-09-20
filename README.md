# win-cu-router

**面向 Windows 的 Jev 决策与 Computer Use 适配实验。** 让 Jev 在已观察到的候选动作中选择下一步，必要时交回宿主推理模型，再由执行器操作、由代码检查结果。

本项目站在现有项目与平台能力之上：[Jev-cu](https://github.com/Sac-Y/Jev-cu) 提供了直接的设计启发，[Jev Ultrafast](https://github.com/browser-use/jev-ultrafast) 启发了结构化网页决策与执行后核验；当前观察和部分执行依靠 [trycua](https://github.com/trycua/cua)，模型能力来自 TypeSafe Jev，可选的官方执行能力来自用户已有的 Codex Computer Use 插件。**本项目的工作是适配与编排，不是发明这些模型、观察技术或执行引擎。**

状态：`0.1.0-alpha.2` · Windows 本机实验 · 已准备源码，尚未发布 GitHub 仓库。项目没有上述供应方的官方合作或背书。

[背景与取舍](docs/BACKGROUND.md) · [观察接口](docs/OBSERVATION.md) · [宿主接入](docs/HOST.md) · [实测与证据](docs/VALIDATION.md) · [贡献与来源](PROVENANCE.md) · [开发工作流](docs/WORKFLOW.md)

## 为什么做这个项目

最初的问题是：在 Windows 上，能否沿用 Jev-cu 的分工，让简单的界面选择使用 Jev，把复杂规划和视觉判断留给宿主，同时保留可选择的执行器？

实践中发现，比较速度前必须控制观察方式、模型请求、执行器和核验范围。频繁回到主模型、逐步启动进程、反复截图带来的开销，不能直接归咎于某个执行插件。因此，本项目把这些环节拆开，并接入 trycua 已提供的 UIA、浏览器语义状态和截图能力，用有限任务验证这种组合是否有用。详细论据与推断边界见[背景说明](docs/BACKGROUND.md)。

## 当前能做什么

| 用途 | 当前状态 | 从哪里开始 |
|---|---|---|
| 读取选定窗口的 UIA、浏览器状态和截图 | 统一接口已实现；计算器、记事本、浏览器代表性读取通过 | [观察层](docs/OBSERVATION.md) |
| 用 Jev 操作计算器 | 已验证有限算式；支持 trycua 或宿主提供的官方点击执行器 | [宿主接入](docs/HOST.md) |
| 用 Jev 填写网页字段 | 已验证固定文字的搜索框输入与读回核验 | [网页例子](docs/OBSERVATION.md#网页任务) |
| 在不确定时交回宿主 | 已实现 checkpoint 和阶段目标回调；实测发生过接管 | [验证记录](docs/VALIDATION.md) |
| 任意网站、Office、文件选择器的完整工作流 | 尚未验收，不作为现成功能提供 | [边界](docs/BACKGROUND.md#适用边界) |

适合愿意为任务配置候选动作、提供完成条件并检查实测记录的开发者。目前还不适合把任意办公任务直接交给它无人值守完成。

## 特点与代价

| 特点 | 依据 | 代价或限制 |
|---|---|---|
| 复用结构化观察，减少简单步骤对截图解释的依赖 | 本机 UIA 读取样本约 0.15–0.17 秒 | 速度主要依赖 trycua 与应用提供的结构；读取快不等于任务快 |
| Jev 选择动作，也可请求接管 | 搜索框输入自主通过；导航任务真实发生接管 | 默认置信阈值偏保守，简单任务也可能需要宿主 |
| 观察、策略与执行分开 | 同一 UIA 观察可供不同执行适配器使用 | 官方执行器当前只验证了校准后的计算器点击；网页例子使用 trycua |
| 保留失败、覆盖不足和核验信息 | 有失败样本、分页标记、过期引用保护与结果读回 | 增加观察开销；不是可靠性证明，也不能恢复已丢失的表单 |

这些是当前实现的取舍，不是相对其他项目的全面领先结论。尚无足够的同任务、多次重复、跨应用数据证明普遍提速、降低费用或提高成功率。

## 快速开始

### 只检查协议，不操作电脑

将源码解压到本地，进入项目目录。需要 Node.js 20.6+：

```sh
npm test
npm run demo
```

`demo` 使用模拟路由器和规划器，不需要 key，也不是实际模型效果演示。

### 试用真实窗口或网页

需要 Windows、Python 3.11+、另行安装的 `cua-driver.exe`（本机验证 0.28.2）。调用 Jev 还需要用户自己的 TypeSafe key；使用官方执行器还需要宿主已有且获授权使用的 Computer Use 插件。

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r python/requirements.txt
```

先选一个入口：

- **只读窗口**：按[观察层说明](docs/OBSERVATION.md#启动只读服务)配置准确的窗口范围。
- **网页输入**：按[网页任务例子](docs/OBSERVATION.md#网页任务)启动隔离浏览器并填写搜索框。
- **计算器**：打开一个中文 Windows 计算器，然后启动桥接服务，按[宿主说明](docs/HOST.md)运行例子。

```powershell
.\.venv\Scripts\python.exe python/calc_bridge.py --driver 'C:\path\to\cua-driver.exe'
```

连接配置保存在私有 `.local` 目录。真实模型调用使用自己的 API 额度。截图、密钥、原始记录和浏览器资料不进入发布包。安装本项目技能可运行 `node scripts/install-local.mjs`；它不会全局更换 Codex 的模型或插件。

## 如何工作

```text
trycua：UIA / 浏览器语义状态 / 截图 / 状态谓词
                         ↓
本项目：统一观察封装 → 任务文字视图与候选动作
                         ↓
TypeSafe Jev：选择动作 / 刷新 / 请求完成核验 / 请求接管
       ├─ 动作 → 本项目适配 → trycua 或宿主官方执行器
       │                            ↓
       └──────── 新观察与独立核验 ←──┘
       └─ 接管 → 宿主处理 checkpoint，决定是否继续
```

Jev 不接收本项目的原始截图。图像保留给支持视觉的宿主，但自动视觉理解和通用 GPT 规划调用尚未实现。`planner(checkpoint)` 当前只返回阶段目标，不能增加操作权限；没有 planner 时返回 `handoff`。

统一观察封装负责目标范围、数据格式、引用时效与会话管理。真正的 UIA 读取、DOM/AX 数据获取、截图及输入由上游工具或系统完成，详见[贡献归属表](PROVENANCE.md)。

## 已观察到的结果

以下为单机有限样本；计时不含安装、服务启动和人工检查。不同任务、版本和执行路径不能直接相除得到提速倍数。

| 样本 | 结果 | 记录 |
|---|---|---|
| alpha.1：Jev + 官方点击，`8×9=72` | 4 次动作，循环 3.615 秒 | E01 |
| alpha.2：Jev + trycua，`6+7=13` | 5 次动作，循环 11.762 秒 | E02 |
| alpha.2：网页搜索框填入 `asyncio`，不提交 | Jev 自主完成；1 次输入并核验，3.168 秒 | E03 |
| alpha.2：打开 Python Success Stories | Jev 请求接管；宿主完成，后续执行与核验片段 2.092 秒 | E04、E05 |

19 项离线测试曾通过；它们检查本项目协议与保护逻辑，不代表 19 个真实办公任务通过。可公开核对的[脱敏记录](docs/evidence/local-validation-2026-09-21.json)、失败样本、计时口径与复现入口见[验证文档](docs/VALIDATION.md)。

后续文档与工作流变更增加了验证时效与停止行为检查，当前本机及隔离 worktree 共通过 23 项离线测试。项目 Hooks、Git 检查、环境命令和 CI 文件的不同启用状态见[工作流验收](docs/changes/2026-09-21-docs-workflow.md)，不将手工测试称为已在 Codex 或 GitHub 自动运行。

Hooks 启用核验进一步补充了路径别名与信任状态检查，当前本机通过 26 项离线测试。用户配置的项目路径下两项 Hooks 已启用并受信任；可运行 `npm run check:hooks` 只读检查。[核验记录](docs/changes/2026-09-21-hooks-activation.md)

## 已知边界

- 接上观察接口不等于支持任意 App。当前仍需任务适配；网页字段文字由任务预先指定，尚不是自动生成任意文本的通用网页代理。
- UIA 缺失、Canvas、游戏、跨窗口及复杂动态页面可能需要视觉或专门接口；游戏已暂停验证。
- 已结束的驱动会话可能清理其隔离浏览器。续期可减少闲置失效；显式恢复不会重放输入，也不能找回丢失的页面状态。
- 本机 HTTP 桥的范围检查不是操作系统沙箱。拥有服务令牌或本机代码执行权的调用者仍需受到宿主权限约束。
- 没有成本基准、长期稳定性评测或通用优于官方 CU / trycua 的结论。

## 贡献、致谢与许可

感谢 Jev-cu、Jev Ultrafast / Browser Use、TypeSafe、trycua、OpenAI，以及 Windows UI Automation、Chromium、MCP 和依赖维护者提供的思路与基础能力。[PROVENANCE.md](PROVENANCE.md)逐项记录直接依赖、设计启发和本项目编写的部分；使用相近思路不代表本项目首先提出它。

新增适配代码采用 [MIT](LICENSE)。上游代码、服务、商标和官方运行时各自的权利不会由本项目许可证一并授予。参考[外部组件说明](THIRD_PARTY_NOTICES.md)与[既有许可审查](docs/LEGAL_REVIEW.md)。

欢迎按[贡献说明](CONTRIBUTING.md)补充可复现用例、修正事实与来源归属。发布前运行 `npm run check:release`；当前没有配置远程仓库，也没有声称 GitHub CI 已运行。
