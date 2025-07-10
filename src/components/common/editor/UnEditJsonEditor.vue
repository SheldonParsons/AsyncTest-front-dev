<template>
  <transition name="slide" appear>
    <div>
      <div class="ed editor" ref="dom"></div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { onMounted, ref, getCurrentInstance, watch } from "vue";
import { JSONFormat, preprocessJson } from "./formatter";

import tools from "@/utils/tools";
import { useI18n } from "vue-i18n";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import GlobalStatus from "@/global";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import { parse } from "@prantlf/jsonlint";

self.MonacoEnvironment = {
  getWorker(workerId, label) {
    return new EditorWorker();
  },
};

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: null as any,
  },
  project: {
    type: Number,
    default: -1,
  },
  codeCompleteFn: {
    type: Function,
    default: null,
  },
  changeValue: {
    type: Boolean,
    default: true,
  },
  colorGroup: {
    type: Number,
    default: 0,
  },
});
watch(
  () => props.modelValue,
  (newVal: any, oldVal) => {
    if (props.changeValue && instance) {
      try {
        instance.setValue(JSONFormat(newVal));
      } catch (error) {
        instance.setValue(newVal);
      }
      stopChangeCodeAction();
    }
  }
);

// 全局对象
const { proxy }: any = getCurrentInstance();

// 双向绑定，抛出model
const emit = defineEmits(["update:modelValue", "stopChangeCode"]);

// 编辑器组件实例
const dom = ref();

// monaco实例
const monaco = ref();

// {{}}正则
const localRe = /\{{2}.*?\}{2}/g;

// model生成出来的编辑器结构化实例
let instance: any;

// 自定义语言
const _CUSTOMER = "json_custom";

// 语言文本映射
const languageMapping: any = {
  json_custom: "json_custom",
  json: "json",
  private: "json",
  text: "TEXT",
  python: "Python",
  javascript: "JavaScript",
};

function stopChangeCodeAction() {
  emit("stopChangeCode");
}

// 当前语言
const defaultLanguage = ref(_CUSTOMER);

// 编辑器注册列表
const registerList: any = [];

// 插入数据列表
const insertData: any = [];

function choiceLanguage(command: any) {
  dispose();
  defaultLanguage.value = command;
  createLanguage(monaco.value);
  tools.message(
    t("component.editor.changeLanguage") +
      languageMapping[defaultLanguage.value],
    proxy
  );
}

onMounted(async () => {
  // 动态加载monaco
  import("monaco-editor").then(async (m) => {
    await createLanguage(m);
  });
});

function dispose() {
  for (let i = 0; i < registerList.length; i++) {
    registerList[i].dispose();
  }
}

async function createLanguage(m: any) {
  monaco.value = m;
  monaco.value.languages.register({ id: defaultLanguage.value });
  // 创建保存格式化代码快捷键
  monaco.value.editor.addEditorAction({
    id: "save",
    label: "save",
    keybindings: [
      monaco.value.KeyMod.chord(
        monaco.value.KeyMod.CtrlCmd | monaco.value.KeyCode.KeyE
      ),
    ],
    run: saveEditor, // 方法
  });
  const _t: any = props.modelValue;
  // 定义语言规则和配置
  monaco.value.languages.setMonarchTokensProvider(defaultLanguage.value, {
    tokenizer: {
      root: [
        [/\{\{.*?\}\}/, { token: "custom-brackets" }], // 自定义匹配 {{}}
        [/[{}]/, "@brackets"], // 匹配普通的括号
        [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
        [/\b\d+\b/, "number"], // 在字符串外匹配数字，显示为蓝色
        [/[,:]/, "delimiter"],
        [/[[]/, "delimiter.square"],
      ],
      string: [
        [/\{\{.*?\}\}/, { token: "custom-brackets" }], // 在字符串内也匹配 {{}}
        [/\b\d+\b/, "number-in-string"], // 在字符串内匹配数字，显示为绿色
        [/[^\\"]+/, "string"], // 匹配非转义的字符串内容
        [/\\./, "string.escape.invalid"], // 匹配非法转义
        [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
      ],
    },
  });
  // 设置自定义皮肤
  monaco.value.editor.defineTheme("fizz", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "custom-brackets", foreground: "FFA500", fontStyle: "italic" }, // 橙色
      { token: "number", foreground: "0000FF" }, // 数字显示为蓝色
      { token: "number-in-string", foreground: "CD5555" }, // 字符串内的数字显示为绿色
      { token: "string", foreground: "CD5555" }, // 深绿色，斜体
      { token: "string.quote", foreground: "CD5555" }, // 红色
      { token: "delimiter", foreground: "000000" }, // 蓝色
      { token: "delimiter.square", foreground: "000000" }, // 粉红色 // 指定双引号的颜色
      { background: "F5F5F5" },
    ],
    colors: {
      "editor.foreground": "#000000",
      "editor.background": "#ffffff",
      "editorCursor.foreground": "#000000",
      "editor.lineHighlightBackground": "#f5f5f5",
      "editor.lineHighlightBorder": "#ff0000",
      "editorLineNumber.foreground": "#008800",
      "editor.selectionBackground": "#CDCDB4",
      "editor.inactiveSelectionBackground": "#88000015",
    },
  });
  monaco.value.editor.setTheme("fizz");

  // 语言配置
  monaco.value.languages.setLanguageConfiguration(defaultLanguage.value, {
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ['"', '"'],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: '"', close: '"' },
      { open: "{{", close: "}}" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: '"', close: '"' },
      { open: "{{", close: "}}" },
    ],
  });
  // 创建编辑器model
  const model = monaco.value.editor.createModel(
    _t.data === undefined ? JSONFormat(_t) : JSONFormat(_t.data),
    defaultLanguage.value
  );
  // 创建编辑器实例
  instance = monaco.value.editor.create(dom.value, {
    model,
    tabSize: 2,
    fontSize: "13px",
    readOnly: true,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    autoClosingBrackets: "always", // 确保开启自动闭合括号
    formatOnType: true, // 开启键入时自动格式化
    renderWhitespace: "all",
    minimap: {
      enabled: false,
      maxColumn: 80,
      renderCharacters: true,
      showSlider: "always", // "always" | "mouseover"
      side: "right", // "right" | "left"
      size: "fit", // "proportional" | "fill" | "fit"
    },
  });

  initEditorInstance(model, instance);
  function saveEditor() {
    if (defaultLanguage.value === _CUSTOMER) {
      // const model = instance.getModel(); // 获取编辑器模型
      formatted_action(model);
      tools.message(t("component.editor.formatted"), proxy);
    }
  }
  switchRegister();
  await completionItems();
}

