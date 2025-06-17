<template>
  <div v-html="renderedHtml"></div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, getCurrentInstance } from "vue";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import CopyButtonPlugin from "highlightjs-copy";
import useClipboard from "vue-clipboard3/dist/esm/index.js";
import "highlightjs-copy/dist/highlightjs-copy.min.css";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.min.css";
import tools from "@/utils/tools";
const { proxy }: any = getCurrentInstance();

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
      tools.message("已复制", proxy, "success");
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
  }),
  {
    hooks: {
      preprocess(markdown) {
        // 手动转义所有 HTML 标签
        return markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    },
    renderer: {
      // 禁用 HTML 渲染能力
      html(html) {
        return '';
      }
    }
  }
);
const renderedHtml: any = ref("");
const update = () => {
  renderedHtml.value = marked.parse(props.data || "");
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
</style>
