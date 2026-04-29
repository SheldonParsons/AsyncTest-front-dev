<template>
  <div :class="['debug-console', { 'debug-console-window': isDebugWindow }]">
    <aside class="debug-sidebar">
      <div class="debug-brand">
        <div class="debug-mark">
          <el-icon><Monitor /></el-icon>
        </div>
        <div>
          <h1>Admin Debug</h1>
          <p>Trace Console</p>
        </div>
      </div>

      <div class="debug-kb-filter">
        <label>知识库</label>
        <div class="debug-kb-row">
          <select v-model="selectedKbId">
            <option value="">全部 / 未选择</option>
            <option v-for="kb in kbOptions" :key="kb.id" :value="String(kb.id)">
              {{ kb.name }} · #{{ kb.id }}
            </option>
          </select>
          <button title="刷新" @click="refreshActive">
            <el-icon><Refresh /></el-icon>
          </button>
        </div>
      </div>

      <nav class="debug-nav">
        <div v-for="group in navGroups" :key="group.title" class="debug-nav-group">
          <span>{{ group.title }}</span>
          <button
            v-for="item in group.items"
            :key="item.key"
            :class="{ active: activeView === item.key }"
            @click="selectView(item.key)"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            {{ item.label }}
          </button>
        </div>
      </nav>
    </aside>

    <main class="debug-main">
      <header class="debug-header">
        <div>
          <p class="debug-eyebrow">{{ activeMeta.group }}</p>
          <h2>{{ activeMeta.label }}</h2>
        </div>
        <div class="debug-actions">
          <button :title="isDebugWindow ? '关闭调试窗口' : '返回上一个页面'" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            {{ isDebugWindow ? '关闭' : '返回' }}
          </button>
          <button @click="refreshActive">
            <el-icon><Refresh /></el-icon>
            刷新
          </button>
          <button v-if="isTraceView" class="danger-ghost" @click="handleClearTrace">
            <el-icon><Delete /></el-icon>
            清空日志
          </button>
        </div>
      </header>

      <section v-if="isTraceView" class="debug-trace-layout">
        <div class="trace-list">
          <div v-if="loading" class="debug-empty">加载中...</div>
          <div v-else-if="traceGroups.length === 0" class="debug-empty">暂无日志</div>
          <template v-else>
            <button
              v-for="group in traceGroups"
              :key="group.trace_id"
              :class="['trace-card', { active: selectedTraceId === group.trace_id }]"
              @click="selectedTraceId = group.trace_id"
            >
              <span class="trace-action">{{ group.action }}</span>
              <strong>{{ group.title }}</strong>
              <small>{{ group.events.length }} events · {{ formatTime(group.start) }} → {{ formatTime(group.latest) }}</small>
              <em>{{ formatDuration(group.durationMs) }}</em>
            </button>
          </template>
        </div>

        <div class="trace-detail">
          <div v-if="!selectedTrace" class="debug-empty">选择一条 trace 查看详情</div>
          <template v-else>
            <div class="trace-detail-head">
              <div>
                <p>{{ selectedTrace.action }}</p>
                <h3>{{ selectedTrace.trace_id }}</h3>
              </div>
              <button class="copy-btn" @click="copy(selectedTrace.trace_id)">复制 ID</button>
            </div>

            <div class="timeline">
              <article v-for="event in selectedTrace.events" :key="event.id" :class="['timeline-event', event.level]">
                <div class="timeline-dot" />
                <div class="timeline-body">
                  <div class="timeline-title">
                    <strong>{{ event.step }}</strong>
                    <span>{{ formatTime(event.created_at) }}</span>
                  </div>
                  <p>{{ event.message }}</p>

                  <div v-if="markdownPayload(event)" class="markdown-panel" v-html="renderMarkdown(markdownPayload(event) || '')" />
                  <pre v-else-if="hasPayload(event)" class="payload-json">{{ stringify(event.payload) }}</pre>
                </div>
              </article>
            </div>
          </template>
        </div>
      </section>

      <section v-else-if="activeView === 'maintenance'" class="maintenance-grid">
        <div class="tool-panel">
          <h3>清空 Phase 5 索引</h3>
          <p>只清理当前 KB 的自动索引和缓存。请先填写 KB ID。</p>
          <div class="tool-actions">
            <button :disabled="!kbId" @click="clearIndex('term')">清空 term</button>
            <button :disabled="!kbId" @click="clearIndex('ref')">清空 ref</button>
            <button :disabled="!kbId" @click="clearIndex('outline')">清空 outline cache</button>
            <button :disabled="!kbId" class="danger" @click="clearIndex('all')">清空全部</button>
          </div>
        </div>
        <div class="tool-panel">
          <h3>最近维护结果</h3>
          <pre class="payload-json">{{ maintenanceResult || '暂无操作' }}</pre>
        </div>
      </section>

      <section v-else class="data-panel">
        <div v-if="!kbId" class="debug-empty">请输入 KB ID 后查看数据表</div>
        <template v-else>
          <div class="data-table-wrap">
            <table>
              <thead>
                <tr>
                  <th v-for="col in tableColumns" :key="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in tableRows" :key="row.id || row.term || index" @click="selectedRow = row">
                  <td v-for="col in tableColumns" :key="col">{{ cell(row, col) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <aside class="row-inspector">
            <h3>详情</h3>
            <pre class="payload-json">{{ selectedRow ? stringify(selectedRow) : '选择一行查看 JSON' }}</pre>
          </aside>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { ArrowLeft, Delete, Document, Files, Monitor, Refresh, Tickets, Tools, Warning } from '@element-plus/icons-vue'
import {
  clearDebugEvents,
  clearDebugIndex,
  listDebugEvents,
  listDebugOutlineCache,
  listDebugRefs,
  listDebugTermDict,
  listDebugTermIndex,
  type DebugTraceEvent,
} from './api'
import { listKB } from '@/views/electron_views/agent/knowledge/api'
import type { KnowledgeBase } from '@/types/knowledge'

type ViewKey = 'trace' | 'summary' | 'llm' | 'index' | 'refs' | 'termIndex' | 'termDict' | 'outline' | 'maintenance'

const activeView = ref<ViewKey>('trace')
const route = useRoute()
const router = useRouter()
const selectedKbId = ref('')
const kbOptions = ref<KnowledgeBase[]>([])
const events = ref<DebugTraceEvent[]>([])
const tableRows = ref<any[]>([])
const selectedTraceId = ref('')
const selectedRow = ref<any | null>(null)
const loading = ref(false)
const maintenanceResult = ref('')

const navGroups = [
  {
    title: '运行日志',
    items: [
      { key: 'trace', label: '行为追踪', icon: Document },
      { key: 'summary', label: 'Summary 日志', icon: Tickets },
      { key: 'llm', label: 'LLM 对话', icon: Files },
      { key: 'index', label: '索引执行', icon: Warning },
    ],
  },
  {
    title: '数据检查',
    items: [
      { key: 'refs', label: 'kb_block_ref', icon: Files },
      { key: 'termIndex', label: 'kb_term_index', icon: Files },
      { key: 'termDict', label: 'kb_term_dict', icon: Files },
      { key: 'outline', label: 'outline cache', icon: Files },
    ],
  },
  {
    title: '维护工具',
    items: [{ key: 'maintenance', label: '清空索引', icon: Tools }],
  },
] as const

const kbId = computed(() => selectedKbId.value ? Number(selectedKbId.value) : null)
const windowKey = computed(() => String(route.query.windowKey || 'main'))
const isDebugWindow = computed(() => windowKey.value === 'admin-debug-console')
const isTraceView = computed(() => ['trace', 'summary', 'llm', 'index'].includes(activeView.value))
const activeMeta = computed(() => {
  for (const group of navGroups) {
    const item = group.items.find((it) => it.key === activeView.value)
    if (item) return { group: group.title, label: item.label }
  }
  return { group: '', label: '' }
})

const traceGroups = computed(() => {
  const map = new Map<string, DebugTraceEvent[]>()
  for (const event of events.value) {
    const list = map.get(event.trace_id) || []
    list.push(event)
    map.set(event.trace_id, list)
  }
  return Array.from(map.entries()).map(([trace_id, list]) => {
    const sorted = [...list].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    return {
      trace_id,
      events: sorted,
      action: sorted[0]?.action || '',
      title: sorted[0]?.message || trace_id,
      start: sorted[0]?.created_at,
      latest: sorted[sorted.length - 1]?.created_at,
      durationMs: diffMs(sorted[0]?.created_at, sorted[sorted.length - 1]?.created_at),
    }
  }).sort((a, b) => String(b.latest).localeCompare(String(a.latest)))
})

const selectedTrace = computed(() => traceGroups.value.find((group) => group.trace_id === selectedTraceId.value) || traceGroups.value[0])

const tableColumns = computed(() => {
  if (activeView.value === 'refs') return ['matched_term', 'status', 'confidence', 'source_node_id', 'source_block_id', 'target_node_id', 'updated_at']
  if (activeView.value === 'termIndex') return ['term', 'context', 'confidence', 'node_id', 'block_id', 'extractor', 'updated_at']
  if (activeView.value === 'termDict') return ['canonical', 'type', 'status', 'synonyms', 'updated_at']
  if (activeView.value === 'outline') return ['level', 'scope_type', 'scope_id', 'content_hash', 'compiled_at', 'updated_at']
  return []
})

onMounted(async () => {
  await loadKbOptions()
  await refreshActive()
})

async function loadKbOptions() {
  kbOptions.value = await listKB()
}

function selectView(key: ViewKey) {
  activeView.value = key
  selectedRow.value = null
  refreshActive()
}

function goBack() {
  if (isDebugWindow.value && window.electronAPI?.wm?.close) {
    window.electronAPI.wm.close(windowKey.value)
    return
  }
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/home')
}

async function refreshActive() {
  loading.value = true
  try {
    if (isTraceView.value) {
      const category = activeView.value === 'trace' ? undefined : activeView.value
      events.value = await listDebugEvents({ kb_id: kbId.value, category, limit: 500 })
      selectedTraceId.value = traceGroups.value[0]?.trace_id || ''
    } else if (kbId.value && activeView.value === 'refs') {
      tableRows.value = await listDebugRefs(kbId.value)
    } else if (kbId.value && activeView.value === 'termIndex') {
      tableRows.value = await listDebugTermIndex(kbId.value)
    } else if (kbId.value && activeView.value === 'termDict') {
      tableRows.value = await listDebugTermDict(kbId.value)
    } else if (kbId.value && activeView.value === 'outline') {
      tableRows.value = await listDebugOutlineCache(kbId.value)
    }
  } finally {
    loading.value = false
  }
}

async function handleClearTrace() {
  await clearDebugEvents(kbId.value)
  await refreshActive()
}

async function clearIndex(target: 'term' | 'ref' | 'outline' | 'all') {
  if (!kbId.value) return
  if (!window.confirm(`确认清空 ${target}？`)) return
  const result = await clearDebugIndex(kbId.value, target)
  maintenanceResult.value = stringify(result)
  await refreshActive()
}

function cell(row: any, col: string) {
  const value = row[col]
  if (Array.isArray(value)) return value.join(', ')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return value ?? ''
}

function stringify(value: any) {
  return JSON.stringify(value, null, 2)
}

function hasPayload(event: DebugTraceEvent) {
  return event.payload && Object.keys(event.payload).length > 0
}

function markdownPayload(event: DebugTraceEvent) {
  return event.payload?.response_markdown || event.payload?.prompt_markdown || ''
}

function renderMarkdown(src: string) {
  return marked.parse(src || '') as string
}

function formatTime(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

function diffMs(start?: string | null, end?: string | null) {
  if (!start || !end) return 0
  return Math.max(0, new Date(end).getTime() - new Date(start).getTime())
}

function formatDuration(ms: number) {
  if (!ms) return '0 ms'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

async function copy(text: string) {
  await navigator.clipboard?.writeText(text)
}
</script>

<style scoped lang="scss">
.debug-console {
  height: calc(100vh - 55px);
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  background: #f5f7fb;
  color: #172033;
  overflow: hidden;
}

.debug-console-window {
  height: 100vh;
}

.debug-sidebar {
  border-right: 1px solid #d8dee9;
  background: #111827;
  color: #e5e7eb;
  padding: 16px;
  overflow: auto;
}

.debug-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 4px 18px;

  h1 {
    font-size: 17px;
    margin: 0;
  }

  p {
    margin: 2px 0 0;
    color: #9ca3af;
    font-size: 12px;
  }
}

.debug-mark {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #0f766e;
}

.debug-kb-filter {
  label {
    font-size: 12px;
    color: #9ca3af;
  }
}

.debug-kb-row {
  display: grid;
  grid-template-columns: 1fr 34px;
  gap: 8px;
  margin-top: 6px;

  input,
  select,
  button {
    height: 34px;
    border-radius: 6px;
    border: 1px solid #374151;
    background: #1f2937;
    color: #f9fafb;
  }

  input,
  select {
    padding: 0 10px;
    min-width: 0;
  }
}

.debug-nav-group {
  margin-top: 20px;

  > span {
    display: block;
    font-size: 12px;
    color: #9ca3af;
    margin-bottom: 6px;
  }

  button {
    width: 100%;
    height: 36px;
    border: 0;
    border-radius: 6px;
    color: #cbd5e1;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    cursor: pointer;
    text-align: left;

    &.active,
    &:hover {
      background: #243244;
      color: #ffffff;
    }
  }
}

.debug-main {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.debug-header {
  height: 72px;
  padding: 0 22px;
  border-bottom: 1px solid #dde3ee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;

  h2 {
    margin: 0;
    font-size: 20px;
  }
}

.debug-console-window {
  .debug-header {
    -webkit-app-region: drag;
  }

  .debug-actions,
  .debug-actions button {
    -webkit-app-region: no-drag;
  }
}

.debug-eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  color: #64748b;
}

.debug-actions,
.tool-actions {
  display: flex;
  gap: 8px;

  button {
    height: 34px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    cursor: pointer;

    &.danger,
    &.danger-ghost {
      border-color: #fecaca;
      color: #b91c1c;
    }

    &:disabled {
      opacity: .45;
      cursor: not-allowed;
    }
  }
}

.debug-trace-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
}

.trace-list {
  border-right: 1px solid #dde3ee;
  padding: 14px;
  overflow: auto;
}

.trace-card {
  width: 100%;
  display: block;
  text-align: left;
  padding: 12px;
  border: 1px solid #dbe3ef;
  background: #ffffff;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;

  &.active {
    border-color: #0f766e;
    box-shadow: inset 3px 0 0 #0f766e;
  }

  strong,
  small,
  span {
    display: block;
  }

  small {
    color: #64748b;
    margin-top: 6px;
  }

  em {
    display: inline-block;
    margin-top: 6px;
    font-style: normal;
    color: #0f766e;
    font-size: 12px;
    font-weight: 700;
  }
}

.trace-action {
  color: #0f766e;
  font-size: 12px;
  margin-bottom: 4px;
}

.trace-detail {
  min-width: 0;
  overflow: auto;
  padding: 18px 24px;
}

.trace-detail-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;

  p,
  h3 {
    margin: 0;
  }

  p {
    color: #64748b;
    font-size: 12px;
  }

  h3 {
    font-size: 16px;
  }
}

.copy-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  height: 30px;
  padding: 0 10px;
}

