/**
 * VS Code Dark+ 风格主题定义
 */
export function defineVscodeDarkTheme(monaco: any) {
  monaco.editor.defineTheme('ast-vscode-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'keyword.flow', foreground: 'C586C0' },

      // 字符串
      { token: 'string', foreground: 'CE9178' },
      { token: 'string.escape', foreground: 'D7BA7D' },
      { token: 'string.invalid', foreground: 'F44747' },

      // 数字
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'number.float', foreground: 'B5CEA8' },
      { token: 'number.hex', foreground: 'B5CEA8' },
      { token: 'number.octal', foreground: 'B5CEA8' },
      { token: 'number.binary', foreground: 'B5CEA8' },

      // 类型 & 标识符
      { token: 'type', foreground: '4EC9B0' },
      { token: 'type.identifier', foreground: '4EC9B0' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'variable', foreground: '9CDCFE' },

      // 函数 & 装饰器
      { token: 'predefined', foreground: 'DCDCAA' },
      { token: 'annotation', foreground: 'DCDCAA' },
      { token: 'tag', foreground: 'DCDCAA' },

      // 分隔符 & 括号（彩色括号）
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'delimiter.bracket', foreground: 'FFD700' },
      { token: 'delimiter.parenthesis', foreground: 'DA70D6' },
      { token: 'delimiter.square', foreground: '179FFF' },
      { token: 'delimiter.curly', foreground: 'FFD700' },
      // f-string 花括号 — 醒目的蓝绿色
      { token: 'delimiter.bracket.fstring', foreground: '56B6C2', fontStyle: 'bold' },

      // 操作符
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'operator.scss', foreground: 'D4D4D4' },

      // 正则
      { token: 'regexp', foreground: 'D16969' },

      // 常量
      { token: 'constant', foreground: '569CD6' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorCursor.foreground': '#AEAFAD',
      'editor.lineHighlightBackground': '#2A2D2E',
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
      'editorIndentGuide.background1': '#404040',
      'editorIndentGuide.activeBackground1': '#707070',
      'editorBracketMatch.background': '#0064001A',
      'editorBracketMatch.border': '#888888',
      'editorOverviewRuler.border': '#00000000',
      'scrollbarSlider.background': '#79797966',
      'scrollbarSlider.hoverBackground': '#646464B3',
      'scrollbarSlider.activeBackground': '#BFBFBF66',
      'editorGutter.background': '#1E1E1E',
      'minimap.background': '#1E1E1E',
    },
  });
}

export const EDITOR_FONT_FAMILY = "Menlo, Monaco, 'Courier New', monospace";
