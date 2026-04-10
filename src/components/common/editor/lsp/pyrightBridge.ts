/**
 * Pyright LSP 桥接 — 渲染进程侧
 *
 * 通过 window.electronAPI IPC 与 main 进程的 pyright-langserver 通信，
 * 并将 LSP 能力注册为 Monaco providers。
 *
 * 仅在 Electron 环境下加载。
 */
import { isElectron } from '../utils/envDetect';

const VIRTUAL_URI = 'file:///workspace/asyncexecutor.py';

/**
 * 注入给 Pyright 的前置声明：让 `at` 作为 Any 类型被识别，
 * 避免服务器内置上下文变量 at.xxx 产生红色下划线。
 */
const AT_PREAMBLE = 'from typing import Any as _Any\nat: _Any = ...\n';
const PREAMBLE_LINES = 2;

function withPreamble(code: string): string {
  return AT_PREAMBLE + code;
}

interface LspBridgeOptions {
  monaco: any;
  model: any;
  language: string;
  onDiagnostics?: (markers: any[]) => void;
}

let documentVersion = 0;
let unsubNotification: (() => void) | null = null;

function getApi(): any {
  return (window as any).electronAPI;
}

/**
 * 启动 LSP 桥接：初始化服务、打开文档、注册 Monaco providers
 * 返回 dispose 函数
 */
export async function connectPyrightLsp(options: LspBridgeOptions): Promise<() => void> {
  if (!isElectron()) return () => {};

  const api = getApi();
  if (!api?.invoke) return () => {};

  const { monaco, model, language } = options;
  const disposables: any[] = [];

  // 1. 启动 LSP
  let startResult: any;
  try {
    startResult = await api.invoke('lsp:start');
    console.log('[LSP] start result:', JSON.stringify(startResult));
  } catch (err: any) {
    console.error('[LSP] start invoke error:', err);
    return () => {};
  }
  if (startResult?.status !== 'ok' && startResult?.status !== 'already_running') {
    console.warn('[LSP] Failed to start:', startResult?.message || startResult);
    return () => {};
  }

  // 2. 打开文档（注入 at 声明前缀）
  documentVersion = 1;
  await api.invoke('lsp:didOpen', {
    uri: VIRTUAL_URI,
    languageId: language,
    version: documentVersion,
    text: withPreamble(model.getValue()),
  });

  // 3. 监听文档变更 → 同步给 LSP（带前缀）
  disposables.push(
    model.onDidChangeContent(() => {
      documentVersion++;
      api.invoke('lsp:didChange', {
        uri: VIRTUAL_URI,
        version: documentVersion,
        text: withPreamble(model.getValue()),
      });
    })
  );

  // 4. 监听 LSP notifications (diagnostics)，过滤前缀区域并偏移行号
  unsubNotification = api.on('lsp:notification', (_event: any, message: any) => {
    if (message.method === 'textDocument/publishDiagnostics') {
      const params = message.params;
      if (params.uri === VIRTUAL_URI) {
        const rawDiags = (params.diagnostics || []).filter(
          (d: any) => d.range.start.line >= PREAMBLE_LINES
        );
        const markers = convertDiagnosticsToMarkers(monaco, rawDiags);
        monaco.editor.setModelMarkers(model, 'pyright', markers);
        options.onDiagnostics?.(markers);
      }
    }
  });

  // 5. 注册 completion provider
  disposables.push(
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['.', '(', ',', '['],
      provideCompletionItems: async (_model: any, position: any) => {
        const result = await api.invoke('lsp:completion', {
          uri: VIRTUAL_URI,
          position: { line: position.lineNumber - 1 + PREAMBLE_LINES, character: position.column - 1 },
        });

        if (!result || (!result.items && !Array.isArray(result))) return { suggestions: [] };
        const items = result.items || result;
        return {
          suggestions: items.map((item: any) => convertCompletionItem(monaco, item, position)),
        };
      },
    })
  );

  // 6. 注册 hover provider
  disposables.push(
    monaco.languages.registerHoverProvider(language, {
      provideHover: async (_model: any, position: any) => {
        const result = await api.invoke('lsp:hover', {
          uri: VIRTUAL_URI,
          position: { line: position.lineNumber - 1 + PREAMBLE_LINES, character: position.column - 1 },
        });

        if (!result || !result.contents) return null;
        return {
          contents: convertHoverContents(result.contents),
          range: result.range ? convertRange(result.range) : undefined,
        };
      },
    })
  );

  // 7. 注册 signature help provider
  disposables.push(
    monaco.languages.registerSignatureHelpProvider(language, {
      signatureHelpTriggerCharacters: ['(', ','],
      provideSignatureHelp: async (_model: any, position: any) => {
        const result = await api.invoke('lsp:signatureHelp', {
          uri: VIRTUAL_URI,
          position: { line: position.lineNumber - 1 + PREAMBLE_LINES, character: position.column - 1 },
        });

        if (!result || !result.signatures) return null;
        return {
          value: {
            signatures: result.signatures.map((sig: any) => ({
              label: sig.label,
              documentation: sig.documentation
                ? typeof sig.documentation === 'string'
                  ? sig.documentation
                  : { value: sig.documentation.value || '' }
                : undefined,
              parameters: (sig.parameters || []).map((p: any) => ({
                label: p.label,
                documentation: p.documentation
                  ? typeof p.documentation === 'string'
                    ? p.documentation
                    : { value: p.documentation.value || '' }
                  : undefined,
              })),
            })),
            activeSignature: result.activeSignature ?? 0,
            activeParameter: result.activeParameter ?? 0,
          },
          dispose() {},
        };
      },
    })
  );

  // 8. 注册 definition provider (Ctrl+Click)
  disposables.push(
    monaco.languages.registerDefinitionProvider(language, {
      provideDefinition: async (_model: any, position: any) => {
        const result = await api.invoke('lsp:definition', {
          uri: VIRTUAL_URI,
          position: { line: position.lineNumber - 1 + PREAMBLE_LINES, character: position.column - 1 },
        });

        if (!result) return null;

        // LSP 返回 Location | Location[] | LocationLink[]
        const locations = Array.isArray(result) ? result : [result];
        return locations
          .filter((loc: any) => {
            // 只处理同文件内定义（不跳外部文件）
            const uri = loc.uri || loc.targetUri;
            return uri === VIRTUAL_URI;
          })
          .map((loc: any) => {
            const range = loc.range || loc.targetRange;
            if (!range) return null;
            return {
              uri: model.uri,
              range: convertRange(range),
            };
          })
          .filter(Boolean);
      },
    })
  );

  // dispose 函数
  return () => {
    disposables.forEach((d) => d.dispose());
    if (unsubNotification) {
      unsubNotification();
      unsubNotification = null;
    }
    api.invoke('lsp:didClose', { uri: VIRTUAL_URI }).catch(() => {});
    monaco.editor.setModelMarkers(model, 'pyright', []);
  };
}

