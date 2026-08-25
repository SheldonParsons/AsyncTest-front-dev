<template>
  <div class="search-panel" :aria-busy="loading">
    <div class="search-head">
      <form class="search-bar" role="search" @submit.prevent="submitSearch">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" />
          <path d="m16.5 16.5 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <label class="sr-only" for="knowledge-search-input">搜索现行文档</label>
        <input
          id="knowledge-search-input"
          v-model="inputQuery"
          type="search"
          autocomplete="off"
          placeholder="搜索文档标题、文件名或正文…"
          @keydown.esc.prevent="clearSearch"
          @search="handleNativeSearch"
        />
        <button class="submit" type="submit" :disabled="loading">{{ loading ? '搜索中' : '搜索' }}</button>
      </form>
      <p class="search-summary" aria-live="polite">
        <template v-if="submittedQuery">“{{ submittedQuery }}” · {{ hitCount }} 处命中</template>
        <template v-else>{{ documents.length || documentCount }} 份现行文档</template>
      </p>
    </div>

    <div class="results" @scroll.passive="loadMore">
      <template v-if="!submittedQuery">
        <button
          v-for="item in documents"
          :key="item.id"
          class="document-result"
          type="button"
          @click="$emit('open-document', item.id, 0)"
        >
          <span class="document-icon" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M6 3h8l4 4v14H6z" stroke="currentColor" stroke-width="1.6" />
              <path d="M14 3v5h4M9 12h6M9 16h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </span>
          <div>
            <strong>{{ item.display_name || item.filename }}</strong>
            <small>第 {{ item.generation_no }} 代 · 提交 #{{ item.commit_seq }} · {{ formatBytes(item.bytes) }}</small>
          </div>
          <time>{{ formatDate(item.updated_at) }}</time>
        </button>
      </template>

      <section v-for="group in groupedHits" v-else :key="group.documentId" class="result-group">
        <header>
          <strong>{{ group.displayName }}</strong>
          <span>{{ group.items.length }} 处命中</span>
        </header>
        <button
          v-for="item in group.items"
          :key="item.id"
          type="button"
          @click="$emit('open-document', item.document_id, firstMatchOffset(item))"
        >
          <div class="hit-title">
            <strong v-html="highlight(item.title_path[item.title_path.length - 1] || item.display_name || item.filename)" />
            <span>提交 #{{ item.commit_seq }}</span>
          </div>
          <small v-if="item.breadcrumb" v-html="highlight(item.breadcrumb)" />
          <p v-html="highlight(snippet(item))" />
        </button>
      </section>

      <p v-if="loading && !hasVisibleResults" class="state" aria-live="polite">正在读取现行内容…</p>
      <div v-else-if="error" class="empty error" role="alert">
        <strong>搜索暂时不可用</strong>
        <span>{{ error }}</span>
        <button type="button" @click="runSearch(true)">重试</button>
      </div>
      <div v-else-if="!hasVisibleResults" class="empty">
        <strong>{{ submittedQuery ? '没有匹配内容' : '还没有现行文档' }}</strong>
        <span>{{ submittedQuery ? '试试更短的原文片段、编号或文件名。' : '确认录入后的正文会出现在这里。' }}</span>
        <button v-if="submittedQuery" type="button" @click="clearSearch">查看全部文档</button>
      </div>
      <p v-else-if="loading" class="state" aria-live="polite">继续读取…</p>
      <p v-else-if="cursor === null" class="state">已显示全部结果。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  getKnowledgeDocuments,
  searchKnowledge,
  type KnowledgeDocumentSummary,
  type KnowledgeSearchHit,
} from '../../api'

const props = defineProps<{
  projectId: string
  documentCount?: number
  initialQuery?: string
  revision?: number
}>()
const emit = defineEmits<{
  'open-document': [documentId: string, offset: number]
  'query-change': [query: string]
}>()

const inputQuery = ref(props.initialQuery || '')
const submittedQuery = ref('')
const documents = ref<KnowledgeDocumentSummary[]>([])
const hits = ref<KnowledgeSearchHit[]>([])
const cursor = ref<number | null>(null)
const loading = ref(false)
const error = ref('')
let requestEpoch = 0

const groupedHits = computed(() => {
  const groups = new Map<string, { documentId: string; displayName: string; items: KnowledgeSearchHit[] }>()
  for (const item of hits.value) {
    const key = item.document_id
    const group = groups.get(key) || {
      documentId: key,
      displayName: item.display_name || item.filename || '未命名文档',
      items: [],
    }
    group.items.push(item)
    groups.set(key, group)
  }
  return [...groups.values()]
})
const hitCount = computed(() => hits.value.length)
const hasVisibleResults = computed(() => submittedQuery.value ? hits.value.length > 0 : documents.value.length > 0)

