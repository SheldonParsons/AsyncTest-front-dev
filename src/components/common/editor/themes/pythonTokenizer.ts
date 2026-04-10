/**
 * 增强版 Python Monarch tokenizer
 * 在 Monaco 0.34.1 内置 tokenizer 基础上增加 f-string 插值高亮
 */

export function registerEnhancedPythonTokenizer(monaco: any) {
  monaco.languages.setMonarchTokensProvider('python', {
    defaultToken: '',
    tokenPostfix: '.python',

    keywords: [
      'False', 'None', 'True', '_',
      'and', 'as', 'assert', 'async', 'await',
      'break', 'case', 'class', 'continue',
      'def', 'del', 'elif', 'else', 'except', 'exec',
      'finally', 'for', 'from', 'global',
      'if', 'import', 'in', 'is', 'lambda',
      'match', 'nonlocal', 'not', 'or',
      'pass', 'raise', 'return',
      'try', 'while', 'with', 'yield',
    ],

    builtins: [
      'abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'bytes',
      'callable', 'chr', 'classmethod', 'compile', 'complex',
      'delattr', 'dict', 'dir', 'divmod', 'enumerate', 'eval',
      'filter', 'float', 'format', 'frozenset',
      'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex',
      'id', 'input', 'int', 'isinstance', 'issubclass', 'iter',
      'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min',
      'next', 'object', 'oct', 'open', 'ord', 'pow', 'print',
      'property', 'range', 'repr', 'reversed', 'round',
      'set', 'setattr', 'slice', 'sorted', 'staticmethod',
      'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip',
      '__import__', '__name__', '__init__', '__dict__',
      '__class__', '__bases__', '__mro__',
    ],

    typeKeywords: [
      'int', 'float', 'complex', 'str', 'bytes', 'bytearray',
      'bool', 'list', 'tuple', 'set', 'frozenset', 'dict',
      'object', 'type', 'None',
    ],

    brackets: [
      { open: '{', close: '}', token: 'delimiter.curly' },
      { open: '[', close: ']', token: 'delimiter.bracket' },
      { open: '(', close: ')', token: 'delimiter.parenthesis' },
    ],

    // 操作符
    operators: [
      '+', '-', '*', '**', '/', '//', '%', '@',
      '<<', '>>', '&', '|', '^', '~', ':=',
      '<', '>', '<=', '>=', '==', '!=',
      '+=', '-=', '*=', '/=', '//=', '%=',
      '**=', '>>=', '<<=', '&=', '|=', '^=', '@=',
    ],

    // 转义序列
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}|N\{[^}]+\}|[0-7]{1,3})/,

    tokenizer: {
      root: [
        { include: '@whitespace' },
        { include: '@numbers' },

        // 装饰器
        [/@[a-zA-Z_]\w*/, 'tag'],

        // f-string (f"...", f'...', F"...", F'...')
        // 三引号优先
        [/[fF][rRbB]?"""/, 'string.quote', '@fstringTripleDbl'],
        [/[fF][rRbB]?'''/, 'string.quote', '@fstringTripleSgl'],
        [/[rRbB]?[fF]"""/, 'string.quote', '@fstringTripleDbl'],
        [/[rRbB]?[fF]'''/, 'string.quote', '@fstringTripleSgl'],
        [/[fF][rRbB]?"/, 'string.quote', '@fstringDbl'],
        [/[fF][rRbB]?'/, 'string.quote', '@fstringSgl'],
        [/[rRbB]?[fF]"/, 'string.quote', '@fstringDbl'],
        [/[rRbB]?[fF]'/, 'string.quote', '@fstringSgl'],

        // 普通三引号字符串
        [/[rRbBuU]?"""/, 'string.quote', '@tripleStringDbl'],
        [/[rRbBuU]?'''/, 'string.quote', '@tripleStringSgl'],

        // 普通字符串
        [/[rRbBuU]?"/, 'string.quote', '@stringDbl'],
        [/[rRbBuU]?'/, 'string.quote', '@stringSgl'],

        // 分隔符 & 括号
        [/[{}()\[\]]/, '@brackets'],
        [/[,:;]/, 'delimiter'],

        // 操作符
        [/[+\-*/%&|^~<>=!:@]+/, {
          cases: {
            '@operators': 'operator',
            '@default': '',
          },
        }],

        // 标识符
        [/[a-zA-Z_]\w*/, {
          cases: {
            'self': 'variable.predefined',
            'cls': 'variable.predefined',
            '@keywords': 'keyword',
            '@builtins': 'predefined',
            '@typeKeywords': 'type',
            '@default': 'identifier',
          },
        }],
      ],

      whitespace: [
        [/\s+/, 'white'],
        [/#.*$/, 'comment'],
      ],

      // ===== 数字 =====
      numbers: [
        [/0[xX][0-9a-fA-F](_?[0-9a-fA-F])*/, 'number.hex'],
        [/0[oO][0-7](_?[0-7])*/, 'number.octal'],
        [/0[bB][01](_?[01])*/, 'number.binary'],
        [/\d[\d_]*\.\d[\d_]*([eE][+-]?\d[\d_]*)?[jJ]?/, 'number.float'],
        [/\d[\d_]*[eE][+-]?\d[\d_]*[jJ]?/, 'number.float'],
        [/\d[\d_]*[jJ]/, 'number.float'],
        [/\d[\d_]*/, 'number'],
      ],

      // ===== 普通字符串 =====
      stringDbl: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string.quote', '@pop'],
      ],
      stringSgl: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string.quote', '@pop'],
      ],
      tripleStringDbl: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"""/, 'string.quote', '@pop'],
        [/"/, 'string'],
      ],
      tripleStringSgl: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'''/, 'string.quote', '@pop'],
        [/'/, 'string'],
      ],

      // ===== f-string =====
      fstringDbl: [
        [/\{\{/, 'string.escape'],        // {{ 转义为字面 {
        [/\}\}/, 'string.escape'],        // }} 转义为字面 }
        [/\{/, { token: 'delimiter.bracket.fstring', next: '@fstringExpr', nextEmbedded: '' }],
        [/[^\\"{}\n]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string.quote', '@pop'],
      ],
      fstringSgl: [
        [/\{\{/, 'string.escape'],
        [/\}\}/, 'string.escape'],
        [/\{/, { token: 'delimiter.bracket.fstring', next: '@fstringExpr', nextEmbedded: '' }],
        [/[^\\'{}]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string.quote', '@pop'],
      ],
      fstringTripleDbl: [
        [/\{\{/, 'string.escape'],
        [/\}\}/, 'string.escape'],
        [/\{/, { token: 'delimiter.bracket.fstring', next: '@fstringExpr', nextEmbedded: '' }],
        [/[^\\"{}\n]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"""/, 'string.quote', '@pop'],
        [/"/, 'string'],
        [/\n/, 'string'],
      ],
      fstringTripleSgl: [
        [/\{\{/, 'string.escape'],
        [/\}\}/, 'string.escape'],
        [/\{/, { token: 'delimiter.bracket.fstring', next: '@fstringExpr', nextEmbedded: '' }],
        [/[^\\'{}]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'''/, 'string.quote', '@pop'],
        [/'/, 'string'],
        [/\n/, 'string'],
      ],

      // f-string 花括号内的表达式
      fstringExpr: [
        [/\}/, { token: 'delimiter.bracket.fstring', next: '@pop' }],
        // 嵌套括号
        [/\{/, 'delimiter.curly', '@fstringNestedBrace'],
        [/\(/, 'delimiter.parenthesis', '@fstringNestedParen'],
        [/\[/, 'delimiter.bracket', '@fstringNestedBracket'],
        // 内部表达式的 token
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@builtins': 'predefined',
            '@default': 'identifier',
          },
        }],
        [/\d[\d_]*(\.\d[\d_]*)?/, 'number'],
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],
        [/[+\-*/%&|^~<>=!:,.]/, 'operator'],
        [/\s+/, 'white'],
      ],
      fstringNestedBrace: [
        [/\}/, 'delimiter.curly', '@pop'],
        { include: '@fstringExpr' },
      ],
      fstringNestedParen: [
        [/\)/, 'delimiter.parenthesis', '@pop'],
        { include: '@fstringExpr' },
      ],
      fstringNestedBracket: [
        [/\]/, 'delimiter.bracket', '@pop'],
        { include: '@fstringExpr' },
      ],
    },
  } as any);
}