// ── LSP → Monaco 格式转换 ──

function convertRange(range: any) {
  return {
    startLineNumber: range.start.line + 1 - PREAMBLE_LINES,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1 - PREAMBLE_LINES,
    endColumn: range.end.character + 1,
  };
}

const LSP_TO_MONACO_SEVERITY: Record<number, number> = {
  1: 8, // Error
  2: 4, // Warning
  3: 2, // Information
  4: 1, // Hint
};

function convertDiagnosticsToMarkers(monaco: any, diagnostics: any[]) {
  return diagnostics.map((d: any) => ({
    severity: LSP_TO_MONACO_SEVERITY[d.severity] ?? monaco.MarkerSeverity.Info,
    message: d.message,
    startLineNumber: d.range.start.line + 1 - PREAMBLE_LINES,
    startColumn: d.range.start.character + 1,
    endLineNumber: d.range.end.line + 1 - PREAMBLE_LINES,
    endColumn: d.range.end.character + 1,
    source: d.source || 'pyright',
    code: d.code ? String(d.code) : undefined,
  }));
}

// LSP CompletionItemKind → Monaco CompletionItemKind
const LSP_COMPLETION_KIND_MAP: Record<number, number> = {
  1: 0,   // Text
  2: 1,   // Method
  3: 1,   // Function
  4: 5,   // Constructor
  5: 4,   // Field
  6: 5,   // Variable
  7: 7,   // Class
  8: 8,   // Interface
  9: 9,   // Module
  10: 10, // Property
  11: 12, // Unit
  12: 14, // Value
  13: 15, // Enum
  14: 17, // Keyword
  15: 27, // Snippet
  16: 19, // Color
  17: 20, // File
  18: 23, // Reference
  19: 24, // Folder
  20: 16, // EnumMember
  21: 21, // Constant
  22: 22, // Struct
  23: 25, // Event
  24: 26, // Operator
  25: 27, // TypeParameter
};

function convertCompletionItem(monaco: any, item: any, position: any) {
  const word = { startColumn: position.column, endColumn: position.column };

  let insertText = item.insertText || item.label;
  let insertTextRules = undefined;

  if (item.insertTextFormat === 2) {
    insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  }

  if (item.textEdit) {
    insertText = item.textEdit.newText;
    if (item.textEdit.range) {
      word.startColumn = item.textEdit.range.start.character + 1;
      word.endColumn = item.textEdit.range.end.character + 1;
    }
  }

  return {
    label: typeof item.label === 'string' ? item.label : item.label?.label || '',
    kind: LSP_COMPLETION_KIND_MAP[item.kind] ?? 0,
    insertText,
    insertTextRules,
    detail: item.detail || '',
    documentation: item.documentation
      ? typeof item.documentation === 'string'
        ? item.documentation
        : { value: item.documentation.value || '' }
      : undefined,
    range: {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    },
    sortText: item.sortText,
    filterText: item.filterText,
  };
}

function convertHoverContents(contents: any): any[] {
  if (typeof contents === 'string') {
    return [{ value: contents }];
  }
  if (contents.kind) {
    return [{ value: contents.value || '' }];
  }
  if (Array.isArray(contents)) {
    return contents.map((c: any) => {
      if (typeof c === 'string') return { value: c };
      if (c.language) return { value: `\`\`\`${c.language}\n${c.value}\n\`\`\`` };
      return { value: c.value || '' };
    });
  }
  if (contents.language) {
    return [{ value: `\`\`\`${contents.language}\n${contents.value}\n\`\`\`` }];
  }
  return [{ value: String(contents) }];
}
