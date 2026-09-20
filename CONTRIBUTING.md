# 参与与纠错

优先欢迎可复现的任务、观察缺失/引用失效案例、适配改进和来源归属修正。请使用 [GitHub Issues](https://github.com/JkRheezy/win-cu-router/issues) 的任务模板。

## 报告问题

说明系统与应用版本、driver 版本、使用的模型和执行器、目标任务、预期结果与实际结果。区分动作未送达、界面未变化、模型请求接管和核验失败；记录失败前后的观察范围与阶段耗时。

分享前移除 key、连接 token、个人路径、浏览器资料和正文隐私。不要直接上传 `.local`；必要时只给出脱敏结构与最小可复现步骤。

## 修改代码或文档

复用统一观察接口，为新增任务编写动作范围与独立完成条件。不要因为一次成功便扩大能力声明，不要降低阈值以隐藏失败。涉及新的上游依赖、移植、改写或片段引用时，同步更新 [PROVENANCE](PROVENANCE.md) 与 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)，保留所需许可通知。

需要验证代码时运行：

```powershell
npm run setup:local
npm run verify
```

文档修改应核对相对链接、命令与当前实现。若修改效果宣传，必须给出任务、尝试次数、失败/接管、计时范围和对应记录；将上游演示、维护者本机实测、推断和未来计划分开。署名不完整或用语夸大也值得单独修正。

每个 PR 更新 `.github/sdlc.json` 的任务名，在 `docs/changes/<任务>/` 保存意图、验收、基线提交、允许变更范围和审查。可参考 [首个发布任务](docs/changes/sdlc-publication/intent.json)与[计划](docs/changes/sdlc-publication/plan.json)。审查完成后记录当前源码指纹，再运行完整验证。工作流细节与问题回流方式见 [WORKFLOW](docs/WORKFLOW.md)。没有独立审查者时明确记录宿主自查，不生成虚构批准。
