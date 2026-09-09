# Electron 本地 Pi Agent（Vibe v2）

## 对话恢复（2026-09-09）

- 不再执行整轮六分钟限制。Provider 建连期限20秒；等待响应和生成无进展期限沿用 Provider read 配置，缺省600秒。有效生成增量刷新无进展计时，持续输出没有总时长上限。
- Pi 负责三次短期模型重试；仍失败时保存 `retry_wait`，释放子进程，由 Main 按15/30/60秒基准退避恢复，遵守 Retry-After。不可重试的模型错误保留为 `blocked`，不会冒充完成。
- `LocalRunStore` 仍是恢复状态唯一所有者，Pi JSONL 仍是模型上下文唯一所有者。不新增后台服务或数据库表。旧的失败记录不会被自动启动。
- 用户停止当前执行后不自动恢复；在同一对话发“继续”时，正常会话携带原历史和恢复信息，主脑决定下一步。不按关键词强制执行上个工具，也不重新批准已取消的确认。
- 关闭应用保留待处理记录；重新取得有效身份后通过 `vibeAgent:recoverPending` 恢复安全步骤。任务恢复与 Trace 补传是两个独立 IPC 入口。
- 已确认写入结果未知时沿原确认ID核实/补取，停止时保留待核实确认身份。任意本地写文件或命令的未知结果不会自动重放。
- 知识读取传输故障可持续退避重试；预览只在有稳定调用身份时做短期重试；正式写入不使用通用传输重试。运行快照以及 Trace 开始/完成阶段具有短期传输重试。
- 删除会话和退出账号清除待调度恢复，重新检查账号、项目、服务地址及文件身份。不能把服务器授权失败当作临时网络故障无限重试。

首次运行快照请求前会保存原输入及已验证文件描述。暂时故障可跨重启恢复；恢复时重新鉴权、校验文件身份，取得完整快照后才启动模型。取消预检会中断请求且不会启动模型。验证与限制见外置测试数据目录 `audits/20260909-conversation-reliability`。前后端需配套更新并重启 Electron；旧客户端仍可能执行旧时长限制。没有安全重放依据的文件/命令故障需要用户处理。

这组模块把 Pi 的进程、普通本机文件引用、会话日志和 Trace 放到 Electron Main；后端不
启动 Agent 循环，只提供版本化的 Knowledge Tool、被动 Trace 接收，以及每个 Goal
开始时的一次 Provider/Skill 运行快照。

## 运行方式

### 录入正文准备

写工具提交提取后的字符串，由后端统一进行默认 LLM 美化，Main 不先行改写正文。
用户本轮明确说“不要美化”“原样录入”等时，Main 锁定 `preserve`，工具参数或附件指令不能覆盖它。
本轮选中的 Provider/模型与预览协议版本由 Main 传入，不由模型自由指定。

确认卡默认展示最终 Markdown 正文；原文与差异可展开。切换原文只替换待确认预览，
不会提交知识；正常运行与冷恢复共用确认卡的会话持久化入口，避免旧历史覆盖新预览。

对于已授权的 UTF-8 Markdown/TXT 附件，Main 校验文件身份并匹配整份文字或精确片段，
恢复整份文字转交时遗漏的边界空白；不匹配的改写不按原样提交。这不是通用文件工具或第二套抽取器。
该核对限制为 4 MB；二进制附件的原样边界仍是提取后提交的字符串，不承诺原文件字节或版式。

Vibe 对话固定由 Electron Main 启动本机 Pi；运行方式不是可切换的 HTTP 请求字段。
开发版只需配置知识服务地址：

```text
VITE_VIBE_KNOWLEDGE_BASE_URL=http://127.0.0.1:6001
```

服务端仍会在 `agent-bootstrap` 校验账号是否有本机运行权限；Renderer 不提供
服务端 Agent 回退，也不会把普通对话发送到服务端 Turn 路由。

每个 Goal 开始时，Electron Main 使用登录态向
`POST /vibe/foundation/agent-bootstrap` 请求一次完整运行快照，包括系统提示、工具、
冻结的强模型、线协议选项和 Provider 凭据。之后 Pi 直接调用 Provider；运行过程中没有
Provider preflight、permit、heartbeat 或代理请求。凭据只存在于 Main/子进程内存，
不进入 Renderer、本地描述文件或 Trace；冷恢复时重新领取快照，不持久化旧 key。

## Electron Pi 启动自检

应用启动时 Main 会在本机执行一次 `electron_pi_readiness.v1` 自检并缓存结果。自检只
拉起 runner、加载 Pi Core、Pi AI、Pi Coding Agent SDK、Undici、NodeExecutionEnv、四个官方本机工具和 Skill
公共 API，并确认 `createAgentSession`、`AgentSession`、`SessionManager` 可用；不读取 Provider、不请求模型、也不访问服务端。Preload 只提供 `vibeAgent.readiness.check()` 查看结果和
`vibeAgent.readiness.export()` 通过原生保存框导出 JSON，正常 Goal 不依赖该报告。

## 普通本机文件边界

