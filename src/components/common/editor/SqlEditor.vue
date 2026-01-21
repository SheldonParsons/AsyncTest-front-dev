<template>
  <transition name="slide" appear>
    <div style="position: relative;">
      <div class="ed editor" ref="dom"></div>
      <div v-if="showPlaceholder" class="placeholder">可使用变量，如：SELECT * FROM user WHERE name = <span>{{
          '\{\{username\}\}' }}</span></div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { onMounted, ref, onBeforeUnmount, watch } from "vue";

const showPlaceholder = ref(true);

const emit = defineEmits(["change"]);

// 编辑器组件实例
const dom = ref();

// monaco实例
const monaco = ref();

// 自定义语言
const _CUSTOMER = "mysql";

// 当前语言
const defaultLanguage = ref(_CUSTOMER);

// 编辑器注册列表
const registerList: any = [];

const mysqlLanguage: any = ref(null);

let instance: any;

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
  (newVal: any, oldVal) => {
    if (props.code && instance) {
      instance.setValue(newVal);
    }
  }
);

onMounted(async () => {
  // ✅ 改为动态并行引入
  // 1. editor.api: 核心功能
  // 2. mysql.contribution: 自动注册 mysql 语言 ID 和高亮规则
  // 3. mysql: 获取语言定义（为了拿到 keywords 做补全）
  const [m, _, langDef] = await Promise.all([
    import('monaco-editor/esm/vs/editor/editor.api'),
    import('monaco-editor/esm/vs/basic-languages/mysql/mysql.contribution'),
    import('monaco-editor/esm/vs/basic-languages/mysql/mysql')
  ]);

  monaco.value = m;
  mysqlLanguage.value = langDef.language;

  await createLanguage();
});

onBeforeUnmount(() => {
  // 在组件销毁时清理注册的补全项
  if (codeCompleteProvider) {
    codeCompleteProvider.dispose();
  }
});

async function createLanguage() {
  monaco.value.languages.register({ id: defaultLanguage.value });
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
  const model = monaco.value.editor.createModel(
    props.code,
    defaultLanguage.value
  );
  // 创建编辑器实例
  instance = monaco.value.editor.create(dom.value, {
    model,
    tabSize: 4,
    fontSize: 14,
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
    const content = instance.getValue();
    showPlaceholder.value = content.trim() === "";
  });

  // 初始检查
  showPlaceholder.value = instance.getValue().trim() === "";

  // 监听编辑器内容变化
  instance.onDidChangeModelContent((e: any) => {
    const newCode = instance.getValue();
    emit("change", newCode); // 向父组件发送更新的代码
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
        range: new monaco.value.Range(
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
      new monaco.value.Selection(
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
  // 补全代码监听
  codeCompleteProvider = monaco.value.languages.registerCompletionItemProvider(
    defaultLanguage.value,
    {
      triggerCharacters: ["."],
      provideCompletionItems: function (
        model: any,
        position: any,
        context: any,
        token: any
      ) {
        let suggestions: any = [];
        // 这个keywords就是python.js文件中有的
        mysqlLanguage.value.keywords.forEach((item: any) => {
          suggestions.push({
            label: item,
            kind: monaco.value.languages.CompletionItemKind.Keyword,
            insertText: item,
          });
        });
        return {
          // 最后要返回一个数组
          suggestions: suggestions,
        };
      },
    }
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
  top: 2px;
  left: 70px;
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
  height: 100px;
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
