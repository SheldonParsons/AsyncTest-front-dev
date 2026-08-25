<template>
  <div class="overview-grid" :aria-busy="loading">
    <section class="scroll-section documents-section" aria-labelledby="current-documents-title">
      <header>
        <div>
          <h2 id="current-documents-title">现行文档</h2>
          <p>知识库当前真正生效的正文</p>
        </div>
        <span>{{ status.summary.document_count }} 份</span>
      </header>
      <div class="section-list">
        <button
          v-for="item in documents"
          :key="item.id"
          class="document-row"
          type="button"
          @click="$emit('open-document', item.id)"
        >
          <span class="file-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 2.8h7.6L18.8 8v13.2H6z" stroke="currentColor" stroke-width="1.6" />
              <path d="M13.4 2.8V8h5.4M9 12h6M9 15.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </span>
          <div>
            <strong>{{ item.display_name || item.filename }}</strong>
            <small>第 {{ item.generation_no }} 代 · 提交 #{{ item.commit_seq }} · {{ formatBytes(item.bytes) }} · {{ formatTime(item.updated_at) }}</small>
          </div>
          <code>{{ item.content_hash.slice(0, 8) }}</code>
        </button>
        <p v-if="loading && !documents.length" class="state">正在读取现行文档…</p>
        <div v-else-if="documentError" class="inline-state error" role="alert">
          <span>{{ documentError }}</span>
          <button type="button" @click="load">重试</button>
        </div>
        <div v-else-if="!documents.length" class="inline-state">
          <strong>还没有现行文档</strong>
          <span>确认录入后的正文会显示在这里。</span>
        </div>
      </div>
    </section>

    <section class="scroll-section" aria-labelledby="recent-changes-title">
      <header>
        <div>
          <h2 id="recent-changes-title">最近变更</h2>
          <p>按提交查看正文差异与审计信息</p>
        </div>
        <span>最近 {{ status.summary.recent_commits.length }} 条</span>
      </header>
      <div class="section-list">
        <button
          v-for="item in status.summary.recent_commits"
          :key="item.id"
          class="commit-row"
          type="button"
          @click="$emit('open-commit', item.seq)"
        >
          <span class="kind" :class="`is-${item.kind}`">{{ kindLabel(item.kind) }}</span>
          <div>
            <strong>{{ item.reason || item.request_text || `提交 ${item.seq}` }}</strong>
            <small>{{ item.actor_name || '未知用户' }} · {{ formatTime(item.created_at) }}</small>
          </div>
          <em>#{{ item.seq }}</em>
        </button>
        <div v-if="!status.summary.recent_commits.length" class="inline-state">
          <strong>尚无知识变更</strong>
          <span>第一笔确认录入会形成提交记录。</span>
        </div>
      </div>
    </section>

    <section class="sources-section" aria-labelledby="source-audit-title">
      <header>
        <div>
          <h2 id="source-audit-title">原始来源记录</h2>
          <p>保留录入凭证；系统生成的现行副本不在这里重复展示</p>
        </div>
        <span>{{ originalSources.length }} / {{ status.summary.source_count }} 条</span>
      </header>
      <div class="section-list source-list">
        <button
          v-for="item in originalSources"
          :key="item.id"
          class="source-row"
          type="button"
          @click="$emit('open-source', item.id)"
        >
          <div>
            <strong>{{ item.display_name || item.filename }}</strong>
            <small>{{ item.display_kind }} · 提交 #{{ item.commit_seq }} · {{ formatChars(item.chars) }}</small>
          </div>
          <code>{{ item.content_hash.slice(0, 10) }}</code>
        </button>
        <p v-if="loading && !originalSources.length" class="state">正在读取来源记录…</p>
        <div v-else-if="sourceError" class="inline-state error" role="alert">
          <span>{{ sourceError }}</span>
          <button type="button" @click="load">重试</button>
        </div>
        <div v-else-if="!originalSources.length" class="inline-state">
          <strong>尚无原始来源记录</strong>
          <span>文件、粘贴与对话录入会留下不可变凭证。</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  getKnowledgeDocuments,
  getKnowledgeSources,
  type KnowledgeDocumentSummary,
  type KnowledgeSourceSummary,
  type KnowledgeStatus,
} from '../../api'

const props = defineProps<{ projectId: string; status: KnowledgeStatus; revision?: number }>()
defineEmits<{
  'open-document': [id: string]
  'open-source': [id: string]
  'open-commit': [seq: number]
}>()

const documents = ref<KnowledgeDocumentSummary[]>([])
const sources = ref<KnowledgeSourceSummary[]>([])
const loading = ref(false)
const documentError = ref('')
const sourceError = ref('')
let requestEpoch = 0
let loadedProjectId = ''

const originalSources = computed(() => sources.value
  .filter(item => item.source_kind !== 'synthetic')
  .slice(0, 8))

watch(
  () => [props.projectId, props.revision] as const,
  () => { void load() },
  { immediate: true },
)

