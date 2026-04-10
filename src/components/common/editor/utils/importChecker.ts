/**
 * Python import 白名单检查
 * 检测代码中是否使用了非标准库 / 非服务器提供的第三方包
 */

// Python 3.11 标准库模块（常用子集，覆盖绝大多数场景）
const STDLIB_MODULES = new Set([
  // 内建 & 核心
  'abc', 'ast', 'asyncio', 'atexit', 'base64', 'binascii', 'bisect',
  'builtins', 'calendar', 'cgi', 'cgitb', 'cmd', 'code', 'codecs',
  'collections', 'colorsys', 'compileall', 'concurrent', 'configparser',
  'contextlib', 'contextvars', 'copy', 'copyreg', 'cProfile', 'csv',
  'ctypes', 'dataclasses', 'datetime', 'dbm', 'decimal', 'difflib',
  'dis', 'distutils', 'doctest', 'email', 'encodings', 'enum', 'errno',
  'faulthandler', 'fcntl', 'filecmp', 'fileinput', 'fnmatch', 'fractions',
  'ftplib', 'functools', 'gc', 'getopt', 'getpass', 'gettext', 'glob',
  'graphlib', 'grp', 'gzip', 'hashlib', 'heapq', 'hmac', 'html', 'http',
  'idlelib', 'imaplib', 'importlib', 'inspect', 'io', 'ipaddress',
  'itertools', 'json', 'keyword', 'linecache', 'locale', 'logging',
  'lzma', 'mailbox', 'mailcap', 'marshal', 'math', 'mimetypes', 'mmap',
  'modulefinder', 'multiprocessing', 'netrc', 'numbers', 'operator', 'os',
  'pathlib', 'pdb', 'pickle', 'pickletools', 'pipes', 'pkgutil',
  'platform', 'plistlib', 'poplib', 'posix', 'posixpath', 'pprint',
  'profile', 'pstats', 'pty', 'pwd', 'py_compile', 'pyclbr',
  'pydoc', 'queue', 'quopri', 'random', 're', 'readline', 'reprlib',
  'resource', 'rlcompleter', 'runpy', 'sched', 'secrets', 'select',
  'selectors', 'shelve', 'shlex', 'shutil', 'signal', 'site', 'smtpd',
  'smtplib', 'sndhdr', 'socket', 'socketserver', 'sqlite3', 'ssl',
  'stat', 'statistics', 'string', 'stringprep', 'struct', 'subprocess',
  'sunau', 'symtable', 'sys', 'sysconfig', 'syslog', 'tabnanny',
  'tarfile', 'telnetlib', 'tempfile', 'termios', 'test', 'textwrap',
  'threading', 'time', 'timeit', 'tkinter', 'token', 'tokenize',
  'tomllib', 'trace', 'traceback', 'tracemalloc', 'tty', 'turtle',
  'turtledemo', 'types', 'typing', 'unicodedata', 'unittest', 'urllib',
  'uuid', 'venv', 'warnings', 'wave', 'weakref', 'webbrowser',
  'winreg', 'winsound', 'wsgiref', 'xdrlib', 'xml', 'xmlrpc',
  'zipapp', 'zipfile', 'zipimport', 'zlib',
  // 常用子模块前缀
  'os.path', 'collections.abc', 'concurrent.futures', 'email.mime',
  'http.client', 'http.server', 'http.cookies', 'urllib.parse',
  'urllib.request', 'urllib.error', 'xml.etree', 'xml.dom', 'xml.sax',
  'logging.handlers', 'asyncio.tasks', 'typing_extensions',
]);

// 服务器提供的第三方包
const SERVER_THIRD_PARTY = new Set([
  'aiohttp',
]);

// 相对导入 / 当前项目的引用不做检查
const IGNORE_PREFIXES = ['.', '__'];

/** 提取代码中所有顶层 import 的模块名 */
export function extractImports(code: string): { module: string; line: number }[] {
  const results: { module: string; line: number }[] = [];
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // import xxx / import xxx as yyy
    let m = line.match(/^import\s+([\w.]+)/);
    if (m) {
      results.push({ module: m[1], line: i + 1 });
      continue;
    }
    // from xxx import yyy
    m = line.match(/^from\s+([\w.]+)\s+import/);
    if (m) {
      results.push({ module: m[1], line: i + 1 });
    }
  }
  return results;
}

/** 判断模块是否在白名单内 */
export function isAllowedModule(moduleName: string): boolean {
  if (IGNORE_PREFIXES.some((p) => moduleName.startsWith(p))) return true;
  const root = moduleName.split('.')[0];
  return STDLIB_MODULES.has(root) || STDLIB_MODULES.has(moduleName) || SERVER_THIRD_PARTY.has(root);
}

/** 检查代码，返回不在白名单内的 import */
export function checkImports(code: string): { module: string; line: number }[] {
  return extractImports(code).filter((item) => !isAllowedModule(item.module));
}

/**
 * 为 Monaco 编辑器设置 import 警告 markers
 */
export function applyImportWarnings(monaco: any, model: any, code: string) {
  const violations = checkImports(code);
  const markers = violations.map((v) => {
    const lineContent = model.getLineContent(v.line);
    return {
      severity: monaco.MarkerSeverity.Warning,
      message: `「${v.module}」不在服务器白名单中，最终代码请勿使用第三方包。如需此包请联系管理员。`,
      startLineNumber: v.line,
      endLineNumber: v.line,
      startColumn: 1,
      endColumn: lineContent.length + 1,
    };
  });
  monaco.editor.setModelMarkers(model, 'import-checker', markers);
}
