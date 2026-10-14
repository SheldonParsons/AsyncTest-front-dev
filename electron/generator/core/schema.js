// Shared by Main, the renderer and stdio. No network or Electron dependency.
export const REPORT_VERSION = '1.0.0';
export const PARSER_VERSION = 'report-2';
export const scopeKeys = ['productId', 'projectId', 'executionId', 'testTaskId', 'buildId'];
export const descendants = { productId: ['projectId', 'executionId', 'testTaskId', 'buildId'], projectId: ['executionId', 'buildId'], executionId: ['buildId'] };
export const str = { type: 'string' };
export const id = { type: 'string', minLength: 1, maxLength: 512, pattern: '^(?!__proto__$|constructor$|prototype$)[^\\u0000-\\u001f]+$' };
export const bool = { type: 'boolean' };
export const integer = { type: 'integer', minimum: 0 };
export const list = (items = str) => ({ type: 'array', items, maxItems: 1000 });
export const enumeration = (...values) => ({ type: 'string', enum: values });
export const object = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
export const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
export const environmentFields = {
  enabled: bool, name: str, bugFilterKeyword: { ...str, description: '英文逗号分隔，不区分大小写；任一包含词命中。空串不命中任何缺陷，沿用原统计口径。' }, bugExcludeKeyword: str,
  bugRange: enumeration('version', 'execution'), filterBugWithoutSolution: bool,
  includeDate: bool, reportDate: str, envUrl: str, gitlabUrl: str, conclusion: str, projectRisk: str,
};
export const customFields = { zendaoBugLimit: { type: 'integer', minimum: 1, maximum: 100000 }, qualityResult: str, secrecyLevel: str, testTypes: str, actualResult: str };
export const formFields = Object.fromEntries(['reporter', 'reviewer', 'zentaoUsername', 'asyncTestProjectId', ...scopeKeys].map(key => [key, str]));
export const settingsPatch = object({ ...formFields, zentaoPassword: nullable(str), customFields: object(customFields) });
export const environmentOperation = { anyOf: [
  object({ op: enumeration('add'), id, values: object(environmentFields) }, ['op', 'id', 'values']),
  object({ op: enumeration('update'), id, patch: object(environmentFields) }, ['op', 'id', 'patch']),
  object({ op: enumeration('remove'), id }, ['op', 'id']),
] };
export const rowFilterSchema = nullable(object({ column: id, operator: enumeration('eq'), value: nullable(str) }, ['column', 'value']));
export const mappingSchema = object({ requirement: str, module: str, owner: str });
export const assignmentSchema = object({ selectedSheet: id, columnMapping: mappingSchema, rowFilter: rowFilterSchema, excludedModules: list(), excludedOwners: list() });
export const styleSchema = object({ fontFamily: str, size: { type: 'number', minimum: 8, maximum: 144 }, bold: bool, italic: bool, align: enumeration('left', 'center', 'right', 'both'), spacingBefore: integer, spacingAfter: integer, width: integer, gridSpan: { type: 'integer', minimum: 1 }, vMerge: enumeration('restart', 'continue'), border: enumeration('single', 'nil'), columnWidths: list(integer) });
export const cellSchema = object({ id, content: str, style: styleSchema, visible: bool, attachment: str }, ['id', 'content']);
export const rowSchema = object({ id, cells: list(cellSchema), visible: bool }, ['id', 'cells']);
export const blockSchema = object({ id, type: enumeration('heading', 'paragraph', 'list', 'keyValueTable', 'table', 'attachment', 'pageBreak'), content: str, items: list(), rows: list(rowSchema), style: styleSchema, visible: bool, assetId: str, attachment: str, level: { type: 'integer', minimum: 1, maximum: 6 } }, ['id', 'type']);
export const pageSchema = object({ width: { type: 'integer', minimum: 3000, maximum: 31680 }, height: { type: 'integer', minimum: 3000, maximum: 31680 }, marginTop: integer, marginBottom: integer, marginLeft: integer, marginRight: integer });
export const documentOperation = { anyOf: [
  object({ op: enumeration('insert_block'), block: blockSchema, afterId: nullable(id) }, ['op', 'block']),
  object({ op: enumeration('update_block'), blockId: id, patch: object(Object.fromEntries(Object.entries(blockSchema.properties).filter(([k]) => !['id', 'type'].includes(k)))) }, ['op', 'blockId', 'patch']),
  object({ op: enumeration('remove_block', 'restore_auto'), blockId: id }, ['op', 'blockId']),
  object({ op: enumeration('move_block'), blockId: id, afterId: nullable(id) }, ['op', 'blockId', 'afterId']),
  object({ op: enumeration('set_cell'), blockId: id, rowId: id, cellId: id, patch: object({ content: str, style: styleSchema, visible: bool, attachment: str }) }, ['op', 'blockId', 'rowId', 'cellId', 'patch']),
  object({ op: enumeration('insert_row'), blockId: id, row: rowSchema, afterId: nullable(id) }, ['op', 'blockId', 'row']),
  object({ op: enumeration('remove_row'), blockId: id, rowId: id }, ['op', 'blockId', 'rowId']),
  object({ op: enumeration('insert_column'), blockId: id, columnId: id, afterCellId: nullable(id), content: str, width: integer }, ['op', 'blockId', 'columnId']),
  object({ op: enumeration('remove_column'), blockId: id, cellId: id }, ['op', 'blockId', 'cellId']),
  object({ op: enumeration('merge_cells'), blockId: id, rowIds: list(id), cellIds: list(id) }, ['op', 'blockId', 'rowIds', 'cellIds']),
  object({ op: enumeration('replace_text'), blockId: id, find: id, replacement: str }, ['op', 'blockId', 'find', 'replacement']),
  object({ op: enumeration('set_page'), patch: pageSchema }, ['op', 'patch']),
] };
const names = { asyncTestProjectId: 'AsyncTest 来源项目', reporter: '报告人', reviewer: '复审人', zentaoUsername: '禅道账号', zentaoPassword: '禅道密码（只写）', productId: '产品', projectId: '项目', executionId: '执行', testTaskId: '测试单', buildId: '所属执行版本', enabled: '启用环境', name: '环境名称', bugFilterKeyword: '缺陷包含关键字', bugExcludeKeyword: '缺陷排除关键字', bugRange: '缺陷范围', filterBugWithoutSolution: '排除未解决缺陷', includeDate: '指定日期', reportDate: '报告日期', envUrl: '环境地址', gitlabUrl: 'GitLab 地址', conclusion: '测试结论', projectRisk: '项目风险', zendaoBugLimit: '缺陷采集上限', qualityResult: '质检结果', secrecyLevel: '秘密级别', testTypes: '测试类型', actualResult: '实际结果', selectedSheet: '工作表', requirement: '需求列', module: '模块列', owner: '负责人列', column: '筛选列', value: '等于值', rowFilter: '行筛选', docxFileType: '附件格式', excludedModules: '排除模块', excludedOwners: '排除负责人', includeFreeNodes: '包含自由节点', selectedBoardIds: '选中画板' };
export function getConfigSchema() {
  return {
    version: REPORT_VERSION, settings: settingsPatch, environmentOperations: environmentOperation, assignment: assignmentSchema, document: blockSchema, documentOperations: documentOperation,
    fields: [
      ...Object.entries(settingsPatch.properties).filter(([k]) => k !== 'customFields').map(([path, schema]) => ({ path, schema, scope: ['defaults', 'workspace', 'defaults_and_workspace'] })),
      ...Object.entries(environmentFields).map(([k, schema]) => ({ path: `environments.{id}.${k}`, schema, scope: ['defaults', 'workspace', 'defaults_and_workspace'] })),
      ...Object.entries(customFields).map(([k, schema]) => ({ path: `customFields.${k}`, schema, scope: ['defaults', 'workspace', 'defaults_and_workspace'] })),
      ...Object.entries(assignmentSchema.properties).flatMap(([k, schema]) => { const nested = schema.properties || schema.anyOf?.find(item => item.type === 'object')?.properties; return nested ? Object.entries(nested).filter(([key]) => key !== 'operator').map(([key, child]) => ({ path: `sources.{id}.assignment.${k}.${key}`, schema: child, scope: ['workspace'] })) : [{ path: `sources.{id}.assignment.${k}`, schema, scope: ['workspace'] }]; }),
      ...Object.entries({ selectedBoardIds: list(id), includeFreeNodes: bool, docxFileType: enumeration('amind', 'xmind') }).map(([k, schema]) => ({ path: `sources.{id}.${k}`, schema, scope: ['workspace'] })),
    ].map(field => ({ ...field, label: names[field.path.split('.').at(-1)] || field.path, writable: true, requiredWhen: 'draft permits incomplete values; report_validate returns generation requirements', desktop: field.path, storage: field.path, export: field.path.startsWith('sources.') ? 'snapshot and attachments' : 'ReportDocument bindings' })),
    dependencies: descendants,
  };
}
export function defaultEnvironment(kind, customId) {
  return { id: customId || `generator-fixed-${kind}-environment`, kind, enabled: true, name: kind === 'test' ? '测试环境' : kind === 'production' ? '生产环境' : '', bugFilterKeyword: '', bugExcludeKeyword: '', bugRange: 'version', filterBugWithoutSolution: true, includeDate: false, reportDate: '', envUrl: '', gitlabUrl: '', conclusion: kind === 'test' ? '可提交审核，并发布生产版本' : '测试通过', projectRisk: '暂无' };
}
export function defaultConfig() {
  return { ...Object.fromEntries(Object.keys(formFields).map(key => [key, ''])), environments: [defaultEnvironment('test'), defaultEnvironment('production')], customFields: { zendaoBugLimit: 5000, qualityResult: '通过', secrecyLevel: '秘密▲', testTypes: '功能测试，兼容性测试，易用性测试，回归测试', actualResult: '测试通过率100%' } };
}
export class ReportError extends Error {
  constructor(code, message, details = {}) { super(message); this.code = code; this.details = details; }
}
export function assert(condition, code, message, details) { if (!condition) throw new ReportError(code, message, details); }
export function validateSchema(value, schema, path = '$') {
  if (schema.anyOf) {
    if (schema.anyOf.some(option => { try { validateSchema(value, option, path); return true; } catch { return false; } })) return;
    throw new ReportError('INVALID_PARAMS', `${path} 不符合允许的参数结构`);
  }
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  assert(schema.type === type || schema.type === 'integer' && Number.isSafeInteger(value), 'INVALID_PARAMS', `${path} 类型应为 ${schema.type}`);
  if (schema.enum) assert(schema.enum.includes(value), 'INVALID_PARAMS', `${path} 必须为 ${schema.enum.join(' / ')}`);
  if (type === 'object') {
    for (const key of Object.keys(value)) {
      assert(!['__proto__', 'constructor', 'prototype'].includes(key), 'INVALID_PARAMS', '不允许的字段');
      assert(schema.properties?.[key] || schema.additionalProperties !== false, 'INVALID_PARAMS', `${path}.${key} 是未知字段`);
      if (schema.properties?.[key]) validateSchema(value[key], schema.properties[key], `${path}.${key}`);
    }
    for (const key of schema.required || []) assert(Object.hasOwn(value, key), 'INVALID_PARAMS', `${path}.${key} 必填`);
  }
  if (type === 'array') { assert(value.length <= (schema.maxItems ?? 10000), 'INVALID_PARAMS', `${path} 条目过多`); value.forEach((item, index) => validateSchema(item, schema.items, `${path}[${index}]`)); }
  if (type === 'string') assert(value.length >= (schema.minLength ?? 0) && value.length <= (schema.maxLength ?? 200000), 'INVALID_PARAMS', `${path} 长度无效`);
  if (type === 'string' && schema.pattern) assert(new RegExp(schema.pattern).test(value), 'INVALID_PARAMS', `${path} 标识无效`);
  if (type === 'number') assert(Number.isFinite(value) && value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity), 'INVALID_PARAMS', `${path} 数值超出范围`);
}