.timeline {
  position: relative;
}

.timeline-event {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 14px;

  &.error .timeline-dot {
    background: #dc2626;
  }
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 9px;
  background: #0f766e;
}

.timeline-body {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  padding: 12px;

  p {
    margin: 8px 0 0;
  }
}

.timeline-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.markdown-panel,
.payload-json {
  margin-top: 10px;
  padding: 12px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.markdown-panel {
  line-height: 1.6;

  :deep(pre) {
    overflow: auto;
    background: #111827;
    color: #e5e7eb;
    padding: 12px;
    border-radius: 6px;
  }
}

.payload-json {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  color: #334155;
}

.data-panel {
  min-height: 0;
  height: 100%;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 14px;
  padding: 14px;
  box-sizing: border-box;
}

.data-table-wrap {
  min-height: 0;
  height: 100%;
  max-height: calc(100vh - 55px - 72px - 28px);
  overflow: auto;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  overscroll-behavior: contain;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    border-bottom: 1px solid #e5e7eb;
    padding: 9px 10px;
    text-align: left;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  th {
    background: #f8fafc;
    color: #475569;
    position: sticky;
    top: 0;
  }

  tbody tr {
    cursor: pointer;

    &:hover {
      background: #f0fdfa;
    }
  }
}

.row-inspector,
.tool-panel {
  min-height: 0;
  height: 100%;
  max-height: calc(100vh - 55px - 72px - 28px);
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  padding: 14px;
  overflow: auto;
  box-sizing: border-box;
}

.debug-console-window {
  .data-table-wrap,
  .row-inspector,
  .tool-panel {
    max-height: calc(100vh - 72px - 28px);
  }
}

.row-inspector {
  display: flex;
  flex-direction: column;

  h3 {
    flex: 0 0 auto;
  }

  .payload-json {
    min-height: 0;
    flex: 1;
    overflow: auto;
  }
}

.maintenance-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, .8fr);
  gap: 14px;
  padding: 14px;
}

.debug-empty {
  color: #64748b;
  padding: 18px;
}
</style>