function formatted_action(model: any) {
  const fullRange = model.getFullModelRange(); // 获取模型的完整范围
  const formattedValue = JSONFormat(instance.getValue()); // 获取格式化后的值

  // 执行编辑操作，更新内容但保留撤销堆栈
  model.pushEditOperations(
    [], // 当前选区，因为我们不需要替换选区
    [{ range: fullRange, text: formattedValue }], // 一系列编辑操作
    () => null // 不需要处理选区变化
  );
}

function switchRegister() {
  if (defaultLanguage.value === _CUSTOMER) {
    // initRegister();
    // initPrivateRegister();
  } else if (defaultLanguage.value === "text") {
    initRegister();
  }
}
let debounceTimer: any;
const debounceDelay = 500; // 防抖延迟时间，单位为毫秒

function initEditorInstance(model: any, editor: any) {
  // 创建修改监听事件
  instance.onDidChangeModelContent((event: any) => {
    const value = instance.getValue();
    clearTimeout(debounceTimer); // 每次事件触发时清除上一个定时器
    debounceTimer = setTimeout(async () => {
      // 设置新的定时器
      try {
        if (value === "") {
          monaco.value.editor.setModelMarkers(model, "jsonlint", []);
        } else {
          parse(preprocessJson(value));
          monaco.value.editor.setModelMarkers(model, "jsonlint", []);
        }
      } catch (error: any) {
        const markers = [
          {
            startLineNumber: error.location.start.line,
            startColumn: error.location.start.column,
            endLineNumber: error.location.start.line,
            endColumn: error.location.start.offset,
            message: error.message,
            severity: monaco.value.MarkerSeverity.Error,
          },
        ];
        monaco.value.editor.setModelMarkers(model, "jsonlint", markers);
      }
    }, debounceDelay);
    emit("update:modelValue", value);
  });
  // model.onDidChangeContent(async () => {});
  registerList.push(instance);
}

// 代码检查
function SyntaxCheck(model: any) {
  try {
    // 获取替换字符长度，用于等长度替换
    const match = localRe.exec(instance.getValue());
    let addLength: number = 0;
    if (match !== null) {
      match.map((item: any) => {
        addLength += item.length;
      });
    }
    // JSON.parse语法检查
    JSON.parse(
      instance.getValue().replaceAll(localRe, Math.pow(10, addLength - 1))
    );
    // 语法检查通过清空编辑器marker内容
    monaco.value.editor.setModelMarkers(model, defaultLanguage.value, []);
  } catch (error: any) {
    // 匹配数字
    const re = /\d+/g;
    let errorIndex: any = re.exec(error.message);
    if (errorIndex) {
      errorIndex = parseInt(errorIndex[0]);
      let sumLength = 0;
      const dataRows = instance.getValue().split("\n");
      for (let i = 0; i < dataRows.length; i++) {
        // 区间匹配
        if (
          parseInt(errorIndex) >= sumLength &&
          parseInt(errorIndex) <= sumLength + dataRows[i].length
        ) {
          // 创建编辑器代码提示marker
          monaco.value.editor.setModelMarkers(model, defaultLanguage.value, [
            {
              startLineNumber: i + 1,
              endLineNumber: i + 1,
              startColumn: errorIndex - sumLength + 1,
              endColumn: errorIndex - sumLength + 1,
              code: error.code,
              severity: monaco.value.MarkerSeverity.Error,
              message: error.message,
            },
          ]);
          break;
        } else {
          sumLength += dataRows[i].length + 1;
        }
      }
    }
  }
}

