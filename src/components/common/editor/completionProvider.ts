const atSuggestions: any = (monaco: any) => [
    {
        label: "temp",
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: "temp",
        detail: "临时变量"
    },
    {
        label: "env",
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: "env",
        detail: "环境变量"
    },
    {
        label: "gv",
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: "gv",
        detail: "全局变量"
    },
    {
        label: "func",
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: "func",
        detail: "调用自定义函数类"
    },
    {
        label: "pipeline",
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: "pipeline",
        detail: "调用管道函数类"
    },
    {
        label: "env_name",
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: "env_name",
        detail: "当前环境名称"
    },
    {
        label: "AstFile",
        kind: monaco.languages.CompletionItemKind.Class,
        insertText: "AstFile()",
        detail: "文件操作类"
    },
    {
        label: "AstExcel",
        kind: monaco.languages.CompletionItemKind.Class,
        insertText: "AstExcel()",
        detail: "Excel 操作类"
    }
];

const astExcelSuggestions: any = (monaco: any) => [
    {
        label: "async_load",
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: "async_load('${1:filename}')",
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: "async async_load(self, file: Union[BytesIO, AstFile[BytesIO, GlobalOption], str], filename: str = '')",
        documentation: {
            value: `异步函数，异步加载一个Excel文件。\n\n 参数：\n\tfile  文件名、BytesIO对象、或AstFile对象 \n\tfilename 文件名，如果file参数为一个BytesIO对象，这个值必须填写\n\n返回值：\n\tworkbook Excel操作对象(openpyxl)工作簿`,
            isTrusted: true,
        }
    },
    {
        label: "async_save",
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: "async_save()",
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: "async def async_save(self, cover_file=False)",
        documentation: {
            value: `异步函数，异步保存Excel文件。\n\n参数：\n\tcover_file:bool 是否覆盖原有文件\n\n返回值：\n\tobject_unique_key:str 文件唯一标识符`,
            isTrusted: true,
        }
    }
];


export function createPythonCompletionProvider(monaco: any, pythonLanguage: any) {
    return {
        triggerCharacters: ["."],
        provideCompletionItems: (model: any, position: any) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textUntilPosition = lineContent.substring(0, position.column - 1);

            // 檢查是否以 "at." 結尾
            if (/at\.$/.test(textUntilPosition)) {
                return { suggestions: atSuggestions(monaco) };
            }

            // 檢查是否以 "at.AstExcel()." 結尾
            if (/at\.AstExcel\(\)\.$/.test(textUntilPosition)) {
                return { suggestions: astExcelSuggestions(monaco) };
            }

            let pythonSuggestings: any = []
            pythonLanguage.keywords.forEach((item: any) => {
                pythonSuggestings.push({
                    label: item,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: item,
                });
            });
            return { suggestions: pythonSuggestings };;
        },
    };
}