<template>
  <transition name="slide" appear>
    <div>
      <div class="ed editor" ref="dom"></div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { onMounted, ref, onBeforeUnmount, watch, shallowRef } from "vue";

const showPlaceholder = ref(true);

const emit = defineEmits(["change"]);

// 编辑器组件实例
const dom = ref();

// monaco实例
const monaco:any = shallowRef(null);

// 当前语言
const defaultLanguage = ref("plaintext");

const hasFirstInsert = ref(false);

let instance: any;

let model: any;

const isEditorReady = ref(false);

const props = defineProps({
  code: {
    type: String,
    default: "",
  },
  allowNewlines: {
    type: Boolean,
    default: true,
  },
  disable: {
    type: Boolean,
    default: false,
  },
  always: {
    type: Boolean,
    default: false,
  }
});

// 监听代码变化（独立处理）
watch(
  () => props.code,
  (newVal: any, oldVal) => {
    console.log(newVal);
    console.log(instance.getValue());
    if (props.always === true && newVal !== instance.getValue()) {
      instance.setValue(newVal);
    }
    if (props.always === false) {
      if (props.code && instance) {
        if (!hasFirstInsert.value) {
          instance.setValue(newVal);
          hasFirstInsert.value = true;
        }
      }
    }

  }
);

const disablePreventNewline = (editor: any, monaco: any) => {
  // 1. 移除所有命令（使用编辑器实例方法）
  preventNewlineCommandIds.forEach((id) => {
    editor.addCommand(id, () => {
      // 恢复默认回车行为
      editor.trigger("keyboard", monaco.KeyCode.Enter, {});
    });
  });
  preventNewlineCommandIds = [];

  // 2. 销毁事件监听
  preventNewlineDisposables.forEach((d: any) => d.dispose());
  preventNewlineDisposables = [];

  // 3. 恢复编辑器选项
  editor.updateOptions({
    wordWrap: "on",
    wrappingStrategy: "advanced",
    autoIndent: "advanced",
  });
};
const enablePreventNewline = (editor: any, monaco: any) => {
  // 添加自定义行为，阻断回车键
  const disposable = editor.addAction({
    id: "block-enter",
    label: "Block Enter",
    keybindings: [monaco.KeyCode.Enter],
    run: () => {
      // 空回调，相当于屏蔽回车键
    },
  });
  preventNewlineDisposables.push(disposable); // 存储命令ID

  // 2. 拦截粘贴（保持原有disposable处理）
  const pasteListener = editor.onDidChangeModelContent((e: any) => {
    e.changes.forEach((change: any) => {
      if (change.text.includes("\n")) {
        editor.executeEdits("prevent-newline", [
          {
            range: change.range,
            text: change.text.replace(/\n/g, " "),
          },
        ]);
      }
    });
  });
  preventNewlineDisposables.push(pasteListener);

  // 3. 配置编辑器选项
  editor.updateOptions({
    wordWrap: "off",
    wrappingStrategy: "simple",
    autoIndent: "none",
  });
};

onMounted(async () => {
  // ✅ 动态引入核心 API (解决 SSR CSS 问题 + 按需加载)
  // plaintext 不需要额外的 contribution 文件，因为它很基础，且你自定义了 tokenizer
  const m = await import('monaco-editor/esm/vs/editor/editor.api');
  
  monaco.value = m;
  await createLanguage();
});

onBeforeUnmount(() => {
  disablePreventNewline(instance, monaco.value);

  if (model) {
    model.dispose();
    model = null;
  }
  if (instance) {
    instance.dispose();
    instance = null;
  }
});

let preventNewlineCommandIds: string[] = []; // 新增命令ID存储
let preventNewlineDisposables: any = []; // 仅存储可销毁对象

async function createLanguage() {
  // 定义自定义语法高亮规则
  monaco.value.languages.setMonarchTokensProvider("plaintext", {
    tokenizer: {
      root: [
        // 匹配 {{...}} 橙色规则（优先处理）
        [/\{\{[^}]+\}\}/, { token: "custom.orange" }],

        // 匹配 {%...%} 蓝色规则（优先处理）
        [/\{\%[^%]+\%\}/, { token: "custom.blue" }],

        // 其他原有语法规则...
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

  // 创建编辑器model
  model = monaco.value.editor.createModel(props.code, defaultLanguage.value);

  // 创建编辑器实例
  instance = monaco.value.editor.create(dom.value, {
    model,
    tabSize: 4,
    fontSize: 14,
    automaticLayout: true,
    fontFamily: '"JetBrains Mono", monospace',
    scrollBeyondLastLine: false,
    autoClosingBrackets: "never", // 确保开启自动闭合括号
    formatOnType: true, // 开启键入时自动格式化
    renderWhitespace: "all",
    readOnly: props.disable,
    // 根据 props.allowNewlines 设置初始值
    wordWrap: props.allowNewlines ? "on" : "off",
    wrappingStrategy: props.allowNewlines ? "advanced" : "simple",
    autoIndent: props.allowNewlines ? "advanced" : "none",
    minimap: {
      enabled: false,
      maxColumn: 80,
      renderCharacters: true,
      showSlider: "always", // "always" | "mouseover"
      side: "right", // "right" | "left"
      size: "fit", // "proportional" | "fill" | "fit"
    },
  });
  instance.getDomNode().addEventListener(
    "wheel",
    function (event: any) {
      const currentScrollTop = instance.getScrollTop();
      const maxScrollTop =
        instance.getScrollHeight() -
        instance.getLayoutInfo().height;

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
  isEditorReady.value = true;

  disablePreventNewline(instance, monaco.value);
  // 手动触发一次初始配置
  if (!props.allowNewlines) {
    enablePreventNewline(instance, monaco.value);
  }

  // 手动设置初始代码
  instance.setValue(props.code);

  // 监听内容变化
  instance.onDidChangeModelContent(() => {
    const content = instance.getValue();
    showPlaceholder.value = content.trim() === "";
  });

  // 监听编辑器内容变化
  instance.onDidChangeModelContent((e: any) => {
    const newCode = instance.getValue();
    emit("change", newCode);
  });
}

// 插入文本并保持光标位置
const insertText = (text: string) => {
  if (instance) {
    // const model = instance.value.getModel();
    const sanitizedText = props.allowNewlines ? text : text.replace(/\n/g, " ");
    const position = instance.getPosition(); // 获取当前光标位置
    // 仅在插入文本前执行一次，确保没有重复操作
    instance.executeEdits(null, [
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
    instance.focus();
    const newPosition = {
      lineNumber: position.lineNumber,
      column: position.column,
    };
    // 使用 setSelection 确保更新光标位置
    instance.setSelection(
      new monaco.value.Selection(
        newPosition.lineNumber,
        newPosition.column,
        newPosition.lineNumber,
        newPosition.column
      )
    );
  }
};

function get_code() {
  return instance.getValue();
}

// 暴露给父组件调用
defineExpose({
  insertText,
  get_code,
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
  max-height: 1000px;
  /* 设置一个足够大的值 */
}

.placeholder {
  position: absolute;
  top: 44px;
  left: 365px;
  /* 对齐行号区域 */
  color: #bcbcbc;
  font-style: italic;
  pointer-events: none;
  /* 允许穿透点击编辑器 */
  z-index: 2;
  font-size: 12px;
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
  background-image: linear-gradient(90deg,
      var(--dialog-deep-color) 80%,
      var(--dialog-color));
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
  height: 200px;
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
