# 思维导图 MCP 文件转换

从 Mind MCP 0.8.0（capabilityRevision 16）开始，公开工具由 18 个增加到 20 个。桌面应用需要运行，但转换不要求打开导图窗口，也不会弹出保存对话框。

## 使用方式

用户可以直接说：“把这个 XMind 转成 amind，放到同一个文件夹”，或“把这份 amind 转成 XMind 给同事”。Agent 根据文件方向选择工具，无需让用户记住工具名。

| 公开工具 | 方向 |
| --- | --- |
| `mind_convert_xmind_to_amind` | XMind → amind |
| `mind_convert_amind_to_xmind` | amind → XMind |

两个工具参数一致：

| 参数 | 约束 |
| --- | --- |
| `sourceFilePath` | 必填，现有源文件的绝对路径，扩展名与方向一致 |
| `outputFilePath` | 必填，输出文件的绝对路径，扩展名与方向一致；父目录必须存在 |
| `overwrite` | 可选布尔值，默认 `false`；覆盖现有文件时需明确传入 `true` |

本地读取、解析、转换和写入均不联网。转换保留源文件；不允许源、目标指向同一文件，包括硬链接或符号链接别名。输出路径本身不能是符号链接。

源文档已打开时，只读取磁盘上已保存的版本，并返回 `SOURCE_DISK_VERSION` 提示；不自动保存或关闭文档。目标文档已经在 AsyncTest 打开时，即便 `overwrite=true` 也拒绝覆盖。由 XMind 导入、尚未保存为 amind 的窗口也保留来源路径，防止覆盖其来源文件。

## 返回结果与慢操作

成功返回 `ok`、`operationId`、实际源/目标路径、源/目标格式、`sourceVersion: disk`、源文件 SHA-256、`saved` 和 `warnings`。统计包含：

- `boardCount`：画板数；不再限制为三个。
- `nodeCount`：全部主题节点数，包括根主题、普通主题、自由主题和概要主题。
- `noteCount`、`imageCount`、`collapsedNodeCount`：含备注、图片和折叠的节点数。
- `priorityCounts`：按优先级分别统计；`taskMarkerCount`：任务进度标记数。

这些数量不推断业务用例数。Agent 应向用户说明 warnings，不能把“转换完成”说成所有样式完全一致。

慢调用或响应丢失时，调用 `mind_get_operation_status({ outputFilePath })`；已拿到操作编号也可使用 `{ operationId }`。状态沿用 `inProgress`、`terminal`、`health`、`agentAction`、`retryAllowed`，完成后可读取 `result`。`inProgress=true` 时禁止重复写入。相同目标正在转换时返回 `OPERATION_IN_PROGRESS`。

状态保存在当前桌面进程中，最多保留最近 100 条终态记录；应用重启或记录过期后查询返回 `TRANSACTION_NOT_FOUND`。此时应先检查输出文件，不能把“查不到状态”当作可以重试的依据。

转换使用现有 MCP 业务桥、连接控制、错误协议和操作管理器。退出控制会阻止新调用，并在提交输出前取消在途转换；立即恢复控制也不会重放旧任务。转换中的状态提示提供“退出控制”，不锁住导图编辑。

## 内容与兼容性

- 双向转换保留正文、空标题、换行、层级和顺序、纯文本备注、支持的优先级/任务标记、折叠、主题图片、多画板及常见概要/关系。
- XMind 的 `content.json` 和旧版 `content.xml` 都包含真实主题树；旧版 XML 同样包含备注、标记、标签、图片和关系。
- 密级在 XMind 中以标签显示，并通过扩展保留结构信息，回转时恢复。不会额外制造密级主题、干扰节点统计。
- amind 的内嵌图片和 `assets` 图片会写入 XMind 资源包；XMind 图片写入 amind 后不依赖原文件。
- XMind 富文本备注在 AsyncTest 中显示为纯文本，原备注结构保留供再次导出；修改正文后不会重新带回旧备注。
- 布局、字体、主题及部分自定义标记不保证等价显示。可保留的扩展会存入文件，并返回具体 warnings；未映射字段明确报告。
- 当前不支持的多图/旧式图片数组、缺失图片、旧版 XML 只有富文本而没有纯文本的备注、嵌入文件附件链接，以及损坏树结构，会停止转换并返回错误，避免无提示丢失内容。
- 本机文件转换不检查其它应用是否打开目标文件；AsyncTest 打开的目标会受到保护。覆盖模式会在最终替换前复查文件身份及修改时间。

实现复用 `xmindFileService.node.js` 和 `amindFileService.node.js`；新增 `mindFileConversion.node.js` 只负责文件边界、控制、写入和统计。输出先写同目录临时文件，再原子提交；默认模式通过文件系统 no-clobber 操作避免抢占覆盖。

格式依据：[XMind 官方 topic 模型](https://github.com/xmindltd/xmind-model/blob/master/schemas/topic.json)、[官方 notes 模型](https://github.com/xmindltd/xmind-model/blob/master/schemas/notes.json)、[旧版备注读写实现](https://github.com/xmindltd/xmind-sdk-python/blob/master/xmind/core/notes.py)。测试和验收文件位于外置测试框架及数据目录，产品仓库不保存样本。
