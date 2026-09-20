# 开发与发布

本项目采用可追溯的开发闭环：意图/验收 → 计划 → 实现 → 审查与测试 → PR 合并 → 发布与下载复验 → Issue 回流。审查由维护者或宿主完成；自动检查不等于独立审查。项目运行时不依赖 SDLC 工具。

## 流程与产品的边界

[Anthropic 的 AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)建议阶段产物被版本化并供下一阶段使用；单个产品可在产品仓库存放 intent。它没有要求把通用流程引擎加入产品。因此本仓库只保留自己的意图/计划/审查记录、开发约定、测试及 GitHub 运维配置。通用宿主审查、源码指纹核对与 Hook 工具已提取到独立本机工具目录，不随本产品发布。

不强制采用固定“当前任务”配置，不要求贡献者安装维护者的工具，也不会因为缺少当前 review JSON 而阻止产品测试。历史任务记录描述当时的实现；本节说明当前边界。

## 普通开发

```powershell
npm run setup:local   # 准备 Python 依赖，不安装 driver 或 key
npm test             # CU 协议与适配层的 JS 测试
npm run demo         # 离线模拟，不操作桌面
npm run verify       # JS、Python、GitHub配置、文档、源码扫描、隔离包复验
npm run verify:docs  # 文档与源码扫描快速检查
```

产品测试在 `test/`、`python/test_*.py`。GitHub 发布和问题回流的回归测试放在 `.github/tests/`，与 CU 测试分开。`scripts/source-files.mjs` 是本项目源码清单与验证摘要工具，不读取开发意图或审查结论。

完整验证记录在私有 `.local/workflow/verification.json`，记录源码指纹、检查退出码和执行期间是否变化。发布 ZIP 只含源码，解压到隔离目录后再次运行 demo、测试和文档检查；它不验证真实 driver 或任意 App 的可靠性。

## 维护者的可选宿主工具

本机共用的 SDLC 工具接受项目路径和任务名参数，在外部检查 `docs/changes/<任务>/` 中的 intent、plan、review 与源码、检查摘要是否一致。它不进入 npm 依赖，也不被云端 CI 导入。其他维护者可以用自己的审查方法，保留能对应 PR 和提交的验收证据即可。

Codex 的 `.codex/hooks.json` 只是可选接入配置；`scripts/codex-hook.mjs` 通过私有 `.local/dev-workflow.json` 连接本机工具。未配置时返回空结果。当前受信任的 Hook 定义未改写，无需为本次拆分重新信任；自动生命周期事件仍未留证。普通下载包没有私有配置，验收已覆盖它不会启用维护者 Hook。

Git 提交扫描可通过 `git config --local core.hooksPath .githooks` 自选启用。环境配置提供本项目的安装和验证命令；Worktree 用于独立检出，不复制 key、驱动或浏览器资料。它们都不能替代真实 CU 的任务授权和验收。

## GitHub 配置

- `test.yml`：push/PR 运行无 API key 的离线检查，只上传验证摘要；主分支要求 PR 与 GitHub Actions 的 `offline` 检查，包括管理员。
- `release.yml`：显式触发；版本必须匹配 package.json，要求 main 同一提交已有成功的 push CI。重新验证、打包并复查 main，上传 prerelease 与 SHA256，再下载和测试发布包。下载复验失败会回流 Issue，已上传的版本保留供排查。
- `maintenance.yml`：CI/发布失败产生带运行链接的去重 Issue，同时写 intake；重复失败保留首次记录并更新最新运行，真实失败可重新打开已关闭的问题。手动演练有明确标记，不伪造产品事故。

维护者读取 intake、分诊、形成下一次计划，修复后以 PR 和 CI 关闭问题。没有后台模型自动修改产品代码，也没有声称独立人类批准。处理器只运行默认分支代码，不执行 Issue 正文；创建 Issue 时在同一工作流写 intake，不依赖 GITHUB_TOKEN 写事件再次触发工作流。[GitHub 事件规则](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)

Actions 固定上游提交；Python 直接依赖固定版本，间接依赖尚未锁定。仓库管理员仍可修改规则，以上流程不是操作系统安全沙箱。

首轮 [PR #1](https://github.com/JkRheezy/win-cu-router/pull/1) 已接通云端；真实诊断回流 [Issue #2](https://github.com/JkRheezy/win-cu-router/issues/2) 形成 [PR #3](https://github.com/JkRheezy/win-cu-router/pull/3) 并被合并关闭。原始[远程证据](evidence/github-workflow-2026-09-21.json)保持历史状态；本次[解耦意图](changes/decouple-workflow/intent.json)落实流程工具与产品分离。最终发布状态看对应 release 工作流的下载复验结果。