watch(
  () => [props.projectId, props.revision] as const,
  () => { void runSearch(true) },
  { immediate: true },
)
watch(() => props.initialQuery, (value) => {
  const next = String(value || '')
  if (next === inputQuery.value && next === submittedQuery.value) return
  inputQuery.value = next
  void runSearch(true)
})
onBeforeUnmount(() => { requestEpoch += 1 })

function submitSearch() {
  void runSearch(true)
}

function clearSearch() {
  inputQuery.value = ''
  void runSearch(true)
}

function handleNativeSearch(event: Event) {
  if (!(event.currentTarget as HTMLInputElement).value) clearSearch()
}

async function runSearch(reset: boolean) {
  if (!props.projectId || (!reset && (loading.value || cursor.value === null))) return
  const epoch = ++requestEpoch
  const projectId = props.projectId
  const query = reset ? inputQuery.value.trim() : submittedQuery.value
  if (reset) {
    submittedQuery.value = query
    emit('query-change', query)
    cursor.value = null
    error.value = ''
  }
  loading.value = true
  try {
    const offset = reset ? 0 : cursor.value || 0
    if (query) {
      const page = await searchKnowledge(projectId, { q: query, limit: 50, cursor: offset })
      if (epoch !== requestEpoch || projectId !== props.projectId) return
      hits.value = reset ? page.items : [...hits.value, ...page.items]
      if (reset) documents.value = []
      cursor.value = page.next_cursor ?? null
    } else {
      const page = await getKnowledgeDocuments(projectId, { limit: 50, cursor: offset })
      if (epoch !== requestEpoch || projectId !== props.projectId) return
      documents.value = reset ? page.items : [...documents.value, ...page.items]
      if (reset) hits.value = []
      cursor.value = page.next_cursor ?? null
    }
  } catch (reason) {
    if (epoch !== requestEpoch || projectId !== props.projectId) return
    error.value = reason instanceof Error && reason.message ? reason.message : '请稍后重试。'
    if (reset) {
      documents.value = []
      hits.value = []
    }
  } finally {
    if (epoch === requestEpoch) loading.value = false
  }
}

async function loadMore(event: Event) {
  const el = event.currentTarget as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) await runSearch(false)
}

function snippet(item: KnowledgeSearchHit) {
  const value = String(item.text || '').replace(/\s+/g, ' ').trim()
  const matchOffset = firstQueryMatch(value)
  if (matchOffset < 0) return value.slice(0, 320)
  const start = Math.max(0, matchOffset - 100)
  const end = Math.min(value.length, Math.max(start + 320, matchOffset + submittedQuery.value.length))
  return `${start > 0 ? '…' : ''}${value.slice(start, end)}${end < value.length ? '…' : ''}`
}

function firstRelativeMatchOffset(item: KnowledgeSearchHit) {
  const text = String(item.text || '')
  const query = submittedQuery.value
  const backendOffset = Array.isArray(item.match_range) && item.match_range.length === 2
    ? Number(item.match_range[0])
    : -1
  let relativeOffset = query ? text.indexOf(query) : -1
  if (relativeOffset < 0 && query) {
    relativeOffset = text.toLocaleLowerCase('zh-CN').indexOf(query.toLocaleLowerCase('zh-CN'))
  }
  if (relativeOffset < 0 && Number.isInteger(backendOffset) && backendOffset >= 0) relativeOffset = backendOffset
  return relativeOffset
}

function firstMatchOffset(item: KnowledgeSearchHit) {
  const relativeOffset = firstRelativeMatchOffset(item)
  return Math.max(0, Number(item.start_offset || 0) + Math.max(0, relativeOffset))
}

function firstQueryMatch(value: string) {
  const lowerValue = value.toLocaleLowerCase('zh-CN')
  const terms = queryTerms()
  const offsets = terms.map(term => lowerValue.indexOf(term.toLocaleLowerCase('zh-CN'))).filter(offset => offset >= 0)
  return offsets.length ? Math.min(...offsets) : -1
}

function queryTerms() {
  const query = submittedQuery.value.trim()
  if (!query) return []
  const terms = query.split(/\s+/).filter(Boolean)
  return terms.length > 1 ? [query, ...terms] : terms
}

function escape(value: string) {
  return String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char))
}