// 初始化Private类型的功能注册
function initPrivateRegister() {
  // 格式化
  const formatter =
    monaco.value.languages.registerDocumentFormattingEditProvider(
      defaultLanguage.value,
      {
        provideDocumentFormattingEdits: (
          model: any,
          range: any,
          options: any,
          token: any
        ) => {
          return [
            {
              range: model.getFullModelRange(),
              text: JSONFormat(model.getValue()),
            },
          ];
        },
      }
    );
  registerList.push(formatter);
}
// 注册通用功能
function initRegister() {
  // 补全代码监听
  const codeComplete = monaco.value.languages.registerCompletionItemProvider(
    defaultLanguage.value,
    {
      triggerCharacters:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"'.split(""),
      provideCompletionItems: function (
        model: any,
        position: any,
        context: any,
        token: any
      ) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const prefix = word.word.toLowerCase();
        let suggestions = insertData
          .filter((item: any) => {
            return item.label.toLowerCase().startsWith(prefix);
          })
          .map((item: any) => {
            return {
              ...item,
              range,
            };
          });
        // 判断是否在 JSON 的 key 位置
        if (isJsonKeyPosition(model, position)) {
          suggestions = suggestions.map((suggestion: any) => ({
            ...suggestion,
            label: `"${suggestion.label}"`, // 包裹双引号
          }));
        }
        return {
          suggestions,
          incomplete: true,
        };
      },
    }
  );
  registerList.push(codeComplete);
}

async function completionItems() {
  const data = {
    project: props.project,
    simple: 1,
  };
  if (props.codeCompleteFn === null) {
    return;
  }
  props.codeCompleteFn!(data).then((data: any) => {
    for (let i = 0; i < data.results.length; i++) {
      insertData.push({
        preselect: true,
        label: data.results[i].name,
        kind: monaco.value.languages.CompletionItemKind.Variable,
        documentation: data.results[i].id + ":" + data.results[i].desc,
        insertText: data.results[i].name,
        detail: data.results[i].desc,
      });
    }
    return insertData;
  });
}

function isJsonKeyPosition(model: any, position: any) {
  const lineContent = model.getLineContent(position.lineNumber);
  const lineTillCurrentPosition = lineContent
    .substring(0, position.column - 1)
    .trim();

  // 简单的检查：如果当前位置之前有冒号或逗号，则可能不在 key 位置
  return (
    !lineTillCurrentPosition.endsWith(",") &&
    !lineTillCurrentPosition.endsWith(":")
  );
}
</script>

<style lang="scss" scoped>
/* 关键 CSS */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.3s ease, max-height 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0 !important;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 1000px; /* 设置一个足够大的值 */
}
.placeholder {
  position: absolute;
  top: 41px;
  left: 70px; /* 对齐行号区域 */
  color: #999;
  font-style: italic;
  pointer-events: none; /* 允许穿透点击编辑器 */
  z-index: 2;
}
.ed {
  width: 100%;
  height: 100%;
  // margin-left: 5%;
}
.ed-header {
  height: 35px;
  width: calc(100% + 20px);
  border-radius: 5px 5px 0px 0px;
  background-image: linear-gradient(
    90deg,
    var(--dialog-deep-color) 80%,
    var(--dialog-color)
  );
  text-align: center;
  p {
    color: white;
    font-size: 16px;
    font-weight: normal;
    font-style: normal;
    display: table-cell;
    vertical-align: middle;
    height: 35px;
    padding-left: 20px;
  }
}
.editor {
  height: 400px;
  width: 100%;
}
.el-row {
  height: inherit;
}
.language-col {
  height: inherit;
  span.el-dropdown-link {
    cursor: pointer;
    margin-top: 10px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    display: flex;
  }
  .el-dropdown {
    height: 100%;
  }
}
</style>

<style lang="scss">
.monaco-editor {
  .view-lines {
    font-family: "JetBrains Mono", monospace !important;
  }
}
</style>
