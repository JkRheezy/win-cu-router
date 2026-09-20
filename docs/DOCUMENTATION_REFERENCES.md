# 文档写作参考

查看日期：2026-09-21。以下仅为文档组织方式的参考，不是本项目运行依赖、技术贡献或合作方。正文重新撰写，没有复制它们的 README 段落、图标或性能宣传。

| 参考项目 | 借鉴的写法 | 在本项目中的落实 |
|---|---|---|
| [Astral / uv README](https://github.com/astral-sh/uv/blob/main/README.md) | 定位、特性、安装和文档入口层次清楚；致谢区分采用的实现与受到的启发 | 首页先解释用途和状态，PROVENANCE 分开列直接依赖、启发和新增工作 |
| [Microsoft / Playwright README](https://github.com/microsoft/playwright/blob/main/README.md) | 按使用目的区分开始方式，再给相应例子和验证入口 | 区分离线 demo、只读观察、网页例子和官方宿主执行，避免一条安装命令暗示全部可用 |
| [OpenHands README](https://github.com/OpenHands/OpenHands/blob/main/README.md) | 明示成熟度、快速入口，以及本地/其他后端的部署边界 | 直接写 alpha 状态、独立安装条件和宿主依赖，不挂未实际运行的 CI 或发布徽章 |
| [Browser Use / Jev Ultrafast README](https://github.com/browser-use/jev-ultrafast/blob/1231850a0bf1a0c0341fe408ef1668dbbfdfac46/README.md) | 性能描述链接详细测量，说明计时起点、核验与不支持的场景 | 实测表关联 E 编号、摘录、失败样本和计时口径；不沿用上游演示成绩 |

写作参考不会替代事实审查。每个新增功能、效果或归属声明仍需对应本项目代码、实际记录或明确的上游来源。社区欢迎修正错误与补充遗漏，而不是只增加宣传文字。

开发流程另参考 Anthropic 的 [AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)。它是工作流启发，不是这些开源项目 README 的来源，也不表示本项目使用 Claude；具体适配见 [WORKFLOW.md](WORKFLOW.md)。
