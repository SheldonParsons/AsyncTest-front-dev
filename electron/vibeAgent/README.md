# Electron 本地 Pi Agent（Vibe v2）

这组模块把 Pi 的进程、普通本机文件引用、会话日志和 Trace 放到 Electron Main；后端不
启动 Agent 循环，只提供版本化的 Knowledge Tool、被动 Trace 接收，以及每个 Goal
开始时的一次 Provider/Skill 运行快照。

## 运行方式

Vibe 对话固定由 Electron Main 启动本机 Pi；运行方式不是可切换的 HTTP 请求字段。
开发版只需配置知识服务地址：

```text
VITE_VIBE_KNOWLEDGE_BASE_URL=http://127.0.0.1:6001
```

服务端仍会在 `agent-bootstrap` 校验账号是否有本机运行权限；Renderer 没有
server Agent 回退开关，也不会把普通对话发送到服务端 Turn 路由。

每个 Goal 开始时，Electron Main 使用登录态向
`POST /vibe/foundation/agent-bootstrap` 请求一次完整运行快照，包括系统提示、工具、
冻结的强模型、线协议选项和 Provider 凭据。之后 Pi 直接调用 Provider；运行过程中没有
Provider preflight、permit、heartbeat 或代理请求。凭据只存在于 Main/子进程内存，
不进入 Renderer、本地描述文件或 Trace；冷恢复时重新领取快照，不持久化旧 key。

## Electron Pi 启动自检

应用启动时 Main 会在本机执行一次 `electron_pi_readiness.v1` 自检并缓存结果。自检只
拉起 runner、加载 Pi Core、Pi AI、Undici、NodeExecutionEnv、四个官方本机工具和 Skill
公共 API，核对 Node/协议/依赖版本；不读取 Provider、不请求模型、也不访问服务端。Preload 只提供 `vibeAgent.readiness.check()` 查看结果和
`vibeAgent.readiness.export()` 通过原生保存框导出 JSON，正常 Goal 不依赖该报告。

## 普通本机文件边界

选择文件时 Electron 原生文件选择器只返回类型化 `local_file_ref.v1`（引用 ID、文件名、
MIME、大小和修改时间）；Renderer 不获得通用 IPC 或绝对路径。Main 在 Goal 开始前验证
引用归属和当前文件状态，然后把绝对路径只交给本机 Pi 子进程。文件保持在用户原位置，
不复制、不上传、不覆盖、不自动删除；原文件权限仍由操作系统/TCC/UAC 决定。

本地会话只记录文件引用的非敏感元数据。点击历史中的本机文件时，Viewer 只向 Main
请求最多 512KiB 的预览；不会回退到服务器附件下载接口。路径、文件名和正文都属于
不可信数据，不能改变系统合同。

Pi 直接使用 `@earendil-works/pi-agent-core` 的 `createReadTool`、`createWriteTool`、
`createEditTool`、`createBashTool` 和 `NodeExecutionEnv`。JSONL v2 会保留每个本机调用
的 `local_tool_start`、`local_tool_update`、`local_tool_end`，并把真实 tool result 与
assistant tool call 配对写入 LocalSessionStore 和 Trace。

PDF、Excel、PPTX（旧版 PPT 不做转换）和图片是普通本机能力，不是知识库专用 reader。`read` 对 PDF 使用
审计过的 `pdfjs-dist@6.3.289` 文本适配器，对 XLS/XLSX 使用 `xlsx@0.18.5`，对 PPTX
使用 `jszip@3.10.1`；输出尽量保留为 Markdown，随后由 Pi 自己决定是否交给知识工具。
解析器在读取前限制单个文档为 128 MiB（PDF 最多 1000 页、Markdown 最多 4,000,000
字符，PPTX 解压和单页 XML 也有独立上限）；超限会明确失败。分页产生的临时 Markdown
只存在本次 Pi 运行期间，终态先停止子进程再清理，用户原文件永不删除。

当本地 Pi 的上下文接近 247,500 estimated tokens 时，runner 会用一次无工具的
`context_checkpoint` 摘要压缩旧历史；摘要作为私有会话边界保存，不显示给用户。单页或
未完成工具波次超过 275K 硬上限时会明确失败，不会静默截断或自动重试。

本地会话第一次 Goal 真正完成后，同一个 Pi 子进程会用同一份 Provider 快照执行一次
无工具的私有标题总结；标题最多 12 个字符，只写入 LocalSessionStore，不进入聊天正文。
该调用计入本地模型预算，失败或结果不合格时保留默认标题。

