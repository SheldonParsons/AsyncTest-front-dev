import { object, str, id, bool, integer, list, enumeration, nullable, settingsPatch, environmentOperation, assignmentSchema, documentOperation, validateSchema } from '../generator/core/schema.js';

const revisions = object({ settings: integer, workspace: integer, document: integer });
const context = { workspaceId: id };
const write = { ...context, requestId: id, expectedRevisions: revisions };
const pagination = { cursor: str, limit: { type: 'integer', minimum: 1, maximum: 100 } };
const policy = object({ mode: enumeration('refresh', 'cached', 'snapshot'), snapshotId: id, acceptSnapshotDifferences: bool, allowIncomplete: bool }, ['mode']);
const sourceInput = { anyOf: [object({ localPath: id, role: enumeration('amind', 'assignment') }, ['localPath']), object({ entryHandle: id, role: enumeration('amind', 'assignment') }, ['entryHandle'])] };
const sourceOperation = { anyOf: [
  object({ op: enumeration('detach', 'activate_assignment', 'refresh'), sourceId: id }, ['op', 'sourceId']),
  object({ op: enumeration('set_boards'), sourceId: id, selectedBoardIds: list(id) }, ['op', 'sourceId', 'selectedBoardIds']),
  object({ op: enumeration('set_free_nodes'), sourceId: id, includeFreeNodes: bool }, ['op', 'sourceId', 'includeFreeNodes']),
  object({ op: enumeration('set_attachment_format'), sourceId: id, docxFileType: enumeration('amind', 'xmind') }, ['op', 'sourceId', 'docxFileType']),
] };
const outputSchema = { type: 'object', properties: { ok: bool, status: str, summary: str, data: { type: 'object' }, issues: list({ type: 'object' }), nextActions: list(str), operationId: nullable(str) }, required: ['ok', 'status', 'summary'] };
const define = (name, description, properties, required = [], writable = false) => ({ name: `report_${name}`, description, inputSchema: object(properties, required), outputSchema, annotations: { readOnlyHint: !writable, destructiveHint: false, idempotentHint: true, openWorldHint: /query_scope|connection|entries|import|generate/.test(name) } });
export const REPORT_TOOLS = [
  define('get_context', '首次调用：离线读取实例、共享默认、有效配置、草稿和缺项。密码只返回已配置。', { ...context, include: list(enumeration('settings', 'sources', 'snapshots', 'documents', 'operations')) }),
  define('get_schema', '按需查看完整字段和可用正文操作。普通修改写 defaults；这次/这份写 workspace。', { section: enumeration('all', 'settings', 'sources', 'document', 'fields') }),
  define('manage_workspace', '列出、继续、新建、复制或归档草稿。open 只绑定当前会话；写操作需要版本和 requestId。', { ...write, operation: enumeration('list', 'create', 'open', 'fork', 'archive'), name: str, sourceWorkspaceId: id, ...pagination }, ['operation'], true),
  define('update_settings', '字段补丁原子保存。默认与草稿可单独修改。范围先校验归属；改变上游清理下游。', { ...write, target: enumeration('defaults', 'workspace', 'defaults_and_workspace'), patch: settingsPatch, environmentOperations: list(environmentOperation), unset: list(id) }, ['workspaceId', 'requestId', 'expectedRevisions', 'target'], true),
  define('test_connection', '验证禅道连接或 AsyncTest 登录。不返回密码或 token。', { ...context, provider: enumeration('zentao', 'asynctest'), profileId: id }, ['provider']),
  define('query_scope', '逐级读取产品、项目、执行、产品测试单、执行版本。名称歧义返回候选；查询不选中。', { ...context, entity: enumeration('products', 'projects', 'executions', 'testTasks', 'builds'), parent: object({ productId: id, projectId: id, executionId: id }), query: str, status: str, readPolicy: enumeration('online', 'cached'), ...pagination }, ['entity', 'readPolicy']),
  define('list_source_entries', '列用户指定本机目录或 AsyncTest 文件目录 URL；只列当前层，不下载。返回可导入句柄。', { folderUrl: id, localDirectory: id, ...pagination }),
  define('import_sources', '将明确文件复制到本机资产库并解析，原子附加。相同内容去重；多份 Excel 保留候选。', { ...write, sources: list(sourceInput), allowPartial: bool }, ['workspaceId', 'requestId', 'expectedRevisions', 'sources'], true),
  define('update_sources', '移除引用、激活分配表、显式刷新文件、选择画板/自由节点/附件格式；原件和历史不删除。', { ...write, operations: list(sourceOperation) }, ['workspaceId', 'requestId', 'expectedRevisions', 'operations'], true),
  define('inspect_source', '按版本预览本地来源内容；值候选独立于当前等于条件。默认20条，最多100条。', { ...context, sourceId: id, view: enumeration('summary', 'outline', 'subtree', 'search', 'sheets', 'columns', 'values', 'rows'), boardId: id, nodeId: id, query: str, status: enumeration('passed', 'failed', 'pending', 'reused'), column: id, ...pagination }, ['sourceId', 'view']),
  define('configure_assignment', '设置活动表的工作表、列映射、等于条件和排除项。value:null未选、空串筛空值；切表清筛选。', { ...write, sourceId: id, parseRevision: integer, patch: assignmentSchema }, ['workspaceId', 'requestId', 'expectedRevisions', 'sourceId', 'parseRevision', 'patch'], true),
  define('validate', '离线检查配置或冻结报告缺项；不联网、不生成。', { ...context, reportIds: list(id), dataPolicy: policy, mode: enumeration('configuration', 'export') }),
  define('generate', '冻结输入并异步生成。refresh 自动分页读取全部禅道缺陷，无需设置采集上限。必须显式 refresh/cached/snapshot；之后用 get_operation 查询，未知结果勿重发新请求。', { ...write, dataPolicy: policy, environmentIds: list(id), output: enumeration('draft', 'docx', 'zip') }, ['workspaceId', 'requestId', 'expectedRevisions', 'dataPolicy', 'output'], true),
  define('read_document', '读取报告大纲或所需块；同时返回自动值和手工覆盖标记。', { reportId: id, revision: integer, view: enumeration('outline', 'blocks', 'search', 'full'), blockIds: list(id), query: str, ...pagination }, ['reportId']),
  define('edit_document', '原子编辑文字、表格、顺序、附件和排版，支持恢复自动值。saveAsDefaultTemplate仅在用户明确要求以后这样时使用。', { ...write, reportIds: list(id), documentRevisions: list(object({ reportId: id, revision: integer }, ['reportId', 'revision'])), operations: list(documentOperation), saveAsDefaultTemplate: bool }, ['workspaceId', 'requestId', 'expectedRevisions', 'reportIds', 'documentRevisions', 'operations'], true),
  define('export', '仅本地导出冻结正文，或另存已有产物；不重新采集。已存在路径默认不覆盖。', { ...write, reports: list(object({ reportId: id, revision: integer }, ['reportId', 'revision'])), format: enumeration('docx', 'zip'), artifactId: id, destinationPath: id, overwrite: bool }, ['workspaceId', 'requestId', 'expectedRevisions'], true),
  define('get_operation', '按作业或请求ID读取真实进度及增量事件；跨会话恢复。', { operationId: id, requestId: id, afterEvent: integer }),
  define('cancel_operation', '取消尚未完成的作业，成功终态不会被改成取消。', { ...write, operationId: id }, ['workspaceId', 'requestId', 'expectedRevisions', 'operationId'], true),
  define('list_history', '分页读取导出或字段修改记录，以及快照版本/采集时间。', { ...context, kind: enumeration('exports', 'changes'), ...pagination }),
  define('restore_change', '反向恢复指定修改；之后同字段变化则冲突，不回滚整份草稿。', { ...write, changeId: id }, ['workspaceId', 'requestId', 'expectedRevisions', 'changeId'], true),
  define('control', '查看或释放当前会话控制；桌面停止后只能申请恢复，由桌面实际恢复。', { action: enumeration('status', 'release', 'request_restore'), requestId: id }, ['action'], true),
];
export function validateTool(name, args) { const tool = REPORT_TOOLS.find(item => item.name === name); if (!tool) throw Object.assign(new Error('未知报告工具'), { code: 'METHOD_NOT_FOUND' }); validateSchema(args, tool.inputSchema); return tool; }
