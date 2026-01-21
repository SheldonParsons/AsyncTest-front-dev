<template>
  <div style="height: 100%;overflow: hidden;min-height: 0;flex-grow: 1;border-radius: 0px;">
    <div class="ed editor" ref="dom"></div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, onBeforeUnmount, watch } from "vue";
import { createPythonCompletionProvider } from "@/components/common/editor/completionProvider";

const emit = defineEmits(["change"]);

// 编辑器组件实例
const dom = ref();

// monaco实例
const monacoCore = ref();

// 自定义语言
const _CUSTOMER = "python";

// 当前语言
const defaultLanguage = ref(_CUSTOMER);

// 编辑器注册列表
const registerList: any = [];

const pythonLanguage: any = ref(null);

let instance: any;

let model: any;

let codeCompleteProvider: any;

const props = defineProps({
  code: {
    type: String,
    default: "",
  },
  disable: {
    type: Boolean,
    default: false,
  }
});

watch(
  () => props.code,
  (newVal: any) => {
    // 确保 instance 存在，并且外部传入的值与编辑器当前值不同
    if (instance && newVal !== instance.getValue()) {
      instance.setValue(newVal);
    }
  }
);

onMounted(async () => {
  const [m, contribution, pythonDef] = await Promise.all([
    import('monaco-editor/esm/vs/editor/editor.main'),
    import('monaco-editor/esm/vs/basic-languages/python/python.contribution'),
    import('monaco-editor/esm/vs/basic-languages/python/python')
  ]);
  monacoCore.value = m;
  pythonLanguage.value = pythonDef.language;
  console.log(pythonLanguage.value);
  
  await createLanguage();
});

onBeforeUnmount(() => {
  // 销毁所有注册的事件
  registerList.forEach((item: any) => item.dispose());

  // 销毁编辑器实例
  if (instance) {
    instance.dispose();
  }
  // 销毁模型
  if (model) {
    model.dispose();
  }
});
async function createLanguage() {
  // 设置自定义皮肤
  monacoCore.value.editor.defineTheme("fizz", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "custom-brackets", foreground: "FFA500", fontStyle: "italic" }, // 橙色
      { token: "number", foreground: "0000FF" }, // 数字显示为蓝色
      { token: "keyword", foreground: "0000FF" },
      { token: "number-in-string", foreground: "CD5555" }, // 字符串内的数字显示为绿色
      { token: "string", foreground: "CD5555" }, // 深绿色，斜体
      { token: "string.quote", foreground: "CD5555" }, // 红色
      { token: "delimiter", foreground: "000000" }, // 蓝色
      { token: "delimiter.square", foreground: "000000" }, // 粉红色 // 指定双引号的颜色
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
  monacoCore.value.editor.setTheme("fizz");

  // 创建编辑器model
  model = monacoCore.value.editor.createModel(
    props.code,
    defaultLanguage.value
  );
  // 创建编辑器实例
  instance = monacoCore.value.editor.create(dom.value, {
    model,
    tabSize: 4,
    fontSize: 14,
    fixedOverflowWidgets: true,
    readOnly: props.disable,
    automaticLayout: true,
    fontFamily: '"JetBrains Mono", monospace',
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
    scrollbar: {
      // 垂直滚动条的宽度
      verticalScrollbarSize: 6, // 默认是 10px，我们把它改小
      // 水平滚动条的高度
      horizontalScrollbarSize: 6,
      // (可选) 滚动条箭头的尺寸
      arrowSize: 10,
    }
  });
  instance.getDomNode().addEventListener('wheel', function (event: any) {
    const currentScrollTop = instance.getScrollTop();
    const maxScrollTop = instance.getScrollHeight() - instance.getLayoutInfo().height;

    if (
      (currentScrollTop <= 0 && event.deltaY < 0) ||
      (currentScrollTop >= maxScrollTop && event.deltaY > 0)
    ) {
      event.stopPropagation();
      window.scrollBy(0, event.deltaY);
    }
  }, { capture: true });

  // 监听内容变化
  instance.onDidChangeModelContent(() => {
    const newCode = instance.getValue();
    emit("change", newCode);
  });

  initRegister();
}

// 插入文本并保持光标位置
const insertText = (text: string) => {
  if (instance) {
    // const model = instance.value.getModel();
    const position = instance.getPosition(); // 获取当前光标位置
    // 仅在插入文本前执行一次，确保没有重复操作
    instance.executeEdits(null, [
      {
        range: new monacoCore.value.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        text: text,
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
      new monacoCore.value.Selection(
        newPosition.lineNumber,
        newPosition.column,
        newPosition.lineNumber,
        newPosition.column
      )
    );
  }
};

// 暴露给父组件调用
defineExpose({
  insertText,
});

// 注册通用功能
function initRegister() {
  const customProvider = createPythonCompletionProvider(monacoCore.value, pythonLanguage.value);
  // 补全代码监听
  codeCompleteProvider = monacoCore.value.languages.registerCompletionItemProvider(
    defaultLanguage.value,
    customProvider
  );
  registerList.push(codeCompleteProvider);
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
  max-height: 1000px;
  /* 设置一个足够大的值 */
}

.placeholder {
  position: absolute;
  top: 41px;
  left: 71px;
  /* 对齐行号区域 */
  color: #999;
  font-style: italic;
  pointer-events: none;
  /* 允许穿透点击编辑器 */
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
  height: 100%;
  width: 100%;
  overflow: hidden;
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

/* 针对 Monaco 内部的滚动条容器 */
.monaco-scrollable-element .scrollbar {
  background: transparent;
}

/* 针对滚动条的滑块 (thumb) */
.monaco-scrollable-element .slider {
  background: rgba(100, 100, 100, 0.4);

  /* 【核心】在这里添加圆角 */
  /* 一个 3px 到 5px 的值通常看起来效果最好 */
  border-radius: 3px;

  transition: background 0.2s ease-in-out;
}

/* 当鼠标悬停在整个滚动条区域上时，让滑块变得更不透明 */
.monaco-scrollable-element .scrollbar:hover .slider {
  background: rgba(100, 100, 100, 0.7);
}

/* 当鼠标直接悬停在滑块上时，让它变得最不透明 */
.monaco-scrollable-element .slider:hover {
  background: rgba(100, 100, 100, 0.9);
}
</style>
