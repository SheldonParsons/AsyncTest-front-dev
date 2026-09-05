<template>
  <div><div v-for="(block, index) in blocks" :key="index" class="streaming-markdown-block" v-html="block.html" /></div>
</template>

<script setup lang="ts">
import type { MarkdownBlock } from '../streamingMarkdown'
defineProps<{ blocks: MarkdownBlock[] }>()
</script>

<style scoped>
/* 保留语法块的 DOM 身份，并把变化部分的布局限制在当前块内；不隐藏正文或使用预估高度。 */
.streaming-markdown-block { display: flow-root; contain: layout style; }
</style>