选择文件时 Electron 原生文件选择器只返回类型化 `local_file_ref.v1`（引用 ID、文件名、
MIME、大小和修改时间）；Renderer 不获得通用 IPC 或绝对路径。Main 在 Goal 开始前验证
引用归属和当前文件状态，然后把绝对路径只交给本机 Pi 子进程。文件保持在用户原位置，
不复制、不上传、不覆盖、不自动删除；原文件权限仍由操作系统/TCC/UAC 决定。

本地会话只记录文件引用的非敏感元数据。点击历史中的本机文件时，Viewer 只向 Main
请求最多 512KiB 的预览；不会回退到服务器附件下载接口。路径、文件名和正文都属于
不可信数据，不能改变系统合同。

主循环由 `@earendil-works/pi-coding-agent@0.84.4` 的 `AgentSession` 托管，并直接使用
其 `createReadToolDefinition`、`createWriteToolDefinition`、`createEditToolDefinition`、
`createBashToolDefinition`；文档读取适配器另用 Pi Core 的 `NodeExecutionEnv`。JSONL v2 会保留每个本机调用
的 `local_tool_start`、`local_tool_update`、`local_tool_end`，并把真实 tool result 与
assistant tool call 配对写入 LocalSessionStore 和 Trace。

PDF、Excel、PPTX（旧版 PPT 不做转换）和图片是普通本机能力，不是知识库专用 reader。`read` 对 PDF 使用
审计过的 `pdfjs-dist@6.3.289` 文本适配器，对 XLS/XLSX 使用 `xlsx@0.18.5`，对 PPTX
使用 `jszip@3.10.1`；输出尽量保留为 Markdown，随后由 Pi 自己决定是否交给知识工具。
解析器在读取前限制单个文档为 128 MiB（PDF 最多 1000 页、Markdown 最多 4,000,000
字符，PPTX 解压和单页 XML 也有独立上限）；超限会明确失败。分页产生的临时 Markdown
只存在本次 Pi 运行期间，终态先停止子进程再清理，用户原文件永不删除。

上下文管理、截断工具调用恢复和压缩续跑由官方 `AgentSession` 完成。模型能力优先取
Provider 明确配置；未配置时按 Provider family + 精确 model id 使用 Pi 0.84.4 官方模型目录，
不再继承旧服务端 ReAct 的 12 次调用、275K 上下文、8192 输出或 360 秒预算。暂时性模型故障
先由 AgentSession 短重试，耗尽后由 Main 持久化退避续跑；不叠加 Provider SDK 内部重试。
Thinking 未显式配置时保持 `off`。

本地会话第一次 Goal 真正完成后，同一个 Pi 子进程会用同一份 Provider 快照执行一次
无工具的私有标题总结；标题最多 12 个字符，只写入 LocalSessionStore，不进入聊天正文。
该调用单独记录 Provider usage，失败或结果不合格时保留默认标题。

只有 Pi 从任意输入资源整理出的最终内容字符串、并经过用户确认的知识项，才会通过
`POST /vibe/foundation/knowledge/tool` 进入知识库；不会把原始文件路径、文件引用或
附件资源身份当作知识内容。大字符串的 chunks/hash 是 Main→server 的隐藏传输细节，
不出现在公开模型 schema；当前单份正文上限为 4,000,000 个 Unicode 字符。知识库中的
已确认内容是唯一业务权威。

## Knowledge Tool v3 与 Skill

新 Electron Goal 只看 `knowledge_tool_manifest.v3`：`get_knowledge_overview`、
`search_knowledge`、`read_knowledge`、`add_knowledge`、`edit_knowledge`、
`delete_knowledge`、`search_vibe_platform_docs` 和
`ask_clarification`。`list_knowledge_structure`、所有 attachment reader 以及
`read_many/*_batch` 不在公共面；`apply_confirmation`/`cancel_confirmation` 只作为
隐藏交互动作。一个 assistant message 中的多个只读调用可组成一个 1–20 项 read wave，
由 Main 发往 `/vibe/foundation/knowledge/tool-wave`；写调用始终串行且同一时刻只有一个
pending confirmation。

每个新 Goal 从服务端取得一次 `vibe-knowledge` Skill 的 name/description/version/SHA/content。
Main 按 hash 写入不可变本地缓存，runner 使用 Pi 官方 `loadSkills` 与隔离的
`DefaultResourceLoader` 把它登记到官方 Skill 清单；Pi 按标准 Skill 机制在需要时读取正文，
不会扫描用户的 `~/.pi` 或项目级扩展。冷恢复沿用原 hash。Trace 记录 Skill 元数据和最终
system prompt 摘要。

## Pi 官方会话与上下文压缩

每个产品会话在 `userData/vibe-agent/sessions/<session_id>/pi-session/session.jsonl`
拥有一份 Pi 官方 v3 Session。Renderer 只提交本轮输入；Main 根据已绑定的账号、项目和
会话生成私有路径，runner 使用官方 `SessionManager.open()` 恢复消息、工具调用、工具结果和
`CompactionEntry`。升级前已有会话只在首次创建 Pi Session 时从 `events.jsonl` 导入一次，
后续不再把完整历史跨 IPC 发送。

