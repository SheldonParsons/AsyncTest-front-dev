<template>
  <transition name="slide" appear>
    <div>
      <div class="ed editor" ref="dom"></div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import {
  onMounted,
  ref,
  getCurrentInstance,
  watch,
  nextTick,
  computed,
} from "vue";
import { JSONFormatError, preprocessJson } from "./formatter";

import tools from "@/utils/tools";
import { useI18n } from "vue-i18n";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import { parse } from "@prantlf/jsonlint";
const isExternalUpdate = ref(false);

function clean_value() {
  instance.value.setValue("");
}

function get_value() {
  return get_value_inner();
}

const { t } = useI18n();

const hasFirstInsert = ref(false);

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
  (newVal) => {
    // 如果当前内容与新值相同，跳过更新（避免无意义操作）
    if (get_value_inner() === newVal) return;

    // 标记为外部更新
    isExternalUpdate.value = true;
    instance.value.setValue(newVal);

    // 重置标识（确保下一个事件循环中标识已清除）
    nextTick(() => {
      isExternalUpdate.value = false;
    });
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

let _instance: any = ref();

const instance: any = computed({
  get() {
    return _instance;
  },
  set(val) {
    _instance = val;
  },
});

// 自定义语言
const _CUSTOMER = "json_custom";

function stopChangeCodeAction() {
  emit("stopChangeCode");
}

// 当前语言
const defaultLanguage = ref(_CUSTOMER);

// 编辑器注册列表
const registerList: any = [];

// 插入数据列表
const insertData: any = [];

onMounted(async () => {
  // 动态加载monaco
  // import("monaco-editor").then(async (m) => {
  //   await createLanguage(m);
  // });

  // 先确保DOM加载完成
  await nextTick();

  // 动态加载monaco前确保worker配置
  (window as any).MonacoEnvironment = {
    getWorker(_: any, label: any) {
      return new JsonWorker();
    },
  };

  // 使用独立作用域加载
  const monacoModule = await import("monaco-editor");
  monaco.value = monacoModule; // 直接访问editor
  await createLanguage();
});

// 插入文本并保持光标位置
const insertText = (text: string) => {
  if (instance.value) {
    // const model = instance.getModel();
    const sanitizedText = text;
    const position = instance.value.getPosition(); // 获取当前光标位置
    // 仅在插入文本前执行一次，确保没有重复操作
    instance.value.executeEdits(null, [
      {
        range: new monaco.value.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        text: sanitizedText,
        forceMoveMarkers: true,
      },
    ]);
    // 重新获取焦点
    instance.value.focus();
    const newPosition = {
      lineNumber: position.lineNumber,
      column: position.column,
    };
    // 使用 setSelection 确保更新光标位置
    instance.value.setSelection(
      new monaco.value.Selection(
        newPosition.lineNumber,
        newPosition.column,
        newPosition.lineNumber,
        newPosition.column
      )
    );
  }
};
const isMonacoLoaded = ref(false);

async function createLanguage() {
  if (isMonacoLoaded.value) return;
  isMonacoLoaded.value = true;
  await new Promise((resolve) => setTimeout(resolve, 50));
  monaco.value.languages.register({ id: defaultLanguage.value });

  monaco.value.languages.setMonarchTokensProvider(defaultLanguage.value, {
    tokenizer: {
      root: [
        [/\{\{[^}]+\}\}/, { token: "custom.orange" }],
        [/\{\%[^%]+\%\}/, { token: "custom.blue" }],
        [/[,:]/, "delimiter"],
        [/[[]/, "delimiter.square"],
        [/\b\d+\b/, "number"],
      ],
    },
  });
  // 设置自定义皮肤
  monaco.value.editor.defineTheme("fizz", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "custom.orange", foreground: "#FF8C00", fontStyle: "italic" }, // 橙色
      { token: "custom.blue", foreground: "#4169E1", fontStyle: "italic" }, // 粉红色 // 指定双引号的颜色
      { token: "number", foreground: "0000FF" },
      { token: "delimiter", foreground: "000000" },
      { token: "delimiter.square", foreground: "000000" },
      { background: "ffffff" },
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
      { open: "{%", close: "%}" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: '"', close: '"' },
      { open: "{{", close: "}}" },
      { open: "{%", close: "%}" },
    ],
  });

  // 创建编辑器model
  const model = monaco.value.editor.createModel(
    props.modelValue,
    defaultLanguage.value
  );
  if (props.modelValue !== "") {
    hasFirstInsert.value = true;
  }
  // 创建编辑器实例
  try {
    instance.value = monaco.value.editor.create(dom.value, {
      model,
      tabSize: 2,
      fontSize: 13,
      fontLigatures: true,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      mouseWheelScrollSensitivity: 1,
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
  } catch (error) {
    return
  }
  instance.value.getDomNode().addEventListener(
    "wheel",
    function (event: any) {
      const currentScrollTop = instance.value.getScrollTop();
      const maxScrollTop =
        instance.value.getScrollHeight() -
        instance.value.getLayoutInfo().height;

      if (
        (currentScrollTop <= 0 && event.deltaY < 0) ||
        (currentScrollTop >= maxScrollTop && event.deltaY > 0)
      ) {
        event.stopPropagation();
        window.scrollBy(0, event.deltaY);
      }
    },
    { capture: true }
  );
  // 创建保存格式化代码快捷键
  instance.value.addAction({
    id: "save" + String(Math.floor(Math.random() * 1000) + 1),
    label: "save" + String(Math.floor(Math.random() * 1000) + 1),
    keybindings: [
      monaco.value.KeyMod.chord(
        monaco.value.KeyMod.CtrlCmd | monaco.value.KeyCode.KeyE
      ),
    ],
    run: saveEditor, // 方法
  });
  initEditorInstance(model, instance.value);
  function saveEditor() {
    if (defaultLanguage.value === _CUSTOMER) {
      const fullRange = model.getFullModelRange(); // 获取模型的完整范围
      const formattedValue = JSONFormatError(get_value_inner()); // 获取格式化后的值
      if (formattedValue !== false) {
        // 执行编辑操作，更新内容但保留撤销堆栈
        model.pushEditOperations(
          [], // 当前选区，因为我们不需要替换选区
          [{ range: fullRange, text: formattedValue }], // 一系列编辑操作
          () => null // 不需要处理选区变化
        );
        tools.message("JSON" + t("component.editor.formatted"), proxy);
      } else {
        tools.message(t("该字符串不是标准的JSON字符串，无法格式化"), proxy);
      }
    }
  }

  switchRegister();
  await completionItems();
}

function get_value_inner() {
  return instance.value.getValue();
}

function switchRegister() {
  if (defaultLanguage.value === _CUSTOMER) {
    initRegister();
    initPrivateRegister();
  } else if (defaultLanguage.value === "text") {
    initRegister();
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
              text: model.getValue(),
            },
          ];
        },
      }
    );
  registerList.push(formatter);
}
let debounceTimer: any;
const debounceDelay = 500; // 防抖延迟时间，单位为毫秒

function initEditorInstance(model: any, editor: any) {
  // 创建修改监听事件
  instance.value.onDidChangeModelContent((event: any) => {
    hasFirstInsert.value = true;
    if (isExternalUpdate.value) return;
    hasFirstInsert.value = true;
    const value: any = get_value_inner();
    clearTimeout(debounceTimer); // 每次事件触发时清除上一个定时器
    debounceTimer = setTimeout(async () => {
      // 设置新的定时器
      try {
        if (value !== "") {
          parse(preprocessJson(value));
        }
        monaco.value.editor.setModelMarkers(model, "jsonlint", []);
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
  registerList.push(instance.value);
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

function set_value(newVal: string) {
  instance.value.setValue(newVal);
}
defineExpose({
  clean_value,
  get_value,
  insertText,
  set_value,
});
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
  height: 300px;
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
