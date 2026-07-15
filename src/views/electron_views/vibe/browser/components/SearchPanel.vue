<template>
  <div class="search-panel">
    <div class="search-bar">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="m16.5 16.5 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      <input v-model="query" type="search" placeholder="搜索来源标题、路径或原文…" @keydown.enter="search(true)" />
      <button type="button" @click="search(true)">搜索</button>
    </div>
    <div class="results" @scroll.passive="loadMore">
      <button v-for="item in items" :key="item.id" type="button" @click="$emit('open-source', item.source_id, item.start_offset)">
        <div><strong v-html="highlight(item.title_path[item.title_path.length - 1] || item.display_name || item.filename)"/><span>#{{ item.commit_seq }} · {{ item.display_name || item.filename }}</span></div>
        <small v-if="item.breadcrumb" v-html="highlight(item.breadcrumb)" />
        <p v-html="highlight(snippet(item.text))" />
      </button>
      <p v-if="loading" class="state">正在读取…</p>
      <div v-else-if="!items.length" class="empty"><strong>没有可显示的结果</strong><span>{{ query ? '换一个更接近原文的关键词。' : '当前项目还没有可浏览的来源跨度。' }}</span></div>
      <p v-else-if="cursor === null" class="state">已显示全部结果。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { searchKnowledge, type KnowledgeSearchHit } from '../../api'

const props = defineProps<{ projectId: string }>()
defineEmits<{ 'open-source': [sourceId: string, offset: number] }>()
const query = ref('')
const items = ref<KnowledgeSearchHit[]>([])
const cursor = ref<number | null>(null)
const loading = ref(false)

watch(() => props.projectId, () => search(true), { immediate: true })

async function search(reset: boolean) {
  if (!props.projectId || loading.value || (!reset && cursor.value === null)) return
  loading.value = true
  try {
    const page = await searchKnowledge(props.projectId, { q: query.value.trim(), limit: 50, cursor: reset ? 0 : cursor.value || 0 })
    items.value = reset ? page.items : [...items.value, ...page.items]
    cursor.value = page.next_cursor ?? null
  } finally { loading.value = false }
}

async function loadMore(event: Event) {
  const el = event.currentTarget as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) await search(false)
}

function snippet(value: string) { return value.replace(/\s+/g, ' ').trim().slice(0, 260) }
function escape(value: string) { return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char)) }
function highlight(value: string) {
  const safe = escape(value || '')
  const term = query.value.trim()
  if (!term) return safe
  return safe.replace(new RegExp(escapeRegExp(escape(term)), 'gi'), match => `<mark>${match}</mark>`)
}
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
</script>

<style scoped lang="scss">
.search-panel { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; min-height: 0; }
.search-bar { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; margin: 18px auto 14px; width: min(760px, calc(100% - 36px)); padding: 6px 7px 6px 13px; border: 1px solid #d9d9d9; border-radius: 7px; color: #8d8d8d; background: #fff; }
.search-bar:focus-within { border-color: #777; box-shadow: 0 0 0 2px rgba(0,0,0,.04); } input { min-width: 0; border: 0; outline: 0; font: inherit; }
.search-bar button { border: 0; border-radius: 5px; padding: 8px 14px; background: #171717; color: #fff; cursor: pointer; }
.results { min-height: 0; overflow-y: auto; padding: 0 max(18px, calc((100% - 900px) / 2)) 50px; }
.results > button { display: block; width: 100%; padding: 16px 8px; border: 0; border-bottom: 1px solid #ededed; background: transparent; color: #262626; text-align: left; cursor: pointer; }
.results > button:hover { background: #f7f7f7; } .results div:first-child { display: flex; justify-content: space-between; gap: 20px; }
strong { font-size: 14px; } span, small { color: #949494; font-size: 11px; } small { display: block; margin-top: 6px; }
p { margin: 8px 0 0; color: #555; font-size: 13px; line-height: 1.6; } :deep(mark) { padding: 1px 2px; background: #fff1a8; color: inherit; }
.state { padding: 18px; color: #999; text-align: center; } .empty { display: grid; place-content: center; min-height: 240px; text-align: center; } .empty strong, .empty span { display: block; } .empty span { margin-top: 7px; }
</style>
