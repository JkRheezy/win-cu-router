# 项目开发工作流

目标：在产出代码和文档的同时，留下下一步能使用的验收、验证和审查记录。流程参考 Anthropic 的 [The AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)（Louis Claxton，2026-08-21），采用其以阶段产物衔接工作的思路；这里是针对 Codex 与本小型项目的独立适配，没有安装 Claude 工作流或照搬企业审批步骤。

## 一次改动如何闭环

```text
意图与验收 → 方案和范围 → 实现 → 运行检查 → 审查实际变更
                              ↑                 │
                              └── 具体失败与修复 ┘
检查、审查与权限均满足 → 本地提交 → 获授权后推送 / PR / 合并
后续实测发现 → 更新下一次任务记录
```

可发布的变更由 `.github/sdlc.json` 指向 `docs/changes/<任务>/` 中的三个产物：`intent.json`（目标、验收和边界）、`plan.json`（基线提交、允许路径和检查）、`review.json`（逐项证据、发现与审查结论）。工作日志可以保持简短，不强制照搬六个阶段的文件名。已经获得的用户授权不因进入新阶段而重复询问。

审查后运行 `npm run review:fingerprint`，将结果写入 review 的 `sourceFingerprint`。检查覆盖全部公开源文件，统一 CRLF/LF；仅排除当前 review 文件，避免自哈希递归。CI 另行记录包含 review 的完整指纹。源码变化、范围扩大、验收证据缺失或未解决发现会让检查失败。记录不是数字签名，不能证明审查者诚实；语义审查仍由维护者或宿主负责。

## 截图中的五个入口如何使用

| 入口 | 本项目配置 | 实际作用与状态 |
|---|---|---|
| Hooks | `.codex/hooks.json`、`scripts/codex-hook.mjs` | 开始时载入项目约定；结束时发现本次变更缺少匹配验证记录，可请求至多一次补验。脚本手工测试与宿主自动触发是两种验证 |
| 连接 | GitHub 插件与 GitHub CLI | 插件读取项目、Issue 和 PR；CLI 完成仓库创建、Git 推送与工作流触发。使用者应在自己的环境授权，无 token 入库 |
| Git | `.githooks/pre-commit`、本仓库 `core.hooksPath` | 提交前核对暂存区文件清单和明显凭据；不修改用户全局 Git 配置 |
| 环境 | `.codex/environments/environment.toml`、`scripts/setup-local.mjs` | 准备虚拟环境，提供 Verify / Offline demo / Check docs 命令。文件语法与命令可本地验证；应用内识别及选择状态需另行确认 |
| Worktrees | 已提交的 Git 基线与本地环境脚本 | 隔离代码/文档开发或独立验证；不是让多个任务同时控制同一桌面。原始记录、密钥和浏览器资料不自动复制 |

