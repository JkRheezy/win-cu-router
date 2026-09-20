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

每项实质改动在 `docs/changes/` 留一份简短记录即可，包含目标、验收、方案、证据、审查与遗留问题。小改动不强制拆成六份文件；已经获得的用户授权不因进入新阶段而重复询问。发布、外部写入和合并按实际授权处理。

## 截图中的五个入口如何使用

| 入口 | 本项目配置 | 实际作用与状态 |
|---|---|---|
| Hooks | `.codex/hooks.json`、`scripts/codex-hook.mjs` | 开始时载入项目约定；结束时发现本次变更缺少匹配验证记录，可请求至多一次补验。脚本手工测试与宿主自动触发是两种验证 |
| 连接 | 已连接的 GitHub 插件 | 已用于读取上游固定提交与文档；尚无本项目远程仓库，不能声称 PR/云端审查已接通 |
| Git | `.githooks/pre-commit`、本仓库 `core.hooksPath` | 提交前核对暂存区文件清单和明显凭据；不修改用户全局 Git 配置 |
| 环境 | `.codex/environments/environment.toml`、`scripts/setup-local.mjs` | 准备虚拟环境，提供 Verify / Offline demo / Check docs 命令。文件语法与命令可本地验证；应用内识别及选择状态需另行确认 |
| Worktrees | 已提交的 Git 基线与本地环境脚本 | 隔离代码/文档开发或独立验证；不是让多个任务同时控制同一桌面。原始记录、密钥和浏览器资料不自动复制 |

Codex 官方说明：[Hooks](https://learn.chatgpt.com/docs/hooks)、[本地环境](https://learn.chatgpt.com/docs/environments/local-environment)、[Worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)。应用配置和版本可能变化，文件存在不代表所有 UI 状态已激活。

## 运行检查与反馈

```powershell
npm run setup:local   # 安装开发依赖，不装 driver、不复制 key、不启动桌面操作
npm run verify        # JavaScript + Python + 文档链接/证据索引 + 源码发布扫描
npm run verify:docs   # 纯文档改动；不能为未验证的代码补发通过证明
npm run check:hooks   # 只读检查当前项目的 Hook 加载、启用与信任状态
```

验证脚本记录源码指纹、执行前后是否变化、各检查退出码、时间以及是否覆盖代码测试，保存在 `.local/workflow/verification.json`。修改源码后，旧指纹不再对应新状态。原始命令输出保存在同目录，不自动公开。

Hooks 不逐个工具调用重跑整套测试，不发模型请求，不安装依赖，不上传代码，也不代替代码审查。Stop 最多发起一次补验续轮；若仍未验证，报告限制而不是无限循环。明确暂停/停止应优先执行；无法识别的特殊停止表述仍由宿主遵守，hook 不是完整的意图识别系统。

`REVIEW.md` 定义宿主审查重点：正确性、动作范围、证据、来源与发布内容。当前没有独立模型自动审查服务；如果只做了宿主自查，记录必须如此标明。

## Hooks 的启用

在项目根目录使用 Codex，项目级配置才会进入相应加载范围。新的 hook 定义需要用户审阅并信任，Codex 才会执行；修改定义后可能需要重新审阅。这是平台的 [hook 信任机制](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks)，不是本项目另加的审批流程。

本项目只写配置和测试脚本，不编辑 Codex 的信任记录。用户可在截图中的“钩子”入口检查两个事件，或在项目里的 Codex CLI 使用 `/hooks`。信任前，手动 `npm run verify` 与 Git 提交检查仍可使用。当前任务如果从项目外的工作目录启动，也不能据此声称项目 hook 已自动触发。

2026-09-21 后续核验：用户已在应用中信任两个定义，按应用保存的项目路径查询，`SessionStart`、`Stop` 均为 enabled/trusted，加载错误为空。新的[启用证据](evidence/hooks-activation-2026-09-21.json)补充此前“尚未启用”的历史记录；状态查询证明执行条件满足，不等于自动触发过。

Windows Junction 或其他目录别名需要保留应用添加项目时的路径。本机将该路径转换成实际目录后，同一批定义的信任状态发生变化。检查时不要先 realpath/resolve 磁盘链接，也不要自动复制另一条路径的信任记录。可以明确指定：`npm run check:hooks -- --cwd <应用添加项目时的路径>`。该命令不发起模型回合、不运行 Hooks、不改变信任。

## GitHub 与发布

`.github/workflows/test.yml` 在 push、pull request 或手动触发时运行无 key 的离线检查；权限为只读，上传的只有验证摘要，不上传 `.local` 全目录。Issue 和 PR 模板要求验收、证据与来源。

代码写好、配置有效、本机检查通过、GitHub CI 通过、远程合并是不同状态。没有远程仓库就没有远程 CI 结果，也没有分支保护的服务器强制执行。当前未配置自动合并、发布、付费模型审查或周期监控。

首次使用 Worktree 要有 Git 提交。新检出运行环境脚本，再执行 `npm run verify`；CU 的实时验收回到明确选定的本机窗口执行。不要把有界单机结果宣传成所有 worktree、机器和应用均已验证。

## 回退

取消本项目 Git 钩子可运行 `git config --local --unset core.hooksPath`。项目生命周期 Hooks 可在 Codex 的 hook 管理界面停用；移除环境文件不会删除源码或用户数据。不要更改全局权限以让本项目流程通过。

本次具体配置和验收记录见 [docs-workflow 任务记录](changes/2026-09-21-docs-workflow.md)。

当前已建立本地提交基线并完成隔离 worktree 验证；Git 钩子已在本仓库启用，Codex 两项 Hooks 已在用户配置的项目路径下受信任。应用内环境选择、自动事件触发实录和远程 CI 启用仍分别记录，不从已信任推断这些步骤已完成。