function highlight(value: string) {
  const safe = escape(value)
  const terms = [...new Set(queryTerms().map(escape))].sort((left, right) => right.length - left.length)
  if (!terms.length) return safe
  return safe.replace(new RegExp(terms.map(escapeRegExp).join('|'), 'gi'), match => `<mark>${match}</mark>`)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatDate(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<style scoped lang="scss">
.search-panel { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; min-height: 0; background: #fff; }
.search-head { padding: 18px max(18px, calc((100% - 960px) / 2)) 10px; border-bottom: 1px solid #eef0f2; }
.search-bar { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 9px; width: 100%; padding: 6px 7px 6px 13px; border: 1px solid #cfd4da; border-radius: 8px; color: #667085; background: #fff; }
.search-bar:focus-within { border-color: #667085; box-shadow: 0 0 0 3px rgba(71, 85, 105, .1); }
input { min-width: 0; height: 32px; border: 0; outline: 0; color: #202124; background: transparent; font: inherit; font-size: 14px; }
input::-webkit-search-cancel-button { width: 28px; height: 28px; margin: 0; border-radius: 5px; background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='m7 7 10 10M17 7 7 17' stroke='%23526b88' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center / 14px no-repeat; cursor: pointer; transition: background-color .14s ease; -webkit-appearance: none; }
input::-webkit-search-cancel-button:hover { background-color: #eef1f4; }
input::-webkit-search-cancel-button:active { background-color: #dfe5ea; }
.submit { border: 0; border-radius: 5px; cursor: pointer; }
.submit { min-width: 64px; height: 34px; padding: 0 14px; background: #171717; color: #fff; }
.submit:disabled { cursor: wait; opacity: .65; }
.submit:focus-visible,
.results button:focus-visible { outline: 2px solid #475569; outline-offset: 2px; }
.search-summary { min-height: 18px; margin: 8px 2px 0; color: #667085; font-size: 12px; }
.results { min-height: 0; overflow-y: auto; padding: 8px max(18px, calc((100% - 960px) / 2)) 50px; }
.document-result { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 12px; width: 100%; min-height: 62px; padding: 10px 8px; border: 0; border-bottom: 1px solid #eceff2; background: transparent; color: #262626; text-align: left; cursor: pointer; }
.document-result:hover,
.result-group > button:hover { background: #f4f6f8; }
.document-icon { display: grid; width: 32px; height: 38px; place-items: center; border-radius: 5px; background: #eef2f6; color: #475569; }
.document-result div { min-width: 0; }
.document-result strong,
.document-result small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.document-result strong { font-size: 14px; }
.document-result small,
.document-result time { margin-top: 4px; color: #667085; font-size: 12px; }
.result-group { margin-top: 12px; border: 1px solid #e1e5e9; border-radius: 7px; overflow: hidden; }
.result-group > header { display: flex; justify-content: space-between; gap: 18px; padding: 10px 13px; border-bottom: 1px solid #e1e5e9; background: #f6f7f9; }
.result-group > header strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-group > header span { color: #667085; font-size: 12px; white-space: nowrap; }
.result-group > button { display: block; width: 100%; min-height: 58px; padding: 13px; border: 0; border-bottom: 1px solid #eceff2; background: #fff; color: #262626; text-align: left; cursor: pointer; }
.result-group > button:last-child { border-bottom: 0; }
.hit-title { display: flex; justify-content: space-between; gap: 20px; }
.hit-title strong { font-size: 13px; }
.hit-title span,
.result-group small { color: #667085; font-size: 12px; }
.result-group small { display: block; margin-top: 5px; }
.result-group p { margin: 7px 0 0; color: #475467; font-size: 13px; line-height: 1.65; }
:deep(mark) { border-radius: 2px; padding: 1px 2px; background: #fff1a8; color: inherit; }
.state { padding: 18px; color: #667085; font-size: 12px; text-align: center; }
.empty { display: grid; place-content: center; min-height: 240px; color: #667085; text-align: center; }
.empty strong { color: #344054; font-size: 14px; }
.empty span { margin-top: 7px; font-size: 12px; }
.empty button { width: max-content; min-height: 36px; margin: 12px auto 0; border: 1px solid #cfd4da; border-radius: 5px; padding: 0 12px; background: #fff; color: #344054; cursor: pointer; }
.empty.error { color: #9f3838; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@media (max-width: 620px) {
  .search-head { padding: 12px 12px 8px; }
  .results { padding-inline: 12px; }
  .search-bar { grid-template-columns: auto minmax(0, 1fr) auto; }
  .submit { min-width: 56px; padding-inline: 10px; }
  .document-result { grid-template-columns: 32px minmax(0, 1fr); }
  .document-result time { display: none; }
}
</style>
