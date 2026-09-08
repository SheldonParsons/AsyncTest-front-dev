<template>
  <nav class="team-pagination" aria-label="分页">
    <span class="team-pagination__total">共 {{ total }} 条</span>
    <button type="button" aria-label="上一页" :disabled="currentPage <= 1" @click="select(currentPage - 1)"><ChevronLeft :size="16" aria-hidden="true" /></button>
    <template v-for="(item, index) in pages" :key="`${item}-${index}`">
      <span v-if="item === 'ellipsis'" class="team-pagination__ellipsis"><Ellipsis :size="16" aria-hidden="true" /></span>
      <button v-else type="button" :aria-label="`第 ${item} 页`" :aria-current="item === currentPage ? 'page' : undefined" :class="{ active: item === currentPage }" @click="select(item)">{{ item }}</button>
    </template>
    <button type="button" aria-label="下一页" :disabled="currentPage >= pageCount" @click="select(currentPage + 1)"><ChevronRight :size="16" aria-hidden="true" /></button>
  </nav>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, Ellipsis } from '@/components/icons/lucide'
const props = withDefaults(defineProps<{ currentPage: number; total: number; pageSize?: number }>(), { pageSize: 20 })
const emit = defineEmits<{ 'update:currentPage': [number] }>()
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const pages = computed(() => {
  const candidates = [...new Set([1, pageCount.value, props.currentPage - 1, props.currentPage, props.currentPage + 1])]
    .filter(page => page >= 1 && page <= pageCount.value).sort((a, b) => a - b)
  const result: (number | 'ellipsis')[] = []
  for (const [index, page] of candidates.entries()) {
    if (index && page - candidates[index - 1] > 1) result.push('ellipsis')
    result.push(page)
  }
  return result
})
function select(page: number) { if (page >= 1 && page <= pageCount.value) emit('update:currentPage', page) }
</script>
<style scoped>
.team-pagination { align-items: center; gap: 5px; }
.team-pagination__total { color: #777; font-size: 12px; margin-right: 12px; }
button, .team-pagination__ellipsis { display: inline-flex; justify-content: center; align-items: center; min-width: 30px; height: 30px; }
button { border: 0; border-radius: 8px; background: transparent; color: #666; cursor: pointer; }
button.active { color: #222; background: rgba(255,255,255,.7); font-weight: 600; }
button:hover:not(:disabled) { background: rgba(0,0,0,.045); }
button:disabled { opacity: .3; cursor: default; }
button:focus-visible { outline: 2px solid #777; outline-offset: 2px; }
</style>
