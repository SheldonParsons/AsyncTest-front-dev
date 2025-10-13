<template>
  <div v-html="renderedHtml" class="markdown-body no-scroll"></div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from "vue";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import CopyButtonPlugin from "highlightjs-copy";
import useClipboard from "vue-clipboard3/dist/esm/index.js";
import "highlightjs-copy/dist/highlightjs-copy.min.css";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.min.css";
import json from 'highlight.js/lib/languages/json';
hljs.registerLanguage('json', json);

const props = defineProps({
  data: {
    type: null,
    default: "",
  },
});
hljs.addPlugin(
  new CopyButtonPlugin({
    callback: async (text: any, el: any) => {
      const { toClipboard } = useClipboard();
      await toClipboard(text);
      window.$toast({ title: '已复制' })
    },
  })
);
const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight: (code, lang, info) => {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);
marked.setOptions({
  gfm: true,            // 支持表格、任务列表等
  breaks: true,        // 是否将换行视为 <br>
});
const renderedHtml: any = ref("");
const update = () => {
  const inputData = props.data;
  let markdownToRender = "";

  // 1. 首先检查传入的数据是否是 JS 对象 (并且不是 null)
  if (typeof inputData === 'object' && inputData !== null) {
    try {
      // 将 JS 对象格式化为带 2 个空格缩进的 JSON 字符串
      const prettyJson = JSON.stringify(inputData, null, 2);
      // 将其包装在 Markdown 的 json 代码块中
      markdownToRender = `\`\`\`json\n${prettyJson}\n\`\`\``;
    } catch (e) {
      markdownToRender = "Error: Invalid object provided.";
    }
  }
  // 2. 如果是字符串，则尝试判断它是否为 JSON 字符串
  else if (typeof inputData === 'string') {
    const trimmedData = inputData.trim();
    // 检查字符串是否以 '{' 或 '[' 开头，这是 JSON 的一个强烈信号
    if ((trimmedData.startsWith('{') && trimmedData.endsWith('}')) || (trimmedData.startsWith('[') && trimmedData.endsWith(']'))) {
      try {
        // 尝试解析，如果成功，说明是有效的 JSON
        const parsedJson = JSON.parse(trimmedData);
        // 重新字符串化以获得统一的、美观的格式
        const prettyJson = JSON.stringify(parsedJson, null, 2);
        markdownToRender = `\`\`\`json\n${prettyJson}\n\`\`\``;
      } catch (e) {
        // 解析失败，说明它只是一个看起来像 JSON 的普通字符串，按原样渲染
        markdownToRender = inputData;
      }
    } else {
      // 3. 如果不是 JSON 格式的字符串，则作为普通 Markdown 渲染
      markdownToRender = inputData;
    }
  }
  // 4. 处理其他原始类型（如 null, undefined），转换为空字符串
  else {
    markdownToRender = inputData || "";
  }
  renderedHtml.value = marked.parse(markdownToRender);
  // 渲染到 DOM 后，执行高亮和按钮挂载
  // nextTick 也可用，但 onMounted + watch 足够
  requestAnimationFrame(() => {
    // 给新插入的代码块高亮并生成“复制”按钮
    hljs.highlightAll();
  });
};

onMounted(update);
watch(() => props.data, update);
</script>

<style lang="scss">
.hljs {
  background-color: #1e293b !important;
  border-radius: 10px !important;
}

.markdown-body {
  overflow: scroll;
}

.markdown-body blockquote {
  margin-top: 16px;
  margin-bottom: 16px;
  margin-left: 0px;
  margin-right: 0px;
  color: #344054;
  background: #f9fafb;
  border-left: 4px solid #d0d5dd;
  border-radius: 4px 0 0 4px;
  padding: 20px;

  p {
    margin: 0px;
  }
}

.markdown-body table {
  width: max-content;
  max-width: 100%;
  margin: 16px 0;
  font-size: 16px;
  word-break: normal;
  overflow-wrap: break-word;
  border-collapse: collapse;
  border-collapse: separate;
  border-spacing: 0;
  display: block;
  overflow: auto;
}

.markdown-body table th:first-child {
  border-left: 1px solid #f2f4f7;
  border-top-left-radius: 8px;
}

.language-python {
  width: 100%;
  box-sizing: border-box;
}

.hljs-copy-wrapper,
.markdown-body {
  width: 100%;
}

.markdown-body table th {
  color: #344054;
  font-weight: 500;
  text-align: left;
  border-top: 1px solid #f2f4f7;
  padding: 6px 13px;
  border-right: 1px solid #f2f4f7;
  border-bottom: 1px solid #f2f4f7;
}

.markdown-body table tbody tr {
  background-color: #0000;
}

.markdown-body table td:first-child {
  border-left: 1px solid #f2f4f7;
  word-break: normal;
}

.markdown-body table td {
  color: #475467;
  font-weight: 400;
  border-top: none;
  border-right: 1px solid #f2f4f7;
  border-bottom: 1px solid #f2f4f7;
  padding: 6px 13px;
}

.markdown-body a {
  color: var(--global-theme-light-color);
  text-decoration: inherit;
  background-color: #0000;
}
</style>
