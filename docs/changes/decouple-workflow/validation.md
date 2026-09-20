# 解耦验证

依据 Anthropic Playbook 的 Plan / Infrastructure 与 artifact source-of-truth 说明，单产品可把意图和计划保存在产品仓库；它未要求将通用宿主工具作为产品依赖。本次保持项目记录与运维配置，把可复用的宿主工具提取到独立本机 Git 项目。

已完成的本机证据：

- 产品：12 项 JS + 7 项 Python 测试；GitHub 运维：3 项独立测试。完整验证包含源码扫描、文档检查和隔离源码包复验，全部通过。
- 发布包不包含独立宿主工具或私有接入配置；在解压目录运行产品测试和 mock demo，通过；未配置的 Hook shim 返回空结果。
- 独立宿主工具：8 项测试通过；用另一个不含 package.json 的临时 Git 仓库测试验收、源代码变化与缺失证据，CLI 也实际执行。工具保留本机 Git 提交 `68f18848d55ba239f1819d933d1baf682fef9129`，没有发布第二个远程仓库。
- 两个原有 Hook 定义仍为 enabled/trusted，定义哈希未变；独立工具接入后的 SessionStart/Stop 手工调用通过。这仍不声称观察到真实自动生命周期事件。
- `actionlint` 验证本项目三个 GitHub 工作流通过。云端不引用本机工具路径，产品测试不再读取固定的当前任务或审查文件。

已完成的远程回流证据：

- [Issue #2](https://github.com/JkRheezy/win-cu-router/issues/2) 的 intake 形成 [PR #3](https://github.com/JkRheezy/win-cu-router/pull/3)，CI 通过后合并并关闭该 issue。
- 修复后首次[诊断运行](https://github.com/JkRheezy/win-cu-router/actions/runs/35533493162)成功。关闭 [Issue #4](https://github.com/JkRheezy/win-cu-router/issues/4) 后再[重复运行](https://github.com/JkRheezy/win-cu-router/actions/runs/35533960761)，工作流成功，Issue 保持关闭且包含最新运行链接，证明诊断回流的实际 API 路径有效。

以上演练不是产品故障或 CU 性能测试。最终解耦 PR、主分支 CI 和源码发布的状态由各自 GitHub 记录提供，不将这里的本机检查提前当成远程发布成功。
