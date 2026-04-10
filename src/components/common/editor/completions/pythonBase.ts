/**
 * Python 基础补全：关键字 + 内建函数 + 代码片段
 */
export function createPythonBaseCompletions(monaco: any) {
  const Kind = monaco.languages.CompletionItemKind;

  const keywords = [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
    'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
    'try', 'while', 'with', 'yield',
  ];

  const builtins = [
    'print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict',
    'set', 'tuple', 'bool', 'type', 'isinstance', 'issubclass',
    'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed',
    'abs', 'max', 'min', 'sum', 'round', 'pow', 'divmod',
    'input', 'open', 'repr', 'id', 'hash', 'callable', 'getattr',
    'setattr', 'hasattr', 'delattr', 'vars', 'dir', 'globals', 'locals',
    'super', 'property', 'staticmethod', 'classmethod',
    'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError',
    'AttributeError', 'ImportError', 'RuntimeError', 'StopIteration',
    'FileNotFoundError', 'OSError', 'IOError',
  ];

  const snippets: { label: string; insert: string; doc: string }[] = [
    { label: 'def', insert: 'def ${1:function_name}(${2:params}):\n\t${3:pass}', doc: '函数定义' },
    { label: 'class', insert: 'class ${1:ClassName}:\n\t"""${2:docstring}"""\n\n\tdef __init__(self${3:, args}):\n\t\t${4:pass}', doc: '类定义' },
    { label: 'if', insert: 'if ${1:condition}:\n\t${2:pass}', doc: 'if 语句' },
    { label: 'ifelse', insert: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}', doc: 'if-else 语句' },
    { label: 'for', insert: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', doc: 'for 循环' },
    { label: 'while', insert: 'while ${1:condition}:\n\t${2:pass}', doc: 'while 循环' },
    { label: 'try', insert: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:print(e)}', doc: 'try-except' },
    { label: 'tryfinally', insert: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:print(e)}\nfinally:\n\t${4:pass}', doc: 'try-except-finally' },
    { label: 'with', insert: 'with ${1:expression} as ${2:var}:\n\t${3:pass}', doc: 'with 上下文管理器' },
    { label: 'lambda', insert: 'lambda ${1:args}: ${2:expression}', doc: 'lambda 表达式' },
    { label: 'list_comp', insert: '[${1:expr} for ${2:item} in ${3:iterable}]', doc: '列表推导式' },
    { label: 'dict_comp', insert: '{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}', doc: '字典推导式' },
    { label: 'set_comp', insert: '{${1:expr} for ${2:item} in ${3:iterable}}', doc: '集合推导式' },
    { label: 'main', insert: 'if __name__ == "__main__":\n\t${1:pass}', doc: '主入口' },
    { label: 'async_def', insert: 'async def ${1:function_name}(${2:params}):\n\t${3:pass}', doc: '异步函数定义' },
    { label: 'async_for', insert: 'async for ${1:item} in ${2:iterable}:\n\t${3:pass}', doc: '异步 for 循环' },
    { label: 'async_with', insert: 'async with ${1:expression} as ${2:var}:\n\t${3:pass}', doc: '异步上下文管理器' },
    { label: 'dataclass', insert: 'from dataclasses import dataclass\n\n@dataclass\nclass ${1:ClassName}:\n\t${2:field}: ${3:str}', doc: 'dataclass 定义' },
    { label: 'aiohttp_get', insert: 'async with aiohttp.ClientSession() as session:\n\tasync with session.get(\'${1:url}\') as resp:\n\t\t${2:data} = await resp.json()', doc: 'aiohttp GET 请求' },
    { label: 'aiohttp_post', insert: 'async with aiohttp.ClientSession() as session:\n\tasync with session.post(\'${1:url}\', json=${2:payload}) as resp:\n\t\t${3:data} = await resp.json()', doc: 'aiohttp POST 请求' },
  ];

  return { keywords, builtins, snippets, Kind };
}