自动压缩使用 Pi 0.84.4 默认边界（`reserveTokens=16384`、
`keepRecentTokens=20000`）；Thinking 默认关闭，重试由上述单一分层路径负责。压缩摘要只进入 Pi Session
和 Trace，不成为用户可见回答。产品 `events.jsonl` 继续负责 UI、附件、确认卡与生命周期，
不再承担模型上下文或自研 checkpoint。

## Trace

每个 local run 生成一个 `vibe.agent.trace.v1` 目录：manifest、events.jsonl 和独立
payload 文件。Provider 调用默认只保留请求摘要、hash、大小、工具元数据和结果；不会重复
保存完整的 system prompt、工具 Schema 和历史。需要一次深度排障时，Main 可通过受控的
`VIBE_PI_TRACE_CAPTURE_PAYLOAD=1` 临时保留完整请求体。本机运行只
移除凭据字段（这是密钥安全，不是隐私脱敏）。结束后由 TraceUploadQueue 以 framed-v1
分块上传到后端 `/vibe/foundation/agent-traces`，失败可从 `upload.json` 继续。
下一次本地 Agent 发送请求且用户仍登录时，Main 会在后台尝试续传已完成但尚未上传
完的 Trace，不会重跑 Agent 或 Provider 请求。

同一 Trace 的创建与追加共用一条 Main 写队列，启动事件不会再竞争序号。旧版本已产生的
`provider.snapshot.acquired(1) → agent.start(1) → 后续连续事件` 只在详情/AI 审计投影中
恢复为唯一顺序并保留 `recorded_sequence`；本机原始 JSONL、payload 和 OSS `.framed`
不会被改写。任何不符合这一已知签名的重复、倒序或中段损坏仍会拒绝读取。

## 对话视图交接与证据边界

正常完成先保留答案和过程快照，再从 Main 的同一份本地会话历史加载正式投影。
终态读取不复用完成前的在途读取；新建、切换、再次发送及新的终态交接均使旧视图读取失效。
历史暂时不可用时保留已显示内容，不创建第二套持久化历史。取消仍保留已实际输出的部分内容。

- 正式来源由 KnowledgeCapability 返回的知识引用、当前版本及原文依据决定；正文中的业务编号和模型自行取的名称不是正式引用身份。
- 引用存在、原文匹配与“原文支持这项结论”是不同检查，不能只靠ID存在或关键词命中宣称有依据。
- `complete` / `next_cursor` 只描述本次绑定读取范围；证据足够回答不等于读完全部引用材料，更不等于读完项目知识库。
- Trace 上传状态 `completed` 表示上传完成；运行是否完成、失败或取消，应查看运行终态及对应事件，不混用两者。
- 正式来源绑定校验、范围覆盖展示与生成文本中的夸大声明仍需单独验收。本次客户端交接修复没有实现这些新能力，也没有启用实验段落界标或读取状态摘要。

## 重启与崩溃恢复

Main 会在 `userData/vibe-agent/runs/<run_id>/descriptor.json` 保存不含凭据的运行描述：
Provider key、Provider headers、登录 token、Cookie 和一次性票据永不落盘。首次认证取配置前先保存
用户请求和运行身份；此时允许缺省 `provider_mode`，Main 认证注入后仍严格要求 `direct`。
新描述带 `recovery_version: 1`；认证有效时可恢复配置获取和模型暂时故障，旧描述不自动复活。
完整 `interaction_request` 会恢复原确认卡；尚未确认的操作不会自动执行。

用户作答后保存 `response_in_flight`。知识确认响应丢失时，只沿同一确认 ID、用户选择和幂等键
重试取回事务结果，业务失败及权限拒绝不自动重试；普通反问与任意工具不套用此规则。
已知结果保存为 `resume_ready`；冷恢复重新认证并打开原 Pi Session，补入结果而不创建新写入。
若退出时 SDK 留下同一工具调用的 `operation_aborted` 占位，且后面仅有空错误消息，沿原生
Session 分支从占位前接入正式回执；旧日志保留，已有成功结果或后续有效消息不会被替换。
未知工具副作用保留为待处理状态，不盲目重放。普通退出保留任务；主动停止不会自动续跑，
后续用户消息仍由 Agent 根据历史决定如何继续。删除会话及登出遵守现有清理边界。
任务恢复与 Trace 上传分离，上传失败不决定任务成功或失败。

## 打包布局

打包版只把 `runtime/` 解到 `app.asar.unpacked`，便于 Electron 以独立子进程执行；Pi
官方依赖仍在 `app.asar` 内。Main 会把受信任的 `app.asar` 根路径传给 runner，runner
按官方 `exports` 解析为绝对路径，因此不依赖 ESM 不支持的 `NODE_PATH`，也不需要把
整棵 `node_modules` 解包。
这里的“原始附件不上传”指不创建服务端附件资源、不把文件本体送入 Knowledge Tool；
为便于排障，Pi 实际读入上下文的附件片段可能随 Trace payload 上传。若未来要求连
Trace 也不携带附件正文，需要另设 local-only Trace 投影。
