/**
 * 补全注册入口 — 根据语言组合不同补全 Provider
 */
import { createPythonBaseCompletions } from './pythonBase';
import { getBusinessAtSuggestions } from './businessAt';

export interface CompletionRegisterOptions {
  language: string;
  enableBusiness: boolean;
}

/**
 * 注册补全并返回 disposable 列表
 */
export function registerCompletions(
  monaco: any,
  options: CompletionRegisterOptions
): any[] {
  const disposables: any[] = [];

  if (options.language === 'python') {
    disposables.push(registerPythonCompletions(monaco, options.enableBusiness));
  }

  return disposables;
}

function registerPythonCompletions(monaco: any, enableBusiness: boolean): any {
  const { keywords, builtins, snippets, Kind } = createPythonBaseCompletions(monaco);

  return monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.', '_'],
    provideCompletionItems(model: any, position: any) {
      const lineContent = model.getLineContent(position.lineNumber);
      const textUntilPosition = lineContent.substring(0, position.column - 1);

      // at.* 业务补全优先
      if (enableBusiness) {
        const bizResult = getBusinessAtSuggestions(monaco, textUntilPosition);
        if (bizResult) return bizResult;
      }

      // 通用 Python 补全
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: any[] = [];

      for (const kw of keywords) {
        suggestions.push({
          label: kw,
          kind: Kind.Keyword,
          insertText: kw,
          range,
          detail: 'keyword',
        });
      }

      // 内建函数需要补充括号
      const callableBuiltins = new Set([
        'print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict',
        'set', 'tuple', 'bool', 'type', 'isinstance', 'issubclass',
        'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed',
        'abs', 'max', 'min', 'sum', 'round', 'pow', 'divmod',
        'input', 'open', 'repr', 'id', 'hash', 'callable', 'getattr',
        'setattr', 'hasattr', 'delattr', 'vars', 'dir', 'globals', 'locals',
        'super', 'property', 'staticmethod', 'classmethod',
      ]);

      for (const b of builtins) {
        if (callableBuiltins.has(b)) {
          suggestions.push({
            label: b,
            kind: Kind.Function,
            insertText: `${b}(\${1:})`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: 'builtin',
          });
        } else {
          suggestions.push({
            label: b,
            kind: Kind.Function,
            insertText: b,
            range,
            detail: 'builtin',
          });
        }
      }

      for (const s of snippets) {
        suggestions.push({
          label: s.label,
          kind: Kind.Snippet,
          insertText: s.insert,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          detail: s.doc,
          documentation: s.doc,
        });
      }

      return { suggestions };
    },
  });
}
