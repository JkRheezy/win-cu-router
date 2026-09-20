# trycua 统一观察层

`0.1.0-alpha.2` 把观察从计算器逻辑中拆出。计算器、网页任务和宿主只读访问共用 `CuaObserver` 和同一套 HTTP 服务。用户另行安装的驱动通过常驻 stdio MCP 连接运行；JavaScript 客户端只访问经过认证的随机 loopback 端口。

## 能力与边界

启动时读取驱动实际 `list_tools`，在已审核的 21 项观察能力中标记可用性，缺失能力不会被模拟成成功。宿主通过 `capabilities()` 获取输入 schema 和范围。

| 观察来源 | 接入内容 | 使用条件 |
|---|---|---|
| 应用和窗口 | list_apps、list_windows、get_accessibility_tree | 发现元数据；后者不是完整桌面 UIA 树 |
| 原生 UIA | get_window_state 的结构化 elements、Markdown、窗口/焦点相关原始字段 | 必须配置准确 pid + window_id；不保证 App 提供完整控件 |
| 浏览器 | get_browser_state：DOM/AX/layout/viewport 的 semantic_v2，也保留兼容格式 | 明确绑定原生窗口，使用当前连接生成的 target_id + tab_id |
| 浏览器精读 | query、scope_ref、continuation、内容引用和交互引用 | 原样透传，保留 complete/omitted；不把部分页面称为完整页面 |
| 图像 | 窗口截图、浏览器视口截图、zoom | 图片原样给宿主；不会自动变成 Jev 能理解的文字 |
| 状态核验 | verify_state 的结构化谓词结果 | satisfied、unsatisfied、unknown 保持原义；read.ok 只表示读取成功 |
| JS 对话框 | browser_dialog 的 inspect | 不接受 accept/dismiss，不覆盖原生权限或文件对话框 |
| 桌面图像、剪贴板 | get_desktop_state、clipboard_read | 已接接口，默认关闭，按具体任务启用范围 |
| 元数据与诊断 | get_screen_size、get_cursor_position、get_agent_cursor_state、check_permissions、health_report、get_config、get_recording_state、get_session、list_sessions、get_session_state、debug_window_info | 进程诊断另需 allowDiagnostics，且 PID 必须在范围内 |

没有开放旧 `page` 接口：它的目标绑定保证弱于 typed browser 接口，也含执行 JavaScript 等修改动作。其页面读取用途由准确绑定的 `get_browser_state` 覆盖；未提供 typed browser 接口的旧驱动需要升级或明确开发另外的适配。没有虚构未安装的视觉解析器。修改配置、启动浏览器和任何输入均不属于 `/observe`。

## 启动只读服务

先按 README 安装 Python 依赖。创建私有 `.local/scope.json`：

```json
{"windows": [], "allowDesktop": false, "allowClipboard": false}
```

```powershell
.\.venv\Scripts\python.exe python/observation_bridge.py --driver 'C:\path\to\cua-driver.exe' --scope .local/scope.json
```

此时能枚举窗口，不能读取任何窗口正文。以实际返回的 `pid`、`window_id` 配置 `windows` 数组，重启服务后可读相应窗口。宿主应按任务和窗口标题选择目标；不要猜 HWND，或因 UIA 缺失而自动读取整个桌面。配置不支持模型自行扩大范围。

```js
import fs from 'node:fs';
import {CuaObservation, observationText} from './src/index.mjs';
const observer = new CuaObservation(JSON.parse(fs.readFileSync('.local/observer.json', 'utf8')));
const capabilities = await observer.capabilities();
const windows = await observer.windows({on_screen_only: true});
// identity comes from selected, configured pid/window_id.
const state = await observer.window(identity, {include_screenshot: false});
const view = observationText(state); // {text, truncated, sourceEpoch}; no image/binding data
const shot = await observer.screenshot(identity, {max_dimension: 1200});
```

