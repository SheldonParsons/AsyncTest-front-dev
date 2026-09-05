<template>
  <div>
    <template v-for="(block, index) in blocks" :key="index">
      <div v-if="block.table" class="streaming-markdown-block">
        <table>
          <thead><tr><th v-for="(cell, column) in block.table.header.cells" :key="column" :align="block.table.align[column] || undefined" v-html="cell" /></tr></thead>
          <tbody v-if="block.table.rows.length">
            <tr v-for="(row, rowIndex) in block.table.rows" :key="rowIndex" v-memo="[row, block.table.align.join(',')]">
              <td v-for="(cell, column) in row.cells" :key="column" :align="block.table.align[column] || undefined" v-html="cell" />
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="streaming-markdown-block" v-html="block.html" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { MarkdownBlock } from '../streamingMarkdown'
defineProps<{ blocks: MarkdownBlock[] }>()
</script>

<style scoped>
/* 保留语法块的 DOM 身份，并把变化部分的布局限制在当前块内；不隐藏正文或使用预估高度。 */
.streaming-markdown-block { display: flow-root; contain: layout style; }
</style>
