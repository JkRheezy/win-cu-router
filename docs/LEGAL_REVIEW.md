# 发布前许可证与条款审查

核查日期：2026-09-21。以下为基于当前仓库和公开条款的工程审查，不是律师意见、专利检索或不侵权保证。适用合同可能因账户及地区不同而变化。

## 架构与源码要分开判断

按中国《计算机软件保护条例》第六条，软件著作权保护不延及开发软件所用的思想、处理过程、操作方法或数学概念。一般的观察—路由—执行—核验架构与所选技术栈，不会仅因别人先使用就自动成为其独占源码。但具体代码、文档、素材、商标、专利、商业秘密和服务合同仍可能形成限制。[行政法规来源](https://www.forestry.gov.cn/c/www/gwywj/40492.jhtml)

## Jev-cu

检查的上游 `package.json` 声明 ISC，但仓库无独立 LICENSE 文件和明确的版权署名。这不等于断言它无许可，也不足以替维护者完成所有授权解释。若直接 fork 后改名发布，应先核实许可范围、补齐应保留的通知。此项目采用独立实现，不复制 Jev-cu 源码；已在 PROVENANCE.md 记录参考关系。它不是严格意义的 clean-room 项目。[上游声明](https://github.com/Sac-Y/Jev-cu/blob/main/package.json)

公开可见不等于任意再许可；GitHub 也说明许可证决定复制、修改和分发权利。[GitHub 说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

## trycua 与其他依赖

检查的 trycua 仓库根许可证为 MIT，驱动 Python 包也声明 MIT；分发其代码或实质性部分时需保留许可证及版权通知。各子项目/制品仍应单独检查。当前仓库只调用另行安装的 driver，不捆绑其源码、二进制或模型权重。[trycua LICENSE](https://github.com/trycua/cua/blob/main/LICENSE.md)

Python MCP SDK 通过 requirements 单独安装。若未来做一键安装包、Docker 镜像或打包 exe，需要重新列出实际随包依赖及其通知，不能沿用“本仓库未分发依赖”的结论。

## 官方 Computer Use

OpenAI 服务条款中 Licensed Materials 部分对本地交付的软件规定了使用范围，并限制修改、再分发及再许可；明确以开源许可提供的组件可有不同权利。当前没有据此确认官方 CU 运行时可作为本项目内容再分发。最稳妥的工程边界是只发布自己的接口适配，由用户在已授权的 Codex 环境使用其已有插件；不复制官方 skill、包或 helper，不逆向私有协议，也不宣称官方授权合作。[OpenAI 服务条款 §10](https://openai.com/policies/service-terms/)

这仍不是 OpenAI 对本项目的合作或再分发许可。是否符合具体宿主的文档及账户合同，需在发布和使用时再次确认。公开源码与可在普通 CLI 任意运行官方插件是两回事。

## TypeSafe 服务

TypeSafe 的客户协议允许按文档将 API 集成到客户应用，同时限制将其作为独立服务转售、复制/逆向服务、蒸馏或开发类似/竞争服务等行为。开源一个用户自带 key 的调用与路由适配层，和转售模型服务或复制模型应分别判断；这里不提供商业包装的许可保证。本项目不共享 key、不分发权重，不使用输出训练竞争模型。[TypeSafe MCA §2](https://typesafe.ai/legal/mca)

如未来经营付费代理、共享一个服务账号给公众、对服务做品牌包装或改变用途，应就具体模式向供应方确认，而不只看本项目的 MIT。

## AI 生成代码与命名

OpenAI 条款在双方关系和法律允许范围内将输出权利归于用户，同时指出输出不一定唯一，也不替代第三方权利。本项目 MIT 不等于排除任何第三方专利或版权风险。[OpenAI 使用条款](https://openai.com/policies/terms-of-use/)

项目暂用中性名称 win-cu-router。Jev、TypeSafe、OpenAI、Codex、trycua 只用于准确说明兼容性及来源，不使用联名 logo 或“官方 Windows 移植”表述。商标可用性和专利自由实施未做检索。若后续商用规模较大，应由律师结合最终代码、合同和经营方式审查。

## 本次发布边界

已准备：适配源码、MIT、来源表、外部组件说明、计算器与有限网页任务的脱敏验证记录、发布前凭据/文件扫描。本文的条款核查日期不因文档整理而自动更新；最新成果与范围以 README、PROVENANCE 和 VALIDATION 为准。

未准备或未授权：任何供应商二进制再分发、官方合作标志、任意软件稳定性承诺、专利许可、替用户创建并发布 GitHub 仓库。
