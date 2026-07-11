<template>
  <main class="kb-browser" :class="{ 'is-loading': loading }">
    <div class="window-drag" />

    <header class="topbar">
      <div class="title-block">
        <button class="icon-btn" type="button" title="返回对话" aria-label="返回对话" @click="goChat">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="book-mark" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open-icon lucide-book-open"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>
        </span>
        <div class="title-copy">
          <h1>原文浏览</h1>
          <p>{{ selectedProjectName }} · {{ activeTabName }}</p>
        </div>
      </div>

      <div class="top-metrics" aria-label="知识库概况">
        <button v-for="item in displayStatCards" :key="item.label" class="metric-chip" type="button" @click="activeTab = item.target">
          <b>{{ item.value }}</b>
          <i>{{ item.label }}</i>
        </button>
      </div>

      <div class="top-actions">
        <AppSelect
          class="project-select"
          :model-value="selectedAsyncProjectId"
          :options="projectOptions"
          placeholder="选择项目"
          :disabled="loading"
          dropdown-fit-content
          @change="selectProjectById"
        >
          <template #trigger="{ open, label, placeholder }">
            <span class="select-trigger">
              <span class="select-main">
                <span class="select-label">{{ label || placeholder }}</span>
                <span class="select-hint">{{ knowledgeStatus?.current ? `连续文档 · v${knowledgeStatus.current.version}` : '尚无现行知识文档' }}</span>
              </span>
              <svg class="select-caret" :class="{ open }" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </template>
        </AppSelect>
        <span class="top-divider" aria-hidden="true" />
        <button class="text-btn" type="button" :disabled="loading || !vibeProjectId" @click="reloadAll">{{ loading ? '读取中' : '刷新' }}</button>
      </div>
      <span v-if="loading" class="loading-thread" aria-hidden="true" />
    </header>

    <nav class="view-tabs" :style="tabIndicatorStyle" aria-label="知识库浏览视图">
      <span class="tab-indicator" aria-hidden="true" />
      <button v-for="tab in displayTabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <span>{{ tab.label }}</span>
        <small>{{ tab.hint }}</small>
      </button>
    </nav>

    <section v-if="errorText" class="state-line error">{{ errorText }}</section>
    <section v-else-if="loading && !knowledgeStatus" class="state-line">正在读取知识库…</section>

    <section
      v-else
      class="workspace"
      :class="{
        'with-structure': activeTab === 'document',
        'with-detail': activeTab === 'history',
        'focus-detail': activeTab === 'history',
      }"
    >
      <aside v-if="activeTab === 'document'" class="module-pane">
        <div class="pane-head document-pane-head">
          <div>
            <strong>文档结构</strong>
            <span>{{ documentOutline.length }} 个章节</span>
          </div>
        </div>
        <button
          v-for="item in documentOutline"
          :key="item.section_id"
          class="module-row document-outline-row"
          :style="{ '--outline-depth': String(item.level - 1) }"
          type="button"
          @click="jumpToDocumentHeading(item.section_id)"
        >
          <span>{{ item.title }}</span>
          <em>H{{ item.level }}</em>
        </button>
        <p v-if="!documentOutline.length" class="empty-note">尚无文档结构。</p>
      </aside>

      <section class="content-pane">
        <nav
          v-if="activeTab === 'document' && documentPreviewItems.length"
          class="source-minimap-float"
          aria-label="原文位置预览"
          @mouseleave="hoveredPreviewIndex = null"
        >
          <button
            v-for="(item, index) in documentPreviewItems"
            :key="item.id"
            class="source-minimap-row"
            :class="{
              active: hoveredPreviewIndex === null && activePreviewIndex === index,
              hover: hoveredPreviewIndex === index,
              'hover-near-1': hoverDistance(index) === 1,
              'hover-near-2': hoverDistance(index) === 2,
              'hover-near-3': hoverDistance(index) === 3,
              deleted: item.status === 'deleted',
            }"
            type="button"
            @mouseenter="hoveredPreviewIndex = index"
            @focus="hoveredPreviewIndex = index"
            @blur="hoveredPreviewIndex = null"
            @click="jumpToDocumentHeading(item.id)"
          >
            <span class="minimap-line" aria-hidden="true" />
            <div
              v-if="hoveredPreviewIndex === index"
              class="source-preview-card"
            >
              <strong>{{ item.title }}</strong>
              <p>{{ item.excerpt }}</p>
            </div>
          </button>
        </nav>
        <Transition name="panel-fade" mode="out-in">
          <div :key="activeTab" ref="tabSurfaceRef" class="tab-surface" @scroll.passive="handleTabScroll">
        <template v-if="activeTab === 'overview'">
          <div class="overview-layout">
            <section class="plain-section">
              <div class="section-title">
                <h2>模块分布</h2>
                <span>{{ treeModules.length }} 个模块</span>
              </div>
              <div class="module-summary-list">
                <button
                  v-for="item in summary?.top_modules || []"
                  :key="item.module"
                  type="button"
                  class="module-summary-row"
                  @click="selectModule(item.module)"
                >
                  <span>{{ item.module }}</span>
                  <i><b :style="{ width: `${modulePercent(item.active_count)}%` }" /></i>
                  <em>{{ item.active_count }}</em>
                </button>
                <p v-if="!summary?.top_modules?.length" class="empty-note">暂无模块。</p>
              </div>
            </section>

            <section class="plain-section">
              <div class="section-title">
                <h2>最近变更</h2>
                <span>{{ summary?.recent_changes.length || 0 }} 条</span>
              </div>
              <button
                v-for="item in summary?.recent_changes || []"
                :key="item.id"
                class="history-row compact"
                type="button"
                @click="openHistoryFromOverview(item)"
              >
                <span class="op" :class="`op-${item.op}`">{{ opLabel(item.op) }}</span>
                <strong>{{ item.title || lastCrumb(item.breadcrumb) }}</strong>
                <span>{{ actorLabel(item) }}</span>
                <small>{{ formatTime(item.edited_at) }}</small>
              </button>
              <p v-if="!summary?.recent_changes?.length" class="empty-note">暂无变更。</p>
            </section>

            <section class="plain-section source-section">
              <div class="section-title">
                <h2>来源文件</h2>
                <span>{{ knowledgeStatus?.sources.length || 0 }} 份</span>
              </div>
              <button
                v-for="source in knowledgeStatus?.sources || []"
                :key="source.id"
                class="source-row"
                type="button"
                title="下载原始来源"
                @click="downloadSource(source.id)"
              >
                <span>{{ source.filename || '未命名来源' }}</span>
                <small>{{ source.mime_type || 'application/octet-stream' }}</small>
                <em>{{ shortHash(source.content_hash) }}</em>
              </button>
              <p v-if="!knowledgeStatus?.sources.length" class="empty-note">暂无来源文件。</p>
            </section>
          </div>
        </template>

        <template v-else-if="activeTab === 'document'">
          <div class="doc-toolbar">
            <div>
              <strong>{{ knowledgeStatus?.current?.title || '现行知识文档' }}</strong>
              <span v-if="hasKnowledgeDocument">版本 {{ knowledgeStatus?.current?.version }} · {{ shortHash(knowledgeStatus?.current?.content_hash) }}</span>
              <span v-else>尚未初始化</span>
            </div>
          </div>

          <div class="document-shell">
            <article v-if="knowledgeStatus?.current" class="knowledge-document markdown-body" v-html="renderMarkdown(knowledgeStatus.current.markdown)" />
            <p v-else class="empty-note document-empty">尚无现行知识文档。首次录入后，这里会以一份连续 Markdown 展示当前完整需求。</p>
          </div>
        </template>

        <template v-else-if="activeTab === 'search'">
          <div class="search-line">
            <input v-model="searchText" type="search" placeholder="搜索标题、面包屑或正文…" @keydown.enter="runSearch()" />
            <button type="button" @click="runSearch()">搜索</button>
          </div>
          <div class="result-list" @scroll.passive="handleSearchScroll">
            <button v-for="item in searchResults" :key="item.id" class="result-row" type="button" @click="jumpToPassage(item)">
              <strong v-html="highlightSearchText(item.title || lastCrumb(item.breadcrumb), searchText)" />
              <span v-html="highlightSearchText(item.breadcrumb, searchText)" />
              <p v-html="highlightSearchText(snippet(item.body, searchText), searchText)" />
            </button>
            <p v-if="searchLoadingMore" class="empty-note">继续读取搜索结果…</p>
            <p v-else-if="searchRan && searchResults.length && !searchHasMore" class="empty-note">已到底。</p>
            <div v-if="searchRan && !searchResults.length && !searchLoadingMore" class="empty-search">
              <strong>没有命中</strong>
              <span>试试模块名、标题关键词或正文中的原话。</span>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'history'">
          <div class="filter-line">
            <div class="filter-copy">
              <strong>变更流水</strong>
              <span>点击记录后，右侧以文件 diff 形式审计修改内容。</span>
            </div>
            <AppSelect
              class="history-op-select"
              :model-value="historyOp"
              :options="historyOptions"
              placeholder="全部动作"
              @change="selectHistoryOp"
            >
              <template #trigger="{ open, label, placeholder }">
                <span class="select-trigger compact">
                  <span class="select-label">{{ label || placeholder }}</span>
                  <svg class="select-caret" :class="{ open }" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </template>
            </AppSelect>
          </div>
          <div class="history-list" @scroll.passive="handleHistoryScroll">
            <button
              v-for="item in historyItems"
              :id="`history-row-${item.id}`"
              :key="item.id"
              class="history-row"
              :class="{ active: selectedHistory?.id === item.id }"
              type="button"
              @click="openHistoryItem(item)"
            >
              <span class="op" :class="`op-${item.op}`">{{ opLabel(item.op) }}</span>
              <strong>{{ item.title || lastCrumb(item.breadcrumb) }}</strong>
              <span>{{ item.edit_request || '无备注' }}</span>
              <em>{{ actorLabel(item) }}</em>
              <small>{{ formatTime(item.edited_at) }}</small>
            </button>
            <p v-if="historyLoadingMore" class="empty-note">继续读取变更…</p>
            <p v-else-if="historyItems.length && !historyHasMore" class="empty-note">已到底。</p>
            <p v-if="!historyItems.length" class="empty-note">暂无历史。</p>
          </div>
        </template>

        <template v-else>
          <div class="receipt-list">
            <div v-for="item in receipts" :key="item.batch_id" class="receipt-group">
              <button
                class="receipt-row"
                :class="{ active: selectedReceiptBatchId === item.batch_id }"
                type="button"
                @click="openReceipt(item.batch_id)"
              >
                <span class="receipt-row-main">
                  <span class="receipt-title-line">
                    <strong>{{ receiptTitle(item) }}</strong>
                    <em v-if="isModuleDeleteReceipt(item)" class="receipt-kind danger">模块删除</em>
                  </span>
                  <small>{{ item.common_prefix || item.batch_id }}</small>
                  <small v-if="item.common_prefix" class="receipt-batch-id">{{ item.batch_id }}</small>
                </span>
                <span class="receipt-counts" aria-label="批次动作统计">
                  <i class="count-insert"><b>{{ item.inserted }}</b>录入</i>
                  <i class="count-update"><b>{{ item.updated }}</b>修改</i>
                  <i class="count-delete"><b>{{ item.deleted }}</b>删除</i>
                  <i class="count-structure"><b>{{ item.structured }}</b>结构</i>
                </span>
                <time>{{ formatTime(item.ended_at || item.started_at) }}</time>
              </button>
              <section v-if="selectedReceiptBatchId === item.batch_id" class="receipt-inline-detail">
                <div class="receipt-detail-title">
                  <div>
                    <span>{{ receiptOpLabel(selectedReceiptOperation) }}明细</span>
                    <strong>{{ receiptTitle(selectedReceiptOperation) }}</strong>
                    <small v-if="isModuleDeleteReceipt(selectedReceiptOperation)" class="receipt-common-prefix">{{ selectedReceiptOperation.common_prefix }}</small>
                    <small>{{ formatTime(selectedReceipt?.ended_at || selectedReceipt?.started_at) }}</small>
                  </div>
                  <div class="receipt-detail-counts">
                    <span><b>{{ selectedReceipt?.inserted ?? 0 }}</b>录入</span>
                    <span><b>{{ selectedReceipt?.updated ?? 0 }}</b>修改</span>
                    <span><b>{{ selectedReceipt?.deleted ?? 0 }}</b>删除</span>
                    <em>{{ selectedReceiptOperation.affected_count || receiptItems.length }} 条明细</em>
                  </div>
                </div>
                <p v-if="receiptLoading" class="receipt-detail-state">正在读取批次明细…</p>
                <p v-else-if="receiptError" class="receipt-detail-state error">{{ receiptError }}</p>
                <p v-else-if="!receiptItems.length" class="receipt-detail-state">这个批次没有可展示的明细。</p>
                <div v-else class="receipt-detail-list">
                  <article v-for="detail in receiptItems" :key="detail.id" class="receipt-detail">
                    <button class="receipt-detail-head" type="button" @click="openHistoryFromReceipt(detail)">
                      <span class="op" :class="`op-${detail.op}`">{{ opLabel(detail.op) }}</span>
                      <span class="receipt-detail-copy">
                        <strong>{{ detail.title || lastCrumb(detail.breadcrumb) }}</strong>
                        <small>{{ actorLabel(detail) }} · {{ detail.edit_request || detail.batch_id || '无备注' }}</small>
                      </span>
                      <i aria-hidden="true">查看</i>
                    </button>
                    <div v-if="detail.op !== 'insert'" class="receipt-mini-diff">
                      <div v-for="(line, idx) in (detail.diff_lines || []).slice(0, 32)" :key="`${detail.id}-${idx}-${line.text}`" class="diff-line" :class="line.kind">
                        <span class="diff-num">{{ idx + 1 }}</span>
                        <span class="diff-mark">{{ diffPrefix(line.kind) }}</span>
                        <code>{{ line.text || ' ' }}</code>
                      </div>
                    </div>
                    <div v-else class="receipt-content markdown-body" v-html="renderMarkdown(receiptBody(detail))" />
                  </article>
                </div>
              </section>
            </div>
            <p v-if="!receipts.length" class="empty-note">暂无批次回执。旧数据没有 batch_id 时不会强行归批。</p>
          </div>
        </template>
          </div>
        </Transition>
      </section>

      <aside v-if="activeTab === 'history'" class="detail-pane">
        <template v-if="selectedHistory">
          <div class="detail-head">
            <strong>{{ opLabel(selectedHistory.op) }}记录</strong>
            <span class="detail-actions">
              <button class="icon-btn sm" type="button" title="关闭" aria-label="关闭" @click="selectedHistory = null">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
            </span>
          </div>
          <dl class="detail-meta">
            <dt>段落</dt><dd>{{ selectedHistory.title || lastCrumb(selectedHistory.breadcrumb) }}</dd>
            <dt>用户</dt><dd>{{ actorLabel(selectedHistory) }}</dd>
            <dt>批次</dt><dd>{{ selectedHistory.batch_id || '无批次' }}</dd>
            <dt>会话</dt><dd><code>{{ selectedHistory.session_id || '无会话' }}</code></dd>
            <dt>审计</dt><dd><button v-if="selectedHistory.trace_id" class="trace-link" type="button" @click="openTrace(selectedHistory.trace_id)">{{ traceMarker(selectedHistory.trace_id) }}</button><span v-else>无 Trace</span></dd>
            <dt>版本</dt><dd>v{{ selectedHistory.version }}（基于 v{{ selectedHistory.base_version }}）</dd>
            <dt>时间</dt><dd>{{ formatTime(selectedHistory.edited_at) }}</dd>
          </dl>

          <p v-if="selectedHistory.loading" class="empty-note">正在读取版本 diff…</p>
          <div v-else-if="selectedHistory.op !== 'insert'" class="diff-view">
            <div class="diff-header">
              <span>{{ selectedHistory.title || lastCrumb(selectedHistory.breadcrumb) }}</span>
              <strong>{{ selectedHistoryDiff.length }} 行 diff</strong>
            </div>
            <div class="diff-body">
              <div v-for="(line, idx) in selectedHistoryDiff" :key="`${idx}-${line.text}`" class="diff-line" :class="line.kind">
                <span class="diff-num">{{ idx + 1 }}</span>
                <span class="diff-mark">{{ diffPrefix(line.kind) }}</span>
                <code>{{ line.text || ' ' }}</code>
              </div>
            </div>
          </div>
          <div v-else class="history-content">
            <span>录入内容</span>
            <div class="markdown-body" v-html="renderMarkdown(selectedHistory.body_after)" />
          </div>
        </template>

        <p v-else class="empty-note">选择一条变更查看 diff。</p>
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { ApiGetJoinProjects } from '@/api/project/index'
import AppSelect from '@/components/common/select/AppSelect.vue'
import {
  getKnowledgeDiff,
  getKnowledgeSections,
  getKnowledgeSource,
  getKnowledgeStatus,
  getKnowledgeVersions,
  getVibeProjectByAsyncProject,
  initVibeProject,
  type KnowledgeOutlineItem,
  type KnowledgeSection,
  type KnowledgeStatus,
  type KnowledgeVersionSummary,
} from '../api'

