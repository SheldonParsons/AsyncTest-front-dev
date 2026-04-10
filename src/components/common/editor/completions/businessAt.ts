/**
 * at.* 业务补全 — 从 completionProvider.ts 迁移
 * 提供 AsyncTest 平台特有的 at.env / at.request / at.response 等补全
 */

const paramsAtSuggestions = (monaco: any) => [
  {
    label: 'get',
    kind: monaco.languages.CompletionItemKind.Method,
    insertText: "get('${1:}')",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: '获取参数',
  },
  {
    label: 'set',
    kind: monaco.languages.CompletionItemKind.Method,
    insertText: "set('${1:}','')",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: '设置参数',
  },
];

const atSuggestions = (monaco: any) => [
  { label: 'temp', kind: monaco.languages.CompletionItemKind.Property, insertText: 'temp', detail: '临时变量' },
  { label: 'env', kind: monaco.languages.CompletionItemKind.Property, insertText: 'env', detail: '环境变量' },
  { label: 'gv', kind: monaco.languages.CompletionItemKind.Property, insertText: 'gv', detail: '全局变量' },
  { label: 'func', kind: monaco.languages.CompletionItemKind.Method, insertText: 'func', detail: '调用自定义函数类' },
  { label: 'pipeline', kind: monaco.languages.CompletionItemKind.Method, insertText: 'pipeline', detail: '调用管道函数类' },
  { label: 'env_name', kind: monaco.languages.CompletionItemKind.Property, insertText: 'env_name', detail: '当前环境名称' },
  { label: 'AstFile', kind: monaco.languages.CompletionItemKind.Class, insertText: 'AstFile()', detail: '文件操作类' },
  { label: 'AstExcel', kind: monaco.languages.CompletionItemKind.Class, insertText: 'AstExcel()', detail: 'Excel 操作类' },
  { label: 'request', kind: monaco.languages.CompletionItemKind.Property, insertText: 'request', detail: '接口请求内容' },
  { label: 'response', kind: monaco.languages.CompletionItemKind.Property, insertText: 'response', detail: '接口响应内容' },
  { label: 'raise_error', kind: monaco.languages.CompletionItemKind.Method, insertText: 'raise_error()', detail: '抛出错误' },
  { label: 'database', kind: monaco.languages.CompletionItemKind.Property, insertText: 'database', detail: '数据库结果对象' },
  { label: 'DataSet', kind: monaco.languages.CompletionItemKind.Class, insertText: 'DataSet()', detail: '数据库结果对象' },
  { label: 'get_position', kind: monaco.languages.CompletionItemKind.Method, insertText: 'get_position()', detail: '获取当前步骤位置信息' },
  { label: 'get_main_case_index', kind: monaco.languages.CompletionItemKind.Property, insertText: 'get_main_case_index()', detail: '获取主用例位置下标' },
];

const astExcelSuggestions = (monaco: any) => [
  {
    label: 'async_load',
    kind: monaco.languages.CompletionItemKind.Method,
    insertText: "async_load('${1:filename}')",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: "async async_load(self, file, filename='')",
    documentation: { value: '异步函数，异步加载一个 Excel 文件。\n\n参数：\n\tfile — 文件名、BytesIO 对象、或 AstFile 对象\n\tfilename — 文件名，如果 file 为 BytesIO 则必填\n\n返回值：\n\tworkbook Excel 操作对象(openpyxl)', isTrusted: true },
  },
  {
    label: 'async_save',
    kind: monaco.languages.CompletionItemKind.Method,
    insertText: 'async_save()',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'async def async_save(self, cover_file=False)',
    documentation: { value: '异步函数，异步保存 Excel 文件。\n\n参数：\n\tcover_file:bool 是否覆盖原有文件\n\n返回值：\n\tobject_unique_key:str 文件唯一标识符', isTrusted: true },
  },
];

const requestSuggestions = (monaco: any) => [
  { label: 'async_generate_body', kind: monaco.languages.CompletionItemKind.Method, insertText: 'async_generate_body()', detail: '异步函数，获取请求体' },
  { label: 'cover_body', kind: monaco.languages.CompletionItemKind.Method, insertText: 'cover_body()', detail: '覆盖请求体' },
  { label: 'async_update_body_file', kind: monaco.languages.CompletionItemKind.Method, insertText: 'async_update_body_file()', detail: '更新 form-data 结构的请求体中的文件' },
  { label: 'generate_url', kind: monaco.languages.CompletionItemKind.Method, insertText: 'generate_url()', detail: '获取请求 URL' },
  { label: 'cover_url', kind: monaco.languages.CompletionItemKind.Method, insertText: 'cover_url()', detail: '覆盖 URL' },
  { label: 'generate_url_params', kind: monaco.languages.CompletionItemKind.Method, insertText: 'generate_url_params()', detail: '获取 URL 参数' },
  { label: 'cover_url_params', kind: monaco.languages.CompletionItemKind.Method, insertText: 'cover_url_params()', detail: '覆盖 URL 参数' },
  { label: 'generate_headers', kind: monaco.languages.CompletionItemKind.Method, insertText: 'generate_headers()', detail: '获取请求 headers' },
  { label: 'cover_headers', kind: monaco.languages.CompletionItemKind.Method, insertText: 'cover_headers()', detail: '覆盖请求 headers' },
];

const responseSuggestions = (monaco: any) => [
  { label: 'async_body', kind: monaco.languages.CompletionItemKind.Property, insertText: 'async_body', detail: '异步属性，获取响应体' },
  { label: 'async_headers', kind: monaco.languages.CompletionItemKind.Property, insertText: 'async_headers', detail: '异步属性，获取响应 headers' },
  { label: 'async_code', kind: monaco.languages.CompletionItemKind.Property, insertText: 'async_code', detail: '异步属性，获取响应码' },
  { label: 'async_time', kind: monaco.languages.CompletionItemKind.Property, insertText: 'async_time', detail: '异步属性，获取响应时间' },
  { label: 'async_error', kind: monaco.languages.CompletionItemKind.Property, insertText: 'async_error', detail: '异步属性，获取响应错误内容' },
  { label: 'async_json', kind: monaco.languages.CompletionItemKind.Method, insertText: 'async_json()', detail: '异步函数，获取响应体 json 格式' },
  { label: 'async_text', kind: monaco.languages.CompletionItemKind.Method, insertText: 'async_text()', detail: '异步函数，获取响应体字符串' },
];

/**
 * 根据当前输入上下文返回 at.* 业务补全
 * 返回 null 表示不匹配任何 at.* 上下文
 */
export function getBusinessAtSuggestions(
  monaco: any,
  textUntilPosition: string
): { suggestions: any[] } | null {
  if (/at\.AstExcel\(\)\.$/.test(textUntilPosition)) {
    return { suggestions: astExcelSuggestions(monaco) };
  }
  if (/at\.request\.$/.test(textUntilPosition)) {
    return { suggestions: requestSuggestions(monaco) };
  }
  if (/at\.response\.$/.test(textUntilPosition)) {
    return { suggestions: responseSuggestions(monaco) };
  }
  if (/at\.(env|gv|temp)\.$/.test(textUntilPosition)) {
    return { suggestions: paramsAtSuggestions(monaco) };
  }
  if (/at\.$/.test(textUntilPosition)) {
    return { suggestions: atSuggestions(monaco) };
  }
  return null;
}