async function load() {
  const epoch = ++requestEpoch
  const projectId = props.projectId
  if (!projectId) {
    documents.value = []
    sources.value = []
    loadedProjectId = ''
    return
  }
  if (projectId !== loadedProjectId) {
    documents.value = []
    sources.value = []
    loadedProjectId = projectId
  }
  loading.value = true
  documentError.value = ''
  sourceError.value = ''
  const [documentResult, sourceResult] = await Promise.allSettled([
    getKnowledgeDocuments(projectId, { limit: 12 }),
    getKnowledgeSources(projectId, { limit: 50 }),
  ])
  if (epoch !== requestEpoch || projectId !== props.projectId) return
  if (documentResult.status === 'fulfilled') documents.value = documentResult.value.items
  else documentError.value = messageOf(documentResult.reason, '现行文档读取失败')
  if (sourceResult.status === 'fulfilled') sources.value = sourceResult.value.items
  else sourceError.value = messageOf(sourceResult.reason, '来源记录读取失败')
  loading.value = false
}

function messageOf(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback
}

function kindLabel(kind: string) {
  return ({ ingest: '录入', modify: '修改', delete: '删除', structure: '结构', rebuild: '重建' } as Record<string, string>)[kind] || kind
}

function formatTime(value: string) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未知时间'
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatChars(chars: number) {
  return chars >= 1000 ? `${(chars / 1000).toFixed(1)}k 字符` : `${chars} 字符`
}
</script>

<style scoped lang="scss">
.overview-grid,
.overview-grid * { box-sizing: border-box; }
.overview-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 30px 38px; width: 100%; height: 100%; min-width: 0; min-height: 0; overflow-y: auto; padding: 26px 30px 48px; }
section { min-width: 0; }
.scroll-section,
.sources-section { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 260px; max-height: min(48vh, 520px); overflow: hidden; }
.sources-section { grid-column: 1 / -1; min-height: 220px; }
.section-list { min-width: 0; min-height: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
header { display: flex; align-items: start; justify-content: space-between; gap: 20px; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
header div { min-width: 0; }
h2,
header p { margin: 0; }
h2 { color: #1f2937; font-size: 16px; font-weight: 650; }
header p { margin-top: 3px; color: #667085; font-size: 12px; line-height: 1.4; }
header > span,
small { color: #667085; font-size: 12px; }
button { width: 100%; min-height: 48px; border: 0; background: transparent; color: #202124; text-align: left; cursor: pointer; }
button:focus-visible { position: relative; z-index: 1; outline: 2px solid #475569; outline-offset: -2px; }
.document-row,
.commit-row,
.source-row { display: grid; align-items: center; min-height: 58px; padding: 8px 7px; border-bottom: 1px solid #eef0f2; transition: background .16s ease; }
.document-row:hover,
.commit-row:hover,
.source-row:hover { background: #f4f6f8; }
.document-row { grid-template-columns: 30px minmax(0, 1fr) max-content; gap: 10px; }
.file-icon { display: grid; width: 28px; height: 32px; place-items: center; border-radius: 5px; background: #eef2f6; color: #475569; }
.commit-row { grid-template-columns: 48px minmax(0, 1fr) 42px; gap: 10px; }
.source-row { grid-template-columns: minmax(0, 1fr) max-content; gap: 16px; }
.document-row > div,
.commit-row > div,
.source-row > div { min-width: 0; }
strong,
small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
strong { font-size: 13px; font-weight: 600; }
small { margin-top: 4px; }
em { color: #667085; font-size: 11px; font-style: normal; text-align: right; }
.kind { justify-self: start; padding: 4px 7px; border-radius: 4px; background: #eef0f2; color: #525866; font-size: 11px; }
.kind.is-ingest { background: #e7f4eb; color: #2f6b43; }
.kind.is-delete { background: #fae9e9; color: #934141; }
.kind.is-modify { background: #e9eef4; color: #455f78; }
code { min-width: 0; color: #667085; font-size: 11px; white-space: nowrap; }
.state { padding: 18px 6px; color: #667085; font-size: 12px; text-align: center; }
.inline-state { display: grid; place-content: center; min-height: 112px; color: #667085; text-align: center; }
.inline-state strong { color: #3b4351; }
.inline-state span { margin-top: 5px; font-size: 12px; }
.inline-state.error { color: #9f3838; }
.inline-state button { width: auto; min-height: 36px; margin: 8px auto 0; border: 1px solid #d5d9df; border-radius: 5px; padding: 0 12px; background: #fff; text-align: center; }
@media (max-width: 760px) {
  .overview-grid { grid-template-columns: 1fr; padding: 20px 16px 40px; }
  .sources-section { grid-column: auto; }
  .scroll-section,
  .sources-section { max-height: none; }
}
@media (prefers-reduced-motion: reduce) {
  .document-row,
  .commit-row,
  .source-row { transition: none; }
}
</style>