type TabKey = 'overview' | 'document' | 'search' | 'history' | 'receipts'
type DiffKind = 'same' | 'add' | 'remove'

interface DiffLine {
  kind: DiffKind
  text: string
}

interface HistoryItem {
  id: number
  version: number
  base_version: number
  project: string
  op: string
  edit_request: string
  batch_id: string | null
  actor_user_id?: number | null
  actor_name?: string
  undone: false
  edited_at: string
  breadcrumb: string
  title: string
  body_before?: string | null
  body_after?: string | null
  body_before_preview?: string
  body_after_preview?: string
  source_ids: string[]
  session_id: string
  trace_id: string
  diff_lines?: DiffLine[]
  loading?: boolean
}

interface ReceiptItem {
  batch_id: string
  operation_kind: string
  common_prefix: string
  affected_count: number
  started_at: string
  ended_at: string
  total: number
  inserted: number
  updated: number
  deleted: number
  structured: number
  edit_request: string
  versions: HistoryItem[]
}

interface ReceiptDetailMeta {
  operation_kind?: string
  common_prefix?: string
  affected_count?: number
}

interface ReceiptDetailCacheEntry {
  meta: ReceiptDetailMeta
  items: HistoryItem[]
}

const route = useRoute()
const router = useRouter()
const tabs: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: 'overview', label: '总览', hint: '现状' },
  { key: 'document', label: '原文', hint: '阅读' },
  { key: 'search', label: '搜索', hint: '定位' },
  { key: 'history', label: '变更', hint: 'diff' },
  { key: 'receipts', label: '回执', hint: '批次' },
]