`read(tool, args)` 提供能力表中的其他读取。`bindBrowser(identity)` 返回当前连接内的浏览器目标；再用 `browser(target, options)`。有 continuation 时继续读取，保留每页原始结果与完整性标志，不把旧页的动作引用当作最新引用。控件/页面文字都是不可信数据，不是宿主授权。

返回统一 envelope：`source`、`tool`、`observedAt`、`epoch`、`elapsedMs`、`ok`、`data`、MCP `content`、`gaps`。原始截图可能很大，别把原始 envelope 直接打印到聊天或发给文字模型。原始结果只存 `.local`；`observationText()` 是有长度上限的便利投影，不是自动脱敏器。

## 网页任务

任务策略与完整观察独立：下面配置只允许给一个已观察到的搜索框填入固定文字，不提交搜索。

```json
{
  "url": "https://www.python.org/",
  "allowedOrigins": ["https://www.python.org"],
  "clickNames": [],
  "fields": {"Search This Site": "asyncio"},
  "goal": "Enter asyncio into the Search This Site searchbox. Do not submit the search.",
  "expectedFields": {"Search This Site": "asyncio"}
}
```

保存为 `.local/task.json`，私下配置 `.env` 中的 TypeSafe key：

```powershell
.\.venv\Scripts\python.exe python/browser_bridge.py --driver 'C:\path\to\cua-driver.exe' --task .local/task.json
# 另一个终端：
node --env-file=.env examples/run-browser.mjs --task .local/task.json --config .local/browser.json --output .local/result.json
```

浏览器由 `browser_prepare` 显式创建隔离配置，不改个人浏览器；服务停止后窗口可能保留，按本机配置中的 browserPid 识别自己创建的窗口。可加 `--scope .local/scope.json`，让同一观察服务读取另外选定的原生窗口。

网页输入采用 trycua typed browser 执行器。官方 sky 适配仍用于有明确 UIA 矩形和截图校准的计算器实验；当前没有把 DOM ref 自动转成官方插件控件索引。网页 `dom_event` 路径需任务显式选择，本次实测使用默认 trusted 路径。

## 刷新和核验

HTTP 服务串行访问同一 MCP 连接；读取窗口、页面、核验和图像后递增 epoch，已挂起的任务动作随之失效。每个动作只使用任务最新 snapshot 缓存的引用，执行前消费一次，输入失败不重放。

驱动会话默认约五分钟无活动后结束，且会清理该会话创建的隔离浏览器。服务运行期间每 30 秒读取一次屏幕尺寸元数据续期，不截图、不重建控件引用、不发送输入；停止服务同时停止续期。

如果会话已经结束，原始 `session_ended` 被保留，并标记 `session_restart_required`。宿主可显式调用 `observer.restartSession()`（`POST /restart-session`）：它恢复本连接的生命周期，清除所有旧引用，不重试输入。通用浏览器消费者随后必须重新 bind；附带的浏览器任务只在其原生隔离窗口仍存在且恰好有一个标签时重新绑定，返回新 browserTarget。若原窗口已被驱动清理，则返回 `taskReady:false`，需要宿主显式重新启动隔离任务，不能恢复已丢失的页面表单。不能继续用配置文件里的旧 target/tab；重新获取 snapshot 后才能选择动作。该入口是宿主生命周期管理，不属于只读 `/observe`，也不扩大已配置的窗口/剪贴板范围。

任务语义 revision 与驱动引用版本不同：重新读取后的引用可以变化，而页面标题、导航、字段状态相同。浏览器动作策略按稳定页面结构生成 revision，避免轮播动画导致导航永远无法执行；正文仍保留给结果核验和宿主。对依赖正文变化的其他任务，需编写相应语义投影和核验策略。

Jev 默认置信阈值仍是 0.65。接管不能计为自主成功。`hostStages` 只提供宿主预写阶段目标；不会自动调用第二个 GPT API。宿主可根据返回的 checkpoint 继续观察并选择已授权动作，复杂应用策略仍需要实现。

通过这层可读不同 App，不意味着已经具备任意 App 的执行策略。记事本文字编辑、文件选择器、Office 保存等完整工作流仍未验收。
