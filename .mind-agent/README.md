# Mind Agent 开发桥接

让外部 Agent 把"测试用例"指令写进思维导图，开发者在 dev 窗口实时看到逐个节点生成。

## 工作方式

```
Agent 写入 .mind-agent/ops.jsonl
        │
        ▼
vite/mindAgentPlugin.ts （dev 插件，监听文件）
        │  HMR 自定义事件 mind-agent:ops
        ▼
src/mind/dev/agentBridge.ts （仅 dev 加载）
        │  调用现有命令系统（executeCommand）
        ▼
思维导图窗口：节点逐个动画式出现，支持撤销/重做
```

仅在 `yarn dev` / `yarn dev:ssr`（dev server）下生效，生产构建不包含。

## 指令格式（JSON Lines，每行一条）

文件：`.mind-agent/ops.jsonl`

```jsonc
// 每轮生成以 reset 开头，runId 变化即清空上一轮的引用映射
{"op":"reset","runId":"2026-06-16-1"}

// 新增节点：ref 是本轮自定义的稳定标识；parent 用 "$root" 或上面定义过的 ref
{"op":"node","ref":"m1","parent":"$root","text":"登录模块"}
{"op":"node","ref":"f1","parent":"m1","text":"手机号验证码登录"}
{"op":"node","ref":"c1","parent":"f1","text":"正常登录：验证码正确"}
{"op":"node","ref":"c1s","parent":"c1","text":"步骤：输入正确验证码→点击登录"}
{"op":"node","ref":"c1e","parent":"c1","text":"预期：登录成功并跳转首页"}

// 连线（两节点间关联，端点用 ref）
{"op":"relation","from":"c1","to":"f1"}

// 保存为本地 .amind
{"op":"save"}
```

### 字段说明

| op         | 字段                              | 说明                                   |
|------------|-----------------------------------|----------------------------------------|
| `reset`    | `runId`                           | 新一轮开始；runId 变化则清空 ref 映射  |
| `node`     | `ref` `parent` `text` `style?`    | 新增子节点；`parent` 为 `$root` 或已有 ref |
| `relation` | `from` `to` `label?`              | 两节点连线（label 暂未渲染，预留）     |
| `save`     | —                                 | 保存当前文档                           |

- `$root` 指向当前导图主根节点。
- `style` 字段已预留，样式预设会在对齐你的用例风格后补充。
- 节点逐条生成，默认间隔 200ms（见 agentBridge.ts 的 `DEFAULT_STEP_DELAY`）。

## 使用步骤

1. `yarn dev` 启动开发服务器，在 Electron dev 窗口打开思维导图（`/mind`）。
2. 控制台出现 `[mind-agent] 桥接已就绪…` 即连接成功。
3. Agent 向 `.mind-agent/ops.jsonl` 写入指令 → 窗口里实时生成。
4. 想重新开始：换一个 `runId` 即可（或清空文件）。

可参考同目录 `ops.example.jsonl`。