const historyOptions = [
  { value: '', label: '全部动作', hint: '录入 / 修改 / 删除' },
  { value: 'insert', label: '录入', hint: '新增原文' },
  { value: 'update', label: '修改', hint: '查看 diff' },
  { value: 'delete', label: '删除', hint: '保留删除前内容' },
  { value: 'structure', label: '结构', hint: '模块 / 标题调整' },
]

const projects = ref<any[]>([])
const selectedAsyncProjectId = ref('')
const vibeProjectId = ref('')
const knowledgeStatus = ref<KnowledgeStatus | null>(null)
const historyItems = ref<HistoryItem[]>([])
const receipts = ref<ReceiptItem[]>([])
const receiptItems = ref<HistoryItem[]>([])
const selectedReceiptBatchId = ref('')
const receiptDetailMeta = ref<ReceiptDetailMeta | null>(null)
const receiptDetailCache = ref<Record<string, ReceiptDetailCacheEntry>>({})
const receiptLoading = ref(false)
const receiptError = ref('')
const selectedHistory = ref<HistoryItem | null>(null)
const activeTab = ref<TabKey>('document')
const searchText = ref('')
const searchResults = ref<KnowledgeSection[]>([])
const searchRan = ref(false)
const searchCursor = ref<number | null>(null)
const searchHasMore = ref(false)
const searchLoadingMore = ref(false)
const searchAutoLoaded = ref(false)
const historyOp = ref('')
const historyCursor = ref<number | null>(null)
const historyHasMore = ref(false)
const historyLoadingMore = ref(false)
const loading = ref(false)
const errorText = ref('')
const tabSurfaceRef = ref<HTMLElement | null>(null)
const activePreviewSectionId = ref<string | null>(null)
const hoveredPreviewIndex = ref<number | null>(null)

const projectOptions = computed(() => projects.value.map((project: any) => ({
  value: String(project.id),
  label: project.name || project.project_name || `项目 ${project.id}`,
  hint: project.description || project.owner_name || project.creator_name || '',
})))

const hasKnowledgeDocument = computed(() => Boolean(knowledgeStatus.value?.current))
const displayTabs = computed(() => tabs)
const documentOutline = computed<KnowledgeOutlineItem[]>(() => knowledgeStatus.value?.outline || [])
const recentChanges = computed(() => (knowledgeStatus.value?.summary.recent_changes || []).map(mapVersion))
const summary = computed(() => ({
  project: vibeProjectId.value,
  passages: {
    active: knowledgeStatus.value?.summary.section_count || 0,
    deleted: 0,
    total: knowledgeStatus.value?.summary.section_count || 0,
  },
  modules: knowledgeStatus.value?.summary.module_count || 0,
  sources: knowledgeStatus.value?.summary.source_count || 0,
  history: knowledgeStatus.value?.summary.version_count || 0,
  top_modules: knowledgeStatus.value?.summary.top_modules || [],
  recent_changes: recentChanges.value,
}))
const treeModules = computed(() => knowledgeStatus.value?.summary.top_modules || [])

const selectedProjectName = computed(() => {
  const item = projects.value.find((project: any) => String(project.id) === selectedAsyncProjectId.value)
  return item?.name || item?.project_name || '当前项目'
})

const activeTabName = computed(() => tabs.find(tab => tab.key === activeTab.value)?.label || '原文')
const activeTabIndex = computed(() => Math.max(0, displayTabs.value.findIndex(tab => tab.key === activeTab.value)))
const tabIndicatorStyle = computed(() => ({
  '--active-tab-index': String(activeTabIndex.value),
}))

const displayStatCards = computed<Array<{ label: string; value: number; target: TabKey }>>(() => [
  { label: '当前版本', value: knowledgeStatus.value?.current?.version || 0, target: 'document' },
  { label: '章节', value: documentOutline.value.length, target: 'document' },
  { label: '来源', value: knowledgeStatus.value?.sources?.length || 0, target: 'overview' },
  { label: '历史版本', value: knowledgeStatus.value?.summary.version_count || 0, target: 'history' },
])

const documentPreviewItems = computed(() => sampleOutline(documentOutline.value).map(({ item, sourceIndex }) => ({
  id: item.section_id,
  title: item.title,
  excerpt: outlineExcerpt(item),
  status: 'active',
  sourceIndex,
})))