只有 Pi 整理出的最终 Markdown、并经过用户确认的 `model_authored` 文档，才会通过
`POST /vibe/foundation/knowledge/tool` 进入知识库；不会把原始文件路径、文件引用或
附件资源身份当作写入内容。大 Markdown 的 chunks/hash 是 Main→server 的隐藏传输细节，
不出现在公开模型 schema；当前单份正文上限为 4,000,000 个 Unicode 字符。知识库中的
已确认内容是唯一业务权威。

## Knowledge Tool v2 与 Skill

新 Electron Goal 只看 `knowledge_tool_manifest.v2`：`get_knowledge_overview`、
`search_knowledge`、`read_knowledge`、`add_knowledge`、`edit_knowledge`、
`delete_knowledge`、`move_knowledge_section`、`search_vibe_platform_docs` 和
`ask_clarification`。`list_knowledge_structure`、所有 attachment reader 以及
`read_many/*_batch` 不在公共面；`apply_confirmation`/`cancel_confirmation` 只作为
隐藏交互动作。一个 assistant message 中的多个只读调用可组成一个 1–20 项 read wave，
由 Main 发往 `/vibe/foundation/knowledge/tool-wave`；写调用始终串行且同一时刻只有一个
pending confirmation。

每个新 Goal 从服务端取得一次 `vibe-knowledge` Skill 的 name/description/version/SHA/content。
Main 按 hash 写入不可变本地缓存，runner 使用 Pi 官方 `loadSkills` 和
`formatSkillInvocation` 注入完整正文；冷恢复沿用原 hash。Trace 记录 Skill 元数据和最终
system prompt 摘要。

## Trace

每个 local run 生成一个 `vibe.agent.trace.v1` 目录：manifest、events.jsonl 和独立
payload 文件。Provider 调用默认只保留请求摘要、hash、大小、工具元数据和结果；不会重复
保存完整的 system prompt、工具 Schema 和历史。需要一次深度排障时，Main 可通过受控的
`VIBE_PI_TRACE_CAPTURE_PAYLOAD=1` 临时保留完整请求体。本机运行只
移除凭据字段（这是密钥安全，不是隐私脱敏）。结束后由 TraceUploadQueue 以 framed-v1
分块上传到后端 `/vibe/foundation/agent-traces`，失败可从 `upload.json` 继续。
下一次本地 Agent 发送请求且用户仍登录时，Main 会在后台尝试续传已完成但尚未上传
完的 Trace，不会重跑 Agent 或 Provider 请求。

## 重启与崩溃恢复

Main 会在 `userData/vibe-agent/runs/<run_id>/descriptor.json` 保存不含凭据的运行描述：
Provider key、Provider headers、登录 token、Cookie 和一次性票据永不落盘。描述只在已经形成完整
`interaction_request` 时可恢复；重启后 Renderer 打开对应本地会话即可重新显示卡片，
用户作答时 Main 从本地会话日志重建 Pi 的 `seed_messages`，用同一个 `run_id` 冷启动
续跑，不重放原来的 Provider/tool wave。Provider 或工具处于进行中时一律标记
`provider_outcome_unknown` / `tool_outcome_unknown`（或 `runner_interrupted`），不自动
重试。确认结果已经返回但子进程尚未接收时会保存 `resume_ready`，再次操作只复用已知
结果，避免重复写入。

## 打包布局

打包版只把 `runtime/` 解到 `app.asar.unpacked`，便于 Electron 以独立子进程执行；Pi
官方依赖仍在 `app.asar` 内。Main 会把受信任的 `app.asar` 根路径传给 runner，runner
按官方 `exports` 解析为绝对路径，因此不依赖 ESM 不支持的 `NODE_PATH`，也不需要把
整棵 `node_modules` 解包。
这里的“原始附件不上传”指不创建服务端附件资源、不把文件本体送入 Knowledge Tool；
为便于排障，Pi 实际读入上下文的附件片段可能随 Trace payload 上传。若未来要求连
Trace 也不携带附件正文，需要另设 local-only Trace 投影。

## 服务端边界

服务端旧 Agent Turn API 仅供后端质量工具或部署回滚使用，不属于 Electron 正常对话路径。
Electron 新 Goal 只发送 prompt/history、Provider 选择、local_file_ref 和登录上下文；
Provider key 只能由 Main 的一次性快照交换注入子进程。旧会话里残留的 workspace 身份不会
被恢复，Viewer 会提示重新选择原文件。
