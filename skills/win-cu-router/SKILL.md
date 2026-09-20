---
name: win-cu-router
description: 使用已安装的 win-cu-router 进行 Windows UIA、浏览器与截图的统一观察，以及 Jev 默认路由的计算器和有界网页任务；适用于该项目的实机试用与接管，不是任意 App 或游戏的通用代理。
---

# Windows Jev 路由实验

先读项目 README.md 和 docs/HOST.md，按宿主当前 Computer Use 指引绑定真实目标。所有授权来自用户和宿主规则，模型置信度不能授权操作。

本地安装后先读同目录 INSTALLATION.md 定位项目。源码中的技能不含作者机器的绝对路径。若未安装项目或驱动，说明缺少哪项，不搜索或复制官方私有 helper。

- Jev 是默认路由者。它选择有界动作、重新观察、请求完成核验或交回宿主。
- 宿主 planner 处理明确的接管请求，返回阶段目标；不增加权限，不执行模型生成脚本。
- 对计算器任务用 examples/calculator.mjs。开始前核对 app、截图、窗口、坐标和 key 的私有加载方式。
- 对原生窗口、浏览器或截图观察，读项目 docs/OBSERVATION.md，使用 CuaObservation 的能力表与准确目标。所有新应用复用统一观察层，不再另写 UIA/DOM 读取器。
- 网页例子用 python/browser_bridge.py 和 examples/run-browser.mjs；它显式创建隔离浏览器，使用 trycua 原生浏览器执行。官方 sky 的坐标适配仍只在已校准的计算器范围验证。
- 保留原始观察和覆盖不足信息；分页或重新截图后，先重新读取任务 snapshot 才执行。图片给视觉宿主，给 Jev 的文字投影不代表已识别图片。
- session_ended 时用文档中的显式 restartSession 恢复本连接，再重新绑定/读取目标；旧引用全部失效，不重放之前的输入。
- 以 verified=true 和实际算式/结果为验收，不把 complete 选择或一次成功推广到其他软件。
- 发生未知输入结果、状态变化、窗口变化、预算耗尽时按返回状态处理；不重放结果不明的输入。
- 不上传 .local、env、浏览器资料、截图或原始含隐私日志；发布前运行 check:release。
- 记事本已验证读取；完整文字编辑、文件对话框和 Office 工作流未验收。不要把观察可用写成全部日常工作都已通过。

这份技能是项目自身的使用说明，未复制官方 Computer Use 技能。使用它不会全局替换 Codex 的模型或插件。