const activePreviewIndex = computed(() => {
  const items = documentPreviewItems.value
  if (!items.length) return -1
  const activeSourceIndex = documentOutline.value.findIndex(item => item.section_id === activePreviewSectionId.value)
  if (activeSourceIndex < 0) return 0
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  items.forEach((item, index) => {
    const distance = Math.abs(item.sourceIndex - activeSourceIndex)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
})

const selectedHistoryDiff = computed(() => selectedHistory.value?.diff_lines || [])
const selectedReceipt = computed(() => receipts.value.find(item => item.batch_id === selectedReceiptBatchId.value) || null)
const selectedReceiptOperation = computed(() => ({
  operation_kind: receiptDetailMeta.value?.operation_kind || selectedReceipt.value?.operation_kind || '',
  common_prefix: receiptDetailMeta.value?.common_prefix || selectedReceipt.value?.common_prefix || '',
  affected_count: receiptDetailMeta.value?.affected_count ?? selectedReceipt.value?.affected_count ?? receiptItems.value.length,
}))

watch(activeTab, async (tab) => {
  if (!vibeProjectId.value) return
  if (tab === 'document') {
    selectedHistory.value = null
    receiptItems.value = []
    receiptDetailMeta.value = null
    receiptError.value = ''
  }
  if (tab === 'search' && !searchAutoLoaded.value) {
    searchAutoLoaded.value = true
    await runSearch(true)
  }
  if (tab === 'history' && !historyItems.value.length) await loadHistory(true)
  if (tab === 'receipts' && !receipts.value.length) await loadReceipts()
  if (tab === 'document') await nextTick(updateActivePreview)
})

onMounted(bootstrap)

async function bootstrap() {
  loading.value = true
  errorText.value = ''
  try {
    const response: any = await ApiGetJoinProjects({})
    projects.value = Array.isArray(response) ? response : (response?.results || [])
    const queryProject = String(route.query.project || '')
    const saved = localStorage.getItem('vibe_project_source_project_id') || ''
    const target = projects.value.find((item: any) => String(item.id) === queryProject)
      || projects.value.find((item: any) => String(item.id) === saved)
      || projects.value[0]
    if (target) await selectProject(target)
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function selectProjectById(projectId: string | number) {
  const project = projects.value.find((item: any) => String(item.id) === String(projectId))
  if (project) await selectProject(project)
}

async function selectProject(project: any) {
  selectedAsyncProjectId.value = String(project.id)
  localStorage.setItem('vibe_project_source_project_id', String(project.id))
  loading.value = true
  errorText.value = ''
  try {
    let vp
    try {
      vp = await getVibeProjectByAsyncProject(Number(project.id))
    } catch {
      vp = await initVibeProject(Number(project.id), { name: project.name || project.project_name || `项目 ${project.id}` })
    }
    vibeProjectId.value = String(vp.id)
    knowledgeStatus.value = null
    selectedHistory.value = null
    historyItems.value = []
    receipts.value = []
    receiptItems.value = []
    receiptDetailMeta.value = null
    receiptError.value = ''
    selectedReceiptBatchId.value = ''
    receiptDetailCache.value = {}
    searchResults.value = []
    searchRan.value = false
    searchCursor.value = null
    searchHasMore.value = false
    searchAutoLoaded.value = false
    await reloadAll()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function reloadAll() {
  if (!vibeProjectId.value) return
  loading.value = true
  errorText.value = ''
  try {
    knowledgeStatus.value = await getKnowledgeStatus(vibeProjectId.value)
    historyItems.value = []
    receipts.value = []
    if (activeTab.value === 'search') {
      searchAutoLoaded.value = true
      await runSearch(true)
    }
    if (activeTab.value === 'history') await loadHistory(true)
    if (activeTab.value === 'receipts') await loadReceipts()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function reloadDocument() {
  if (!vibeProjectId.value) return
  knowledgeStatus.value = await getKnowledgeStatus(vibeProjectId.value)
}

async function selectModule(namespace: string) {
  activeTab.value = 'document'
  selectedHistory.value = null
  await nextTick()
  const item = documentOutline.value.find(row => row.path[0] === namespace)
  if (item) jumpToDocumentHeading(item.section_id)
}

function shortHash(value?: string) {
  return value ? value.slice(0, 10) : ''
}

function jumpToDocumentHeading(sectionId: string) {
  const root = tabSurfaceRef.value
  const index = documentOutline.value.findIndex(item => item.section_id === sectionId)
  if (index === 0) {
    root?.scrollTo({ top: 0, behavior: 'smooth' })
    activePreviewSectionId.value = sectionId
    return
  }
  const target = index >= 0 ? root?.querySelectorAll<HTMLElement>('.knowledge-document h1, .knowledge-document h2, .knowledge-document h3, .knowledge-document h4, .knowledge-document h5, .knowledge-document h6')[index] : null
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activePreviewSectionId.value = sectionId
}

async function runSearch(reset = true) {
  if (!vibeProjectId.value) return
  if (searchLoadingMore.value) return
  if (!reset && !searchHasMore.value) return
  if (reset) {
    searchResults.value = []
    searchCursor.value = null
    searchHasMore.value = false
  }
  searchRan.value = true
  searchLoadingMore.value = true
  try {
    const data = await getKnowledgeSections(vibeProjectId.value, {
      q: searchText.value.trim(),
      limit: 60,
      cursor: reset ? undefined : searchCursor.value || undefined,
    })
    const items = data.items || []
    searchResults.value = reset ? items : [...searchResults.value, ...items]
    searchCursor.value = data.next_cursor || null
    searchHasMore.value = Boolean(data.next_cursor)
  } finally {
    searchLoadingMore.value = false
  }
}

async function loadHistory(reset = true) {
  if (!vibeProjectId.value) return
  if (historyLoadingMore.value) return
  if (!reset && !historyHasMore.value) return
  historyLoadingMore.value = true
  try {
    const data = await getKnowledgeVersions(vibeProjectId.value, {
      action: historyOp.value || undefined,
      limit: 60,
      before: reset ? undefined : historyCursor.value || undefined,
    })
    const items = (data.items || []).map(mapVersion)
    historyItems.value = reset ? items : [...historyItems.value, ...items]
    historyCursor.value = data.next_cursor || null
    historyHasMore.value = Boolean(data.next_cursor)
  } finally {
    historyLoadingMore.value = false
  }
}

async function selectHistoryOp(op: string | number) {
  historyOp.value = String(op)
  selectedHistory.value = null
  historyCursor.value = null
  historyHasMore.value = false
  await loadHistory(true)
}

async function loadReceipts() {
  if (!vibeProjectId.value) return
  const versions = await fetchAllVersions()
  receipts.value = groupReceipts(versions.map(mapVersion))
  selectedReceiptBatchId.value = ''
  receiptItems.value = []
  receiptDetailMeta.value = null
  receiptError.value = ''
  receiptDetailCache.value = {}
}

async function openReceipt(batchId: string) {
  if (!vibeProjectId.value || !batchId) return
  activeTab.value = 'receipts'
  if (selectedReceiptBatchId.value === batchId) {
    selectedReceiptBatchId.value = ''
    receiptItems.value = []
    receiptDetailMeta.value = null
    receiptError.value = ''
    receiptLoading.value = false
    return
  }
  selectedReceiptBatchId.value = batchId
  selectedHistory.value = null
  receiptError.value = ''

  const cached = receiptDetailCache.value[batchId]
  if (cached) {
    receiptDetailMeta.value = cached.meta
    receiptItems.value = cached.items
    return
  }

  receiptItems.value = []
  receiptLoading.value = true
  try {
    const receipt = receipts.value.find(item => item.batch_id === batchId)
    if (!receipt) throw new Error('回执批次不存在')
    const meta = {
      operation_kind: receipt.operation_kind,
      common_prefix: receipt.common_prefix,
      affected_count: receipt.affected_count,
    }
    const items = await Promise.all(receipt.versions.map(loadHistoryDiff))
    receiptDetailMeta.value = meta
    receiptItems.value = items
    receiptDetailCache.value = {
      ...receiptDetailCache.value,
      [batchId]: { meta, items },
    }
  } catch (error) {
    receiptDetailMeta.value = {
      operation_kind: selectedReceipt.value?.operation_kind || '',
      common_prefix: selectedReceipt.value?.common_prefix || '',
      affected_count: selectedReceipt.value?.affected_count ?? 0,
    }
    receiptError.value = error instanceof Error ? error.message : String(error)
  } finally {
    receiptLoading.value = false
  }
}

async function openHistoryItem(item: HistoryItem) {
  selectedHistory.value = { ...item, loading: true }
  receiptItems.value = []
  receiptDetailMeta.value = null
  receiptError.value = ''
  try {
    selectedHistory.value = await loadHistoryDiff(item)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error))
    selectedHistory.value = { ...item, loading: false }
  }
}

async function loadHistoryDiff(item: HistoryItem): Promise<HistoryItem> {
  if (item.diff_lines && item.body_after !== undefined) return { ...item, loading: false }
  const data = await getKnowledgeDiff(vibeProjectId.value, item.base_version, item.version)
  const loaded = {
    ...item,
    body_before: data.before_markdown,
    body_after: data.after_markdown,
    diff_lines: parseUnifiedDiff(data.diff),
    loading: false,
  }
  historyItems.value = historyItems.value.map(row => row.id === loaded.id ? loaded : row)
  return loaded
}

async function focusHistoryItem(item: HistoryItem, ensureLoaded = false) {
  activeTab.value = 'history'
  if (ensureLoaded && !historyItems.value.length) await loadHistory(true)
  if (!historyItems.value.some(h => h.id === item.id)) {
    historyItems.value = [item, ...historyItems.value]
  }
  await openHistoryItem(item)
  await nextTick()
  requestAnimationFrame(() => {
    document.getElementById(`history-row-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

async function openHistoryFromOverview(item: HistoryItem) {
  await focusHistoryItem(item, true)
}

async function openHistoryFromReceipt(item: HistoryItem) {
  await focusHistoryItem(item)
}

async function handleSearchScroll(event: Event) {
  const el = event.currentTarget as HTMLElement
  if (!el || searchLoadingMore.value || !searchHasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
    await runSearch(false)
  }
}

async function handleHistoryScroll(event: Event) {
  const el = event.currentTarget as HTMLElement
  if (!el || historyLoadingMore.value || !historyHasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
    await loadHistory(false)
  }
}

async function jumpToPassage(item: KnowledgeSection) {
  activeTab.value = 'document'
  selectedHistory.value = null
  receiptItems.value = []
  receiptDetailMeta.value = null
  receiptError.value = ''
  await nextTick()
  jumpToDocumentHeading(item.section_id)
}

function hoverDistance(index: number) {
  if (hoveredPreviewIndex.value === null) return -1
  return Math.abs(hoveredPreviewIndex.value - index)
}

function handleTabScroll() {
  if (activeTab.value !== 'document') return
  requestAnimationFrame(updateActivePreview)
}

function updateActivePreview() {
  if (activeTab.value !== 'document') return
  const items = documentOutline.value
  if (!items.length) {
    activePreviewSectionId.value = null
    return
  }
  const surface = tabSurfaceRef.value
  const surfaceTop = surface?.getBoundingClientRect().top ?? 0
  const headings = surface?.querySelectorAll<HTMLElement>('.knowledge-document h1, .knowledge-document h2, .knowledge-document h3, .knowledge-document h4, .knowledge-document h5, .knowledge-document h6') || []
  let candidate = items[0].section_id
  let bestTop = Number.NEGATIVE_INFINITY
  items.forEach((item, index) => {
    const el = headings[index]
    if (!el) return
    const top = el.getBoundingClientRect().top - surfaceTop
    if (top <= 96 && top > bestTop) {
      candidate = item.section_id
      bestTop = top
    }
  })
  activePreviewSectionId.value = candidate
}

function goChat() {
  router.push({ name: 'vibeKnowledge', query: { ...route.query, project: selectedAsyncProjectId.value || undefined } })
}

function renderMarkdown(content?: string | null) {
  return DOMPurify.sanitize(String(marked.parse(content || '')), {
    USE_PROFILES: { html: true },
  })
}

function parseUnifiedDiff(value: string): DiffLine[] {
  return String(value || '').split(/\r?\n/).reduce<DiffLine[]>((out, line) => {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return out
    if (line.startsWith('+')) out.push({ kind: 'add', text: line.slice(1) })
    else if (line.startsWith('-')) out.push({ kind: 'remove', text: line.slice(1) })
    else if (line.startsWith(' ')) out.push({ kind: 'same', text: line.slice(1) })
    return out
  }, [])
}

function diffPrefix(kind: DiffKind) {
  if (kind === 'add') return '+'
  if (kind === 'remove') return '-'
  return ' '
}

function modulePercent(count: number) {
  const max = Math.max(...(summary.value?.top_modules || []).map(item => item.active_count), 1)
  return Math.max(6, Math.round((count / max) * 100))
}

function opLabel(op?: string) {
  return ({ insert: '录入', update: '修改', delete: '删除', structure: '结构' } as Record<string, string>)[String(op || '')] || (op || '动作')
}

function actorLabel(item?: Pick<HistoryItem, 'actor_name' | 'actor_user_id'> | null) {
  const name = String(item?.actor_name || '').trim()
  if (name && name !== 'null' && name !== 'undefined') return name
  return item?.actor_user_id ? `用户 ${item.actor_user_id}` : '未知'
}

function sampleOutline(items: KnowledgeOutlineItem[]) {
  const maxLines = 40
  if (!items.length) return []
  if (items.length <= maxLines) return items.map((item, sourceIndex) => ({ item, sourceIndex }))
  const sampled: Array<{ item: KnowledgeOutlineItem; sourceIndex: number }> = []
  const used = new Set<number>()
  for (let i = 0; i < maxLines; i += 1) {
    const sourceIndex = Math.round((i * (items.length - 1)) / (maxLines - 1))
    if (used.has(sourceIndex)) continue
    used.add(sourceIndex)
    sampled.push({ item: items[sourceIndex], sourceIndex })
  }
  return sampled
}

function outlineExcerpt(item: KnowledgeOutlineItem) {
  const markdown = knowledgeStatus.value?.current?.markdown || ''
  const [start, end] = item.source_range
  const body = cleanMarkdownPreview(markdown.slice(start, Math.min(end, start + 900)))
  return (body || item.path.join(' > ') || '暂无可预览内容').slice(0, 118)
}

function cleanMarkdownPreview(value: unknown) {
  return String(value || '')
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1 ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`[\]()|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function lastCrumb(value?: string) {
  const parts = String(value || '').split('>').map(s => s.trim()).filter(Boolean)
  return parts[parts.length - 1] || '未命名段落'
}

function snippet(body: string, q: string) {
  const text = String(body || '').replace(/\s+/g, ' ').trim()
  const term = q.trim()
  if (!term) return text.slice(0, 180)
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx < 0) return text.slice(0, 180)
  return text.slice(Math.max(0, idx - 60), idx + term.length + 120)
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightSearchText(value: string, q: string) {
  const text = String(value || '')
  const terms = q.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return escapeHtml(text)
  const pattern = new RegExp(terms.map(escapeRegex).sort((a, b) => b.length - a.length).join('|'), 'gi')
  let html = ''
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    html += escapeHtml(text.slice(last, match.index))
    html += `<mark class="search-hit">${escapeHtml(match[0])}</mark>`
    last = match.index + match[0].length
  }
  html += escapeHtml(text.slice(last))
  return html
}

function receiptTitle(item?: Partial<ReceiptItem & ReceiptDetailMeta> | null) {
  const editRequest = String(item?.edit_request || '').trim()
  if (editRequest) return editRequest
  if (isModuleDeleteReceipt(item)) {
    const prefix = String(item?.common_prefix || '').trim()
    return prefix ? `删除模块：${lastCrumb(prefix)}` : '删除模块'
  }
  const label = receiptOpLabel(item)
  return label === '批次' ? '批次回执' : `${label}批次`
}

function isModuleDeleteReceipt(item?: Partial<ReceiptItem & ReceiptDetailMeta> | null) {
  return item?.operation_kind === 'module_delete'
}

function receiptOpLabel(item?: Partial<ReceiptItem & ReceiptDetailMeta> | null) {
  if (isModuleDeleteReceipt(item)) return '模块删除'
  if (item?.operation_kind === 'delete') return '删除'
  if (item?.operation_kind === 'insert') return '录入'
  if (item?.operation_kind === 'update') return '修改'
  if (item?.operation_kind === 'structure') return '结构'
  return '批次'
}

function receiptBody(item: HistoryItem) {
  return item.op === 'delete' ? (item.body_before || item.body_before_preview || '') : (item.body_after || item.body_after_preview || '')
}

function mapVersion(item: KnowledgeVersionSummary): HistoryItem {
  return {
    id: item.version,
    version: item.version,
    base_version: Number(item.base_version || 0),
    project: item.project_id,
    op: item.action || 'update',
    edit_request: item.reason || item.operation || '无备注',
    batch_id: item.batch_id || `version-${item.version}`,
    actor_user_id: item.actor_user_id,
    actor_name: item.actor_name,
    undone: false,
    edited_at: item.created_at,
    breadcrumb: item.title || '现行知识文档',
    title: `版本 ${item.version}`,
    body_before_preview: '',
    body_after_preview: '',
    source_ids: item.source_ids || [],
    session_id: item.session_id || '',
    trace_id: item.trace_id || '',
  }
}

function traceMarker(traceId: string) {
  const raw = String(traceId || '').replace(/[^a-z0-9]/gi, '')
  return raw ? `DTA-${raw.slice(0, 8).toUpperCase()}` : 'DTA-UNKNOWN'
}

function openTrace(traceId: string) {
  router.push({
    name: 'vibeSettingsTrace',
    query: { ...route.query, trace_id: traceId },
  })
}

async function fetchAllVersions(): Promise<KnowledgeVersionSummary[]> {
  const out: KnowledgeVersionSummary[] = []
  let before: number | undefined
  for (let page = 0; page < 100; page += 1) {
    const data = await getKnowledgeVersions(vibeProjectId.value, { limit: 200, before })
    out.push(...(data.items || []))
    if (!data.next_cursor) break
    before = data.next_cursor
  }
  return out
}

function groupReceipts(items: HistoryItem[]): ReceiptItem[] {
  const groups = new Map<string, HistoryItem[]>()
  items.forEach((item) => {
    const batchId = item.batch_id || `version-${item.version}`
    groups.set(batchId, [...(groups.get(batchId) || []), item])
  })
  return Array.from(groups.entries()).map(([batchId, versions]) => {
    const newest = versions[0]
    const oldest = versions[versions.length - 1]
    const count = (op: string) => versions.filter(item => item.op === op).length
    return {
      batch_id: batchId,
      operation_kind: versions.length === 1 ? newest.op : 'batch',
      common_prefix: newest.breadcrumb,
      affected_count: versions.length,
      started_at: oldest.edited_at,
      ended_at: newest.edited_at,
      total: versions.length,
      inserted: count('insert'),
      updated: count('update'),
      deleted: count('delete'),
      structured: count('structure'),
      edit_request: newest.edit_request,
      versions,
    }
  })
}

async function downloadSource(sourceId: string) {
  if (!vibeProjectId.value) return
  try {
    const data = await getKnowledgeSource(vibeProjectId.value, sourceId)
    const blob = new Blob([data.source.content || ''], { type: data.source.mime_type || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = data.source.filename || `knowledge-source-${sourceId}`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error))
  }
}

function toDate(value?: string): Date {
  let v = String(value || '').trim()
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(v)
  if (!hasTz && v) v = v.replace(' ', 'T') + 'Z'
  else v = v.replace(' ', 'T')
  return new Date(v)
}

function formatTime(value?: string) {
  if (!value) return ''
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
</script>

<style scoped lang="scss">
:global(html:has(.kb-browser)),
:global(body:has(.kb-browser)),
:global(#app:has(.kb-browser)) {
  min-width: 0 !important;
}

.kb-browser {
  min-height: 100vh;
  background: #f6f6f5;
  color: #171717;
  display: flex;
  flex-direction: column;
  padding: 14px 18px 18px;
  box-sizing: border-box;
  gap: 10px;
  overflow: hidden;
}

.window-drag {
  height: 16px;
  -webkit-app-region: drag;
}

.topbar,
.view-tabs,
.workspace,
.state-line {
  border: 1px solid #dedede;
  background: #fff;
}

.topbar {
  min-height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  gap: 16px;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;

  h1 {
    margin: 0;
    font-size: 15px;
    line-height: 1.25;
    letter-spacing: 0;
    font-weight: 650;
  }

  p {
    margin: 1px 0 0;
    color: #777;
    font-size: 11px;
  }
}

.book-mark {
  width: 28px;
  height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.book-mark svg {
  width: 17px;
  height: 17px;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fff;
  color: #222;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &.sm {
    width: 26px;
    height: 26px;
  }
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-select {
  width: 216px;
}

.select-trigger {
  width: 100%;
  height: 34px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fff;
  color: #222;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16px;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  box-sizing: border-box;
}

.select-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.select-label,
.select-hint {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-label {
  font-size: 13px;
}

.select-hint {
  margin-top: 2px;
  font-size: 11px;
  color: #777;
}

.select-caret {
  color: #777;
  transition: transform 150ms ease;
}

.select-caret.open {
  transform: rotate(180deg);
}

.text-btn {
  height: 34px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #111;
  color: #fff;
  padding: 0 14px;
  cursor: pointer;
}

.view-tabs {
  position: relative;
  border-radius: 8px;
  height: 38px;
  display: flex;
  align-items: center;
  padding: 3px;
  gap: 2px;
  overflow: hidden;

  button {
    position: relative;
    z-index: 1;
    height: 30px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: #555;
    padding: 0 14px;
    cursor: pointer;

    &.active {
      color: #fff;
    }
  }
}

.tab-indicator {
  position: absolute;
  top: 3px;
  left: 3px;
  z-index: 0;
  width: calc((100% - 18px) / 5);
  height: calc(100% - 6px);
  border-radius: 7px;
  background: #111;
  transform: translateX(calc(var(--active-tab-index, 0) * (100% + 3px)));
  transition: transform 260ms cubic-bezier(.22, 1, .36, 1), width 260ms cubic-bezier(.22, 1, .36, 1);
}

.state-line {
  border-radius: 8px;
  padding: 12px;
  color: #666;
  font-size: 13px;

  &.error {
    color: #111;
    border-color: #bbb;
  }
}

.workspace {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  display: grid;
  grid-template-columns: minmax(520px, 1fr) 340px;
  overflow: hidden;

  &.with-structure {
    grid-template-columns: 220px minmax(520px, 1fr) 340px;
  }
}

.module-pane,
.content-pane,
.detail-pane {
  min-height: 0;
  overflow: auto;
}

.module-pane {
  border-right: 1px solid #e4e4e4;
  background: #fafafa;
  padding: 10px;
}

.document-pane-head {
  padding: 4px 6px 8px;
}

.document-outline-row {
  padding-left: calc(8px + var(--outline-depth, 0) * 10px);
}

.pane-head,
.section-title,
.detail-head,
.doc-toolbar,
.filter-line,
.search-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pane-head {
  margin-bottom: 8px;
  color: #333;

  label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: #777;
  }
}

.module-row {
  width: 100%;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #222;
  padding: 8px;
  margin-bottom: 2px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
  cursor: pointer;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    font-style: normal;
    color: #777;
  }

  &.active {
    background: #ececec;
  }
}

.source-minimap-float {
  position: absolute;
  left: 10px;
  top: calc(50% + 22px);
  z-index: 5;
  width: 72px;
  max-height: min(500px, calc(100% - 74px));
  padding: 6px 0 8px 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  pointer-events: auto;
  overflow: visible;
  transform: translateY(-50%);
}

.source-minimap-row {
  position: relative;
  width: 56px;
  height: 9px;
  flex: 0 0 9px;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.source-minimap-row.deleted {
  opacity: .52;
}

.source-minimap-row .minimap-line {
  display: block;
  width: 7px;
  height: 2px;
  border-radius: 999px;
  background: #d4d4d2;
  transition: width 140ms ease, background 140ms ease, height 140ms ease;
}

.source-minimap-row.hover .minimap-line {
  width: 28px;
  height: 2.5px;
  background: #111;
}

.source-minimap-row.hover-near-1 .minimap-line {
  width: 24px;
  background: #c9c9c6;
}

.source-minimap-row.hover-near-2 .minimap-line {
  width: 18px;
  background: #d0d0ce;
}

.source-minimap-row.hover-near-3 .minimap-line {
  width: 13px;
  background: #d7d7d5;
}

.source-minimap-row.active .minimap-line {
  width: 14px;
  background: #111;
}

.source-minimap-row.active.hover .minimap-line {
  width: 28px;
}

.source-minimap-row:focus-visible {
  outline: none;
}

.source-minimap-row:focus-visible .minimap-line {
  box-shadow: 0 0 0 2px #fff, 0 0 0 3px #111;
}

.source-preview-card {
  position: absolute;
  left: 42px;
  top: 50%;
  width: 320px;
  height: 130px;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, .12);
  border-radius: 14px;
  background: rgba(255, 255, 255, .96);
  box-shadow: 0 12px 28px rgba(0, 0, 0, .12);
  padding: 12px 14px;
  pointer-events: none;
  transform: translateY(-50%);
  text-align: left;
}

.source-preview-card strong {
  display: block;
  color: #1e1e1e;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-preview-card p {
  margin: 7px 0 0;
  color: #8a8a8a;
  font-size: 12px;
  line-height: 1.55;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.content-pane {
  position: relative;
  padding: 16px;
  background: #fff;
}

.tab-surface {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.document-shell {
  position: relative;
  min-height: 100%;
  min-width: 0;
  width: 100%;
  overflow-x: hidden;
}

.document-empty {
  padding: 48px 24px;
  text-align: center;
}

.overview-layout {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  overflow: hidden;
}

.plain-section {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;

  h2 {
    margin: 0;
    font-size: 14px;
    line-height: 1.3;
  }

  .section-title {
    flex: 0 0 auto;
    margin-bottom: 10px;
  }

  .section-title span {
    color: #777;
    font-size: 12px;
  }
}

.source-section {
  grid-column: 1 / -1;
  max-height: 170px;
  overflow-y: auto;
}

.source-row {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-bottom: 1px solid #ececec;
  background: transparent;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, auto) 80px;
  align-items: center;
  gap: 12px;
  padding: 7px 4px;
  color: #222;
  text-align: left;
  cursor: pointer;
}

.source-row:hover {
  background: #f5f5f4;
}

.source-row span,
.source-row small,
.source-row em {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-row small,
.source-row em {
  color: #777;
  font-size: 11px;
  font-style: normal;
}

.module-summary-list {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

.module-summary-row,
.history-row,
.result-row,
.receipt-row,
.receipt-detail {
  width: 100%;
  border: 1px solid #e4e4e4;
  border-radius: 8px;
  background: #fff;
  color: #222;
  text-align: left;
  cursor: pointer;
}

.module-summary-row {
  display: grid;
  grid-template-columns: minmax(90px, 180px) 1fr 36px;
  gap: 10px;
  align-items: center;
  padding: 8px;
  margin-bottom: 7px;

  i {
    height: 6px;
    border-radius: 999px;
    background: #eee;
    overflow: hidden;
  }

  b {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #111;
  }

  em {
    color: #666;
    font-style: normal;
    text-align: right;
  }
}

.doc-toolbar {
  margin-bottom: 8px;

  strong {
    display: block;
    font-size: 14px;
  }

  span {
    color: #777;
    font-size: 12px;
  }

  input {
    width: min(320px, 38vw);
    height: 32px;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    padding: 0 10px;
  }
}

.document-flow {
  max-width: 880px;
  margin: 0 auto;
  padding: 4px 0 80px;
}

.knowledge-document {
  width: min(100%, 980px);
  margin: 0 auto;
  padding: 8px 20px 96px;
  box-sizing: border-box;
}

.knowledge-document :deep(h1),
.knowledge-document :deep(h2),
.knowledge-document :deep(h3),
.knowledge-document :deep(h4),
.knowledge-document :deep(h5),
.knowledge-document :deep(h6) {
  scroll-margin-top: 24px;
}

.document-load-more {
  margin-top: 18px;
}

.doc-block {
  border: 1px solid transparent;
  border-bottom-color: #ececec;
  padding: 16px 8px 18px;
  cursor: pointer;

  &:hover,
  &.selected {
    border-color: #dedede;
    border-radius: 8px;
    background: #fbfbfb;
  }

  &.deleted {
    opacity: .58;
  }
}

.doc-heading-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;

  span {
    color: #888;
    font-size: 12px;
  }
}

.doc-heading {
  margin: 0;
  letter-spacing: 0;
  color: #111;
}

h2.doc-heading { font-size: 20px; }
h3.doc-heading { font-size: 17px; }
h4.doc-heading { font-size: 15px; }

.doc-path {
  margin-top: 5px;
  color: #888;
  font-size: 12px;
}

.markdown-body {
  margin-top: 10px;
  color: #222;
  font-size: 14px;
  line-height: 1.74;
  word-break: break-word;
}

.markdown-body :deep(p) {
  margin: 0 0 9px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0 10px;
  padding-left: 20px;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 13px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #ddd;
  padding: 6px 8px;
}

.markdown-body :deep(th) {
  background: #f5f5f5;
}

.markdown-body :deep(code) {
  background: #f2f2f2;
  border-radius: 4px;
  padding: 1px 4px;
}

.search-line,
.filter-line {
  margin-bottom: 12px;

  input,
  select {
    height: 32px;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    padding: 0 10px;
  }

  input {
    flex: 1;
  }

  button {
    height: 32px;
    border: 0;
    border-radius: 8px;
    background: #111;
    color: #fff;
    padding: 0 18px;
    cursor: pointer;
  }
}

.result-list {
  max-height: calc(100vh - 218px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

.result-row {
  padding: 11px;
  margin-bottom: 8px;
  box-sizing: border-box;
  min-width: 0;

  strong,
  span,
  p {
    display: block;
  }

  span {
    margin-top: 4px;
    color: #777;
    font-size: 12px;
  }

  p {
    margin: 8px 0 0;
    color: #444;
    line-height: 1.6;
  }
}

.result-row :deep(.search-hit) {
  border-radius: 3px;
  background: #fff2a8;
  color: inherit;
  padding: 0 2px;
}

.doc-block :deep(.search-hit) {
  border-radius: 3px;
  background: #fff2a8;
  color: inherit;
  padding: 0 2px;
}

.history-list,
.receipt-list,
.receipt-detail-list {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.history-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) minmax(0, 1.2fr) minmax(62px, 82px) 72px;
  align-items: center;
  gap: 8px;
  padding: 9px;
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;

  &.compact {
    grid-template-columns: 48px minmax(0, 1fr) minmax(56px, 76px) 70px;
    margin-bottom: 7px;
  }

  strong,
  span,
  em,
  small {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: #777;
    text-align: right;
  }

  &.active {
    border-color: #111;
    background: #f7f7f6;
    box-shadow: inset 3px 0 0 #111;
  }
}

.op {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 12px;
  background: #eee;
  color: #333;
}

.op-insert {
  border-color: #c9d9cd;
  background: #eef5f0;
  color: #3d6b49;
}

.op-update {
  border-color: #c9d1d8;
  background: #eef2f5;
  color: #475866;
}

.op-delete {
  border-color: #e2caca;
  background: #f7eeee;
  color: #8a4b4b;
}

.op-structure {
  border-color: #d8d8d8;
  background: #f2f2f2;
  color: #4f4f4f;
}

.receipt-row {
  padding: 10px;
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 170px 90px;
  gap: 10px;
  align-items: center;

  span,
  small {
    color: #777;
  }
}

.detail-pane {
  border-left: 1px solid #e4e4e4;
  background: #fafafa;
  padding: 14px;
}

.detail-head {
  margin-bottom: 10px;
}

.detail-meta {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 6px 10px;
  margin: 0 0 12px;
  font-size: 13px;

  dt {
    color: #777;
  }

  dd {
    margin: 0;
    word-break: break-word;
  }
}

.trace-link {
  border: 0;
  background: transparent;
  color: #1f5f9f;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.trace-link:hover {
  text-decoration: underline;
}

.detail-body,
.history-content,
.diff-view {
  background: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 8px;
  padding: 10px;
}

.mini-history {
  display: grid;
  gap: 6px;
  margin-top: 12px;

  button {
    border: 1px solid #e4e4e4;
    border-radius: 7px;
    background: #fff;
    padding: 7px;
    text-align: left;
    cursor: pointer;
  }
}

.diff-view {
  display: grid;
  gap: 1px;
  padding: 8px 0;
}

.diff-line {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 8px;
  padding: 3px 10px;
  font-family: "SF Mono", Menlo, monospace;
  font-size: 12px;
  line-height: 1.55;

  span {
    color: #777;
    text-align: center;
  }

  code {
    white-space: pre-wrap;
    word-break: break-word;
    background: transparent;
    padding: 0;
  }

  &.add {
    background: #f2f2f2;
    color: #111;
  }

  &.remove {
    color: #777;
    text-decoration: line-through;
  }
}

.history-content > span {
  display: block;
  color: #777;
  font-size: 12px;
  margin-bottom: 6px;
}

.receipt-detail {
  padding: 9px;
  cursor: default;
}

.receipt-detail-head {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 4px 8px;
  align-items: center;
  padding: 0;
  text-align: left;
  cursor: pointer;

  small {
    grid-column: 2;
    color: #777;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.receipt-content,
.receipt-mini-diff {
  margin-top: 8px;
  max-height: 240px;
  overflow: auto;
  border-top: 1px solid #ececec;
  padding-top: 8px;
}

.receipt-mini-diff {
  display: grid;
  gap: 1px;
}

.empty-note {
  color: #777;
  font-size: 13px;
}

/* UI/UX Pro Max pass: dense dashboard + Swiss minimal + subtle motion. */
.kb-browser {
  --surface: #fff;
  --surface-2: #fafafa;
  --surface-3: #f0f0ef;
  --ink: #111;
  --ink-2: #3e3e3e;
  --ink-3: #737373;
  --ink-4: #9a9a9a;
  --line: #d8d8d6;
  --line-soft: #ebebe9;
  --fill-hover: #f2f2f1;
  padding: 12px 14px 14px;
  gap: 8px;
}

.topbar {
  position: relative;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto minmax(290px, auto);
  min-height: 52px;
  gap: 14px;
  overflow: hidden;
}

.title-copy {
  min-width: 0;
}

.title-copy p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(64px, 1fr));
  gap: 6px;
}

.top-actions {
  gap: 8px;
  justify-self: end;
  justify-content: flex-end;
  width: 100%;
}

.top-divider {
  width: 1px;
  height: 24px;
  background: var(--line-soft);
}

.metric-chip {
  min-width: 0;
  height: 34px;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: var(--surface-2);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  color: var(--ink-2);
  cursor: pointer;
  transition: background 160ms ease, transform 160ms ease, border-color 160ms ease;
}

.metric-chip b {
  color: var(--ink);
  font-size: 14px;
  font-weight: 650;
}

.metric-chip i {
  color: var(--ink-3);
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}

.metric-chip:hover,
.icon-btn:hover,
.text-btn:hover:not(:disabled),
.module-summary-row:hover,
.result-row:hover,
.receipt-row:hover {
  transform: translateY(-1px);
}

.metric-chip:hover {
  background: var(--surface);
  border-color: var(--line);
}

.loading-thread {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #111, transparent);
  animation: loading-thread 1.2s ease-in-out infinite;
}

.select-trigger,
.text-btn,
.icon-btn,
.module-row,
.history-row,
.receipt-row,
.result-row {
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease, opacity 160ms ease;
}

.select-trigger:hover,
.icon-btn:hover,
.module-row:hover:not(.active),
.history-row:hover,
.receipt-row:hover,
.result-row:hover {
  background: var(--fill-hover);
}

.view-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  height: 42px;
  gap: 3px;
}

.view-tabs button {
  position: relative;
  z-index: 1;
  min-width: 0;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--ink-3);
}

.view-tabs button span {
  font-size: 13px;
  font-weight: 600;
}

.view-tabs button small {
  font-size: 11px;
  color: inherit;
  opacity: .64;
}

.view-tabs button:hover:not(.active) {
  color: var(--ink-2);
}

.pane-head > div strong,
.pane-head > div span {
  display: block;
}

.pane-head > div span {
  margin-top: 2px;
  color: var(--ink-3);
  font-size: 11px;
}

.module-row {
  min-height: 34px;
  margin-bottom: 3px;
  color: var(--ink-2);
}

.module-row.active {
  background: #111;
  color: #fff;
}

.module-row.active em {
  color: rgba(255, 255, 255, .72);
}

.doc-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  margin: -5px -16px 6px;
  padding: 5px 16px;
  border-bottom: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, .96);
}

.doc-toolbar strong {
  font-size: 13px;
  line-height: 1.2;
}

.doc-toolbar span {
  font-size: 11px;
  line-height: 1.2;
}

.doc-toolbar input {
  height: 28px;
}

.document-flow {
  max-width: 940px;
}

.doc-block {
  position: relative;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 12px;
  padding: 16px 10px 18px;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.doc-block::before {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 2px;
  border-radius: 999px;
  background: transparent;
}

.doc-block:hover {
  transform: translateY(-1px);
}

.doc-block.selected::before {
  background: #111;
}

.doc-index {
  color: var(--ink-3);
  display: grid;
  align-content: start;
  gap: 5px;
}

.doc-index span {
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px;
}

.doc-index i {
  width: fit-content;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 2px 5px;
  font-size: 10px;
  font-style: normal;
}

.doc-main {
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}

.doc-heading-line span {
  flex: 0 0 auto;
  color: var(--ink-4);
}

.markdown-body :deep(blockquote) {
  margin: 10px 0;
  padding: 2px 0 2px 12px;
  border-left: 2px solid var(--line);
  color: var(--ink-3);
}

.search-line,
.filter-line {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-soft);
}

.empty-search {
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 18px;
  color: var(--ink-3);
  display: grid;
  gap: 6px;
}

.empty-search strong {
  color: var(--ink-2);
}

.detail-head strong {
  line-height: 1.35;
}

.diff-line.add {
  background: #eeeeed;
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@keyframes loading-thread {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.project-select :deep(.app-select-trigger),
.history-op-select :deep(.app-select-trigger) {
  height: auto;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.project-select :deep(.app-select-trigger) {
  width: 100%;
}

.project-select :deep(.app-select-trigger:hover),
.project-select :deep(.app-select-trigger.is-open),
.history-op-select :deep(.app-select-trigger:hover),
.history-op-select :deep(.app-select-trigger.is-open) {
  border: 0;
  box-shadow: none;
}

.project-select :deep(.app-select-trigger:focus-visible),
.history-op-select :deep(.app-select-trigger:focus-visible),
.search-line input:focus,
.doc-toolbar input:focus {
  outline: none;
  box-shadow: none;
}

.select-trigger {
  box-shadow: none;
}

.select-trigger.compact {
  width: 156px;
  height: 32px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16px;
}

.select-trigger:focus-within,
.select-trigger:hover,
.search-line input:focus,
.doc-toolbar input:focus {
  border-color: #9a9a9a;
  background: #fff;
}

.filter-line {
  min-height: 42px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-soft);
}

.filter-copy {
  min-width: 0;
}

.filter-copy strong,
.filter-copy span {
  display: block;
}

.filter-copy strong {
  font-size: 15px;
}

.filter-copy span {
  margin-top: 3px;
  color: var(--ink-3);
  font-size: 12px;
}

.toggle-check {
  position: relative;
  gap: 7px;
  cursor: pointer;
  user-select: none;
}

.toggle-check input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-check span {
  width: 28px;
  height: 16px;
  border: 1px solid #cfcfcd;
  border-radius: 999px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  padding: 1px;
  box-sizing: border-box;
  transition: background 160ms ease, border-color 160ms ease;
}

.toggle-check span::before {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #8a8a87;
  transition: transform 160ms ease, background 160ms ease;
}

.toggle-check input:checked + span {
  border-color: #111;
  background: #111;
}

.toggle-check input:checked + span::before {
  background: #fff;
  transform: translateX(12px);
}

.toggle-check em {
  color: var(--ink-3);
  font-style: normal;
}

.workspace {
  grid-template-columns: minmax(0, 1fr);
}

.workspace.with-structure {
  grid-template-columns: 226px minmax(620px, 1fr);
}

.workspace.with-detail {
  grid-template-columns: minmax(360px, .86fr) minmax(520px, 1.14fr);
}

.workspace.with-detail.focus-detail {
  grid-template-columns: minmax(340px, .68fr) minmax(680px, 1.32fr);
}

.content-pane {
  padding: 5px 16px 16px;
  overflow: hidden;
}

.doc-block {
  cursor: default;
  min-width: 0;
  padding: 18px 10px 22px;
  contain: layout paint;
  scroll-margin-top: 58px;
  transition: none;
}

.doc-block:hover {
  transform: none;
  border-color: transparent;
  border-bottom-color: var(--line-soft);
  background: transparent;
}

.doc-index {
  gap: 7px;
  justify-items: center;
}

.doc-index span {
  min-width: 32px;
  height: 22px;
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  background: #f8f8f7;
  color: #3f3f3c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
}

.doc-index i {
  border-color: transparent;
  background: transparent;
  color: var(--ink-4);
  padding: 0;
}

.doc-block::before,
.doc-block.selected::before {
  display: none;
}

.document-flow {
  max-width: 980px;
  width: min(100%, 980px);
  min-width: 0;
  box-sizing: border-box;
  padding-top: 10px;
}

.markdown-body {
  color: #242424;
  font-size: 14px;
  line-height: 1.82;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 18px 0 8px;
  color: #111;
  line-height: 1.35;
  letter-spacing: 0;
}

.markdown-body :deep(h1) { font-size: 20px; }
.markdown-body :deep(h2) { font-size: 18px; }
.markdown-body :deep(h3) { font-size: 16px; }
.markdown-body :deep(h4) { font-size: 15px; }

.markdown-body :deep(p) {
  margin: 0 0 11px;
}

.markdown-body :deep(pre) {
  margin: 10px 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: #f7f7f6;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: hidden;
}

.markdown-body :deep(pre code) {
  display: block;
  min-width: 0;
  padding: 0;
  background: transparent;
  border-radius: 0;
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
}

.markdown-body :deep(a) {
  color: #111;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.markdown-body :deep(hr) {
  height: 1px;
  border: 0;
  background: var(--line-soft);
  margin: 16px 0;
}

.markdown-body :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
}

.detail-pane {
  padding: 0;
  background: #fff;
}

.history-list {
  max-height: calc(100vh - 218px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

.history-row {
  grid-template-columns: 48px minmax(0, 1fr) minmax(0, 1.1fr) minmax(62px, 82px) 72px;
}

.history-row.compact {
  grid-template-columns: 48px minmax(0, 1fr) minmax(56px, 76px) 70px;
}

.history-row em {
  min-width: 0;
  color: var(--ink-3);
  font-size: 12px;
  font-style: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-inline-detail {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line-soft);
}

.receipt-list {
  gap: 10px;
  padding: 2px 0 18px;
  overflow-x: hidden;
}

.receipt-group {
  display: grid;
  gap: 0;
}

.receipt-row {
  grid-template-columns: minmax(220px, 1fr) auto 82px;
  gap: 14px;
  align-items: center;
  min-height: 54px;
  padding: 10px 12px;
  border-color: var(--line-soft);
  border-radius: 8px;
}

.receipt-row.active {
  border-color: #111;
  background: #f7f7f6;
}

.receipt-row-main {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.receipt-title-line {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.receipt-title-line strong {
  flex: 1 1 auto;
}

.receipt-kind {
  flex: 0 0 auto;
  height: 20px;
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  color: var(--ink-2);
  background: #fff;
  font-size: 10px;
  font-style: normal;
  font-weight: 650;
  line-height: 1;
}

.receipt-kind.danger {
  border-color: #e4d0d0;
  background: #faf3f3;
  color: #6f2d2d;
}

.receipt-batch-id,
.receipt-common-prefix {
  color: var(--ink-4) !important;
}

.receipt-row-main strong {
  min-width: 0;
  color: var(--ink);
  font-size: 13px;
  line-height: 1.35;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-row-main small {
  min-width: 0;
  color: var(--ink-4);
  font-size: 11px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-counts,
.receipt-detail-counts {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.receipt-counts i,
.receipt-detail-counts span {
  height: 24px;
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  background: #fff;
  color: var(--ink-3);
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}

.receipt-counts b,
.receipt-detail-counts b {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.receipt-counts .count-insert {
  border-color: #d9e4dc;
}

.receipt-counts .count-update {
  border-color: #d7dde2;
}

.receipt-counts .count-delete {
  border-color: #ead8d8;
}

.receipt-counts .count-structure {
  border-color: #e2dfd5;
}

.receipt-row time {
  color: var(--ink-3);
  font-size: 12px;
  text-align: right;
  white-space: nowrap;
}

.receipt-inline-detail {
  margin-top: 6px;
  padding: 0;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.receipt-detail-title {
  min-height: 58px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line-soft);
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.receipt-detail-title > div:first-child {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.receipt-detail-title span {
  color: var(--ink-4);
  font-size: 11px;
}

.receipt-detail-title strong {
  min-width: 0;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-detail-title small {
  color: var(--ink-3);
  font-size: 11px;
}

.receipt-detail-counts {
  flex: 0 0 auto;
}

.receipt-detail-counts em {
  color: var(--ink-4);
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}

.receipt-detail-list {
  gap: 0;
}

.receipt-detail-state {
  margin: 0;
  padding: 18px 14px;
  color: var(--ink-3);
  font-size: 12px;
  line-height: 1.5;
}

.receipt-detail-state.error {
  color: #7f1d1d;
  background: #fff7f7;
}

.receipt-detail {
  border: 0;
  border-radius: 0;
  border-bottom: 1px solid var(--line-soft);
  padding: 0;
}

.receipt-detail:last-child {
  border-bottom: 0;
}

.receipt-detail-head {
  grid-template-columns: 48px minmax(0, 1fr) 36px;
  gap: 10px;
  align-items: center;
  min-height: 46px;
  padding: 9px 12px;
}

.receipt-detail-head:hover {
  background: #fafafa;
}

.receipt-detail-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.receipt-detail-copy strong {
  min-width: 0;
  color: var(--ink);
  font-size: 13px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-detail-copy small {
  min-width: 0;
  grid-column: auto;
  color: var(--ink-3);
  font-size: 11px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-detail-head > i {
  color: var(--ink-4);
  font-size: 11px;
  font-style: normal;
  text-align: right;
}

.receipt-content,
.receipt-mini-diff {
  margin: 0 12px 12px 70px;
  max-height: 220px;
  border: 1px solid var(--line-soft);
  border-radius: 7px;
  background: #fff;
  padding: 8px 10px;
}

.receipt-mini-diff {
  padding: 6px 0;
  overflow: auto;
}

.receipt-mini-diff .diff-line {
  grid-template-columns: 34px 18px minmax(0, 1fr);
  gap: 4px;
  padding: 2px 10px;
  font-size: 11px;
  line-height: 1.5;
}

.receipt-content.markdown-body {
  margin-top: 0;
  font-size: 12px;
  line-height: 1.65;
}

.detail-pane > .empty-note {
  margin: 14px;
}

.detail-head,
.detail-meta {
  margin-left: 14px;
  margin-right: 14px;
}

.detail-head {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 14px 0 10px;
  background: rgba(255, 255, 255, .96);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.detail-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.undo-history-btn {
  border: 0;
  border-radius: 8px;
  background: #ededec;
  color: #1f1f1f;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, opacity 160ms ease;
}

.undo-history-btn:hover {
  background: #dededd;
}

.undo-history-btn:disabled {
  cursor: default;
  opacity: .55;
}

.history-undone {
  display: inline-flex;
  align-items: center;
  height: 24px;
  border-radius: 999px;
  background: #f0f0ef;
  color: #777;
  padding: 0 9px;
  font-size: 12px;
}

.diff-view {
  margin: 0 14px 14px;
  padding: 0;
  overflow: hidden;
  border-color: #d7d7d5;
  background: #fff;
}

.diff-header {
  min-height: 42px;
  border-bottom: 1px solid #d7d7d5;
  background: #f6f6f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
}

.diff-header span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #222;
  font-size: 13px;
  font-weight: 600;
}

.diff-header strong {
  flex: 0 0 auto;
  color: var(--ink-3);
  font-size: 12px;
}

.diff-body {
  max-height: calc(100vh - 250px);
  overflow: auto;
  padding: 6px 0;
}

.diff-line {
  grid-template-columns: 46px 24px minmax(0, 1fr);
  gap: 0;
  padding: 0;
  min-height: 24px;
  align-items: stretch;
  border-left: 3px solid transparent;
  font-family: "SF Mono", Menlo, Consolas, monospace;
}

.diff-line .diff-num,
.diff-line .diff-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8a8a87;
  font-size: 12px;
  user-select: none;
}

.diff-line .diff-num {
  border-right: 1px solid rgba(0, 0, 0, .06);
  background: rgba(0, 0, 0, .025);
}

.diff-line code {
  padding: 3px 10px;
  line-height: 1.6;
}

.diff-line.add {
  border-left-color: #2f8f46;
  background: #edf8ef;
  color: #1f5f31;
}

.diff-line.add .diff-num,
.diff-line.add .diff-mark {
  background: #d9f0de;
  color: #2f8f46;
}

.diff-line.remove {
  border-left-color: #c94343;
  background: #fff0f0;
  color: #8a2f2f;
  text-decoration: none;
}

.diff-line.remove .diff-num,
.diff-line.remove .diff-mark {
  background: #f8dcdc;
  color: #b33b3b;
}

.diff-line.same {
  color: #42423f;
}

.history-content {
  margin: 0 14px 14px;
}

@media (max-width: 1080px) {
  .topbar {
    grid-template-columns: minmax(180px, 1fr) minmax(240px, auto);
  }

  .top-metrics {
    display: none;
  }

  .workspace,
  .workspace.with-structure {
    grid-template-columns: 1fr;
  }

  .module-pane,
  .source-minimap-float,
  .detail-pane {
    display: none;
  }
}

@media (max-width: 720px) {
  .kb-browser {
    padding: 8px;
  }

  .topbar {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .top-actions,
  .project-select {
    width: 100%;
  }

  .view-tabs {
    overflow-x: auto;
    overflow-y: hidden;

    button {
      flex: 0 0 96px;
      padding: 0 8px;
    }
  }

  .tab-indicator {
    width: 96px;
  }

  .overview-layout,
  .receipt-row {
    grid-template-columns: 1fr;
  }

  .receipt-counts {
    flex-wrap: wrap;
  }

  .source-row {
    grid-template-columns: minmax(0, 1fr);

    em {
      display: none;
    }
  }

  .history-row,
  .history-row.compact {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .history-row > span:not(.op),
  .history-row em,
  .history-row small {
    grid-column: 2;
  }

  .doc-block {
    grid-template-columns: 42px minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