Codex 官方说明：[Hooks](https://learn.chatgpt.com/docs/hooks)、[本地环境](https://learn.chatgpt.com/docs/environments/local-environment)、[Worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)。应用配置和版本可能变化，文件存在不代表所有 UI 状态已激活。

## 运行检查与反馈

```powershell
npm run setup:local   # 安装开发依赖，不装 driver、不复制 key、不启动桌面操作
npm run verify        # JS + Python + 文档 + 源码扫描 + 隔离包复验 + 验收/审查检查
npm run verify:docs   # 纯文档改动；不能为未验证的代码补发通过证明
npm run check:hooks   # 只读检查当前项目的 Hook 加载、启用与信任状态
```

验证脚本记录源码指纹、执行前后是否变化、各检查退出码、时间以及是否覆盖代码测试，保存在 `.local/workflow/verification.json`。修改源码后，旧指纹不再对应新状态。原始命令输出保存在同目录，不自动公开。

隔离包检查先按白名单生成 ZIP，再在新临时目录解压，核对路径和文件集合，运行 mock demo、JS/Python 测试及文档检查。它验证用户拿到的源码包可执行离线例子，不证明真实 driver 或任意 App 可用。纯文档快速检查不会执行整套包复验；PR 和发布均运行完整验证。

Hooks 不逐个工具调用重跑整套测试，不发模型请求，不安装依赖，不上传代码，也不代替代码审查。Stop 最多发起一次补验续轮；若仍未验证，报告限制而不是无限循环。明确暂停/停止应优先执行；无法识别的特殊停止表述仍由宿主遵守，hook 不是完整的意图识别系统。

`REVIEW.md` 定义宿主审查重点：正确性、动作范围、证据、来源与发布内容。当前没有独立模型自动审查服务；如果只做了宿主自查，记录必须如此标明。

## Hooks 的启用

在项目根目录使用 Codex，项目级配置才会进入相应加载范围。新的 hook 定义需要用户审阅并信任，Codex 才会执行；修改定义后可能需要重新审阅。这是平台的 [hook 信任机制](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks)，不是本项目另加的审批流程。

本项目只写配置和测试脚本，不编辑 Codex 的信任记录。用户可在截图中的“钩子”入口检查两个事件，或在项目里的 Codex CLI 使用 `/hooks`。信任前，手动 `npm run verify` 与 Git 提交检查仍可使用。当前任务如果从项目外的工作目录启动，也不能据此声称项目 hook 已自动触发。

2026-09-21 后续核验：用户已在应用中信任两个定义，按应用保存的项目路径查询，`SessionStart`、`Stop` 均为 enabled/trusted，加载错误为空。新的[启用证据](evidence/hooks-activation-2026-09-21.json)补充此前“尚未启用”的历史记录；状态查询证明执行条件满足，不等于自动触发过。

Windows Junction 或其他目录别名需要保留应用添加项目时的路径。本机将该路径转换成实际目录后，同一批定义的信任状态发生变化。检查时不要先 realpath/resolve 磁盘链接，也不要自动复制另一条路径的信任记录。可以明确指定：`npm run check:hooks -- --cwd <应用添加项目时的路径>`。该命令不发起模型回合、不运行 Hooks、不改变信任。

## GitHub 与发布

`.github/workflows/test.yml` 在 push、PR 或手动触发时运行无 key 的完整检查；权限只读，只上传验证摘要。项目主分支要求 PR 与 `offline` 检查，维护者在检查完成后合并。自己编写并审查的改动记录为 `host_self_review`，不会伪造自己的 GitHub approve。规则可以由仓库管理员修改，不能宣传成不可绕过的安全沙箱。

`release.yml` 需显式触发并给出与 package.json 一致的 `v版本号`。它只接受 main，要求 `test.yml` 曾以 push 事件验证同一 SHA，重新运行完整检查并测试待发布 ZIP，然后复查主分支。GitHub prerelease 上传源码包与 SHA256；上传后重新下载，核对摘要，再从下载包运行隔离检查。下载复验失败会使 release 工作流失败并回流问题；已经上传的版本保留供排查，不声称平台自动回滚。

Actions 固定到公开上游提交；Python 直接依赖固定版本，间接依赖尚未锁定。本项目不需要另一个付费模型 API 来跑 CI。开发的机器验收、审查模式、远程 CI、合并、版本下载复验分别有自己的证据，不从某一环成功推断其他环。

## 维护如何回到下一次改动

`maintenance.yml` 把本仓库 CI/发布失败变成带来源 run 和 commit 的 `maintenance` Issue；同一工作流与提交重复失败会复用原 issue，保留首次记录并更新最新运行链接。已关闭的同源问题遇到真实失败会重新打开；演练更新证据但不重新打开已关闭的问题。Issue 的 opened/edited/reopened 事件产生 JSON intake artifact，供下一轮读取。首次配置仓库需创建 `maintenance` label。

失败处理器执行默认分支上的代码，不执行失败 PR 的代码，也不把外部 Issue 正文拼进 shell。它在创建 Issue 的同一工作流写出 intake，避免依赖 GITHUB_TOKEN 创建事件再次触发 Actions 的假设。[GitHub 的事件规则](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)是这一安排的依据。

维护者下载 intake、分诊并选定验收和范围 → 新 intent/plan → 修改或补充证据 → 审查与 CI → PR 合并关闭 Issue。这是有维护者参与的闭环；尚未接入全天候自动修复、自动模型审查或自动扩大授权。手动触发 maintenance 会生成明确标注的流程演练 issue；重复触发用于检验去重，不伪造产品故障。

首次使用 Worktree 要有 Git 提交。新检出运行环境脚本，再执行 `npm run verify`；CU 的实时验收回到明确选定的本机窗口执行。不要把有界单机结果宣传成所有 worktree、机器和应用均已验证。

## 回退

取消本项目 Git 钩子可运行 `git config --local --unset core.hooksPath`。项目生命周期 Hooks 可在 Codex 的 hook 管理界面停用；移除环境文件不会删除源码或用户数据。不要更改全局权限以让本项目流程通过。

初始配置记录见 [docs-workflow 历史任务](changes/2026-09-21-docs-workflow.md)，首次远程发布的机器产物见 [发布意图](changes/sdlc-publication/intent.json)与[计划](changes/sdlc-publication/plan.json)。后续回流任务保留其 Issue、PR、Actions 和 Release 链接，作为实际远程执行证据。

首轮真实回流发现去重后缺少后续运行链接，形成了[维护任务](changes/maintenance-roundtrip/intent.json)。该任务的[公开远程证据](evidence/github-workflow-2026-09-21.json)记录首个 PR、主分支验证与两次诊断演练；发布是否成功仍看对应版本的 release 工作流及下载复验结果。

Git 提交检查已在维护者本机启用，Codex 两项 Hooks 已在用户配置的项目路径下受信任。应用内环境选择和自动 Hook 事件触发实录仍未验证；云端闭环依靠 PR、CI、发布和维护工作流，不依赖尚未留证的桌面自动事件。
