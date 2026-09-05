<template>
  <div v-html="html" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 让正文渲染只依赖该条内容，避免输入框或其他消息更新时重做 Markdown/DOM 清洗。
// 清洗和代码复制仍沿用调用方的正式渲染函数，不另建 Markdown 规则。
const props = defineProps<{
  content: string
  renderMarkdown: (content: string) => string
}>()
const html = computed(() => props.renderMarkdown(props.content))
</script>
