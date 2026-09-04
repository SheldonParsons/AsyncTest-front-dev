<template>
  <main class="kb-browser" :class="{ loading: loading || statusLoading }">
    <div class="window-drag" />
    <header class="topbar" :class="{ mac: isMacPlatform }">
      <div class="title-block">
        <button class="icon-button" type="button" aria-label="返回对话" @click="goChat">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <div><h1>原文浏览</h1><p>{{ selectedProjectName }} · {{ activeTabLabel }}</p></div>
      </div>

      <div v-if="status" class="metrics" aria-label="知识库概况">
        <button type="button" aria-label="查看现行知识项" @click="selectTab('document')"><b>{{ status.summary.document_count }}</b><span>知识项</span></button>
        <button type="button" aria-label="查看来源记录" @click="selectTab('overview')"><b>{{ status.summary.source_count }}</b><span>来源记录</span></button>
        <button type="button" aria-label="查看变更历史" @click="selectTab('history')"><b>{{ status.summary.commit_count }}</b><span>变更</span></button>
        <button type="button" aria-label="查看删除记录" @click="selectTab('history')"><b>{{ status.summary.tombstone_count }}</b><span>删除</span></button>
      </div>
      <p v-else-if="statusError" class="metrics-error" :title="statusError">概况加载失败</p>

      <div class="actions">
        <AppSelect class="project-select" :model-value="selectedAsyncProjectId" :options="projectOptions" placeholder="选择项目" dropdown-fit-content @change="selectProjectById" />
        <i />
        <button class="refresh" type="button" :disabled="statusLoading" @click="reload"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 1 1-2.34-5.66L20 8M20 3v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>刷新</span></button>
      </div>
    </header>

    <nav class="tabs" :style="{ '--tab-index': activeTabIndex }" role="tablist" aria-label="知识库视图" @keydown="onTabKeydown">
      <span class="indicator" />
      <button v-for="tab in tabs" :key="tab.key" type="button" role="tab" :tabindex="activeTab === tab.key ? 0 : -1" :aria-selected="activeTab === tab.key" :class="{ active: activeTab === tab.key }" @click="selectTab(tab.key)"><strong>{{ tab.label }}</strong><small>{{ tab.hint }}</small></button>
    </nav>

    <section v-if="error" class="state error">{{ error }}</section>
    <section v-else-if="loading && !selectedAsyncProjectId" class="state">正在读取项目…</section>
    <section v-else-if="selectedAsyncProjectId" class="workspace">
      <Transition name="tab" mode="out-in">
        <template v-if="activeTab === 'overview'">
          <OverviewPanel v-if="status" :key="`overview-${selectedAsyncProjectId}`" :project-id="selectedAsyncProjectId" :status="status" :revision="browserRevision" @open-document="openDocument" @open-source="openSource" @open-commit="openCommit" />
          <section v-else :key="`overview-state-${selectedAsyncProjectId}`" class="state" :class="{ error: statusError }">{{ statusError || '正在读取知识库概况…' }}</section>
        </template>
        <SourceReader v-else-if="activeTab === 'document'" :key="`document-${selectedAsyncProjectId}-${browserRevision}`" :project-id="selectedAsyncProjectId" :requested-document-id="requestedDocumentId" :requested-source-id="requestedSourceId" :requested-path="requestedPath" :requested-offset="requestedOffset" :requested-query="searchQuery" />
        <SearchPanel v-else-if="activeTab === 'search'" :key="`search-${selectedAsyncProjectId}`" :project-id="selectedAsyncProjectId" :document-count="status?.summary.document_count || 0" :initial-query="searchQuery" :revision="browserRevision" @query-change="updateSearchQuery" @open-document="openDocument" />
        <CommitPanel v-else-if="activeTab === 'history'" :key="`history-${selectedAsyncProjectId}`" :project-id="selectedAsyncProjectId" :requested-seq="requestedCommitSeq" :revision="browserRevision" @open-source="openSource" @select-commit="selectCommit" />
        <ReceiptPanel v-else :key="`receipts-${selectedAsyncProjectId}-${browserRevision}`" :project-id="selectedAsyncProjectId" @open-commit="openCommit" />
      </Transition>
    </section>
    <section v-else class="state"><div><strong>没有可浏览的项目</strong><span>先选择或创建一个项目，再查看知识原文。</span></div></section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiGetJoinProjects } from '@/api/project/index'
import AppSelect from '@/components/common/select/AppSelect.vue'
import CommitPanel from './components/CommitPanel.vue'
import OverviewPanel from './components/OverviewPanel.vue'
import ReceiptPanel from './components/ReceiptPanel.vue'
import SearchPanel from './components/SearchPanel.vue'
import SourceReader from './components/SourceReader.vue'
import { getKnowledgeStatus, type KnowledgeStatus } from '../api'

type TabKey = 'overview' | 'document' | 'search' | 'history' | 'receipts'
const tabs: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: 'overview', label: '总览', hint: '现状' }, { key: 'document', label: '原文', hint: '阅读' },
  { key: 'search', label: '搜索', hint: '全文' }, { key: 'history', label: '变更', hint: '对比' },
  { key: 'receipts', label: '回执', hint: '审计' },
]

const route = useRoute()
const router = useRouter()
const isMacPlatform = window.electronAPI?.platform === 'darwin'
const projects = ref<any[]>([])
const selectedAsyncProjectId = ref('')
const status = ref<KnowledgeStatus | null>(null)
const activeTab = ref<TabKey>(normalizeTab(route.query.view))
const searchQuery = ref(String(route.query.q || ''))
const requestedDocumentId = ref(String(route.query.document || ''))
const requestedSourceId = ref(String(route.query.source || ''))
const requestedPath = ref<string[]>([])
const requestedOffset = ref(parseNonNegativeInteger(route.query.offset))
const requestedCommitSeq = ref(parsePositiveInteger(route.query.commit))
const loading = ref(false)
const error = ref('')
const statusLoading = ref(false)
const statusError = ref('')
const browserRevision = ref(0)
let projectRequestEpoch = 0

const projectOptions = computed(() => projects.value.map(item => ({ value: String(item.id), label: item.name || item.project_name || `项目 ${item.id}`, hint: item.description || '' })))
const selectedProjectName = computed(() => projects.value.find(item => String(item.id) === selectedAsyncProjectId.value)?.name || '当前项目')
const activeTabLabel = computed(() => tabs.find(item => item.key === activeTab.value)?.label || '原文')
const activeTabIndex = computed(() => String(Math.max(0, tabs.findIndex(item => item.key === activeTab.value))))

onMounted(() => {
  setFluidPage(true)
  bootstrap()
})
onBeforeUnmount(() => {
  projectRequestEpoch += 1
  setFluidPage(false)
})

watch(() => route.query.view, value => { activeTab.value = normalizeTab(value) })
watch(() => route.query.q, value => { searchQuery.value = String(value || '') })

function setFluidPage(enabled: boolean) {
  const roots = [document.documentElement, document.body, document.getElementById('app')].filter(Boolean) as HTMLElement[]
  roots.forEach(root => root.classList.toggle('vibe-fluid-page', enabled))
}

async function bootstrap() {
  loading.value = true; error.value = ''
  try {
    const response: any = await ApiGetJoinProjects({})
    projects.value = Array.isArray(response) ? response : response?.results || []
    const requested = String(route.query.project || '')
    const saved = localStorage.getItem('vibe_project_source_project_id') || ''
    const project = projects.value.find(item => String(item.id) === requested) || projects.value.find(item => String(item.id) === saved) || projects.value[0]
    if (project) await selectProject(project)
  } catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason) } finally { loading.value = false }
}

async function selectProjectById(value: string | number) {
  const project = projects.value.find(item => String(item.id) === String(value))
  if (project) await selectProject(project)
}

async function selectProject(project: any) {
  const epoch = ++projectRequestEpoch
  const projectId = String(project.id)
  selectedAsyncProjectId.value = projectId
  localStorage.setItem('vibe_project_source_project_id', projectId)
  error.value = ''; status.value = null; statusError.value = ''
  requestedDocumentId.value = String(route.query.document || '')
  requestedSourceId.value = String(route.query.source || '')
  requestedOffset.value = parseNonNegativeInteger(route.query.offset)
  requestedPath.value = []
  requestedCommitSeq.value = parsePositiveInteger(route.query.commit)
  void reloadStatus(projectId, epoch)
  await router.replace({ query: { ...route.query, project: projectId } })
}

function reload() {
  const projectId = selectedAsyncProjectId.value
  if (!projectId) return
  browserRevision.value += 1
  void reloadStatus(projectId, projectRequestEpoch)
}

async function reloadStatus(projectId: string, epoch: number) {
  if (epoch !== projectRequestEpoch || projectId !== selectedAsyncProjectId.value) return
  statusLoading.value = true
  statusError.value = ''
  try {
    const payload = await getKnowledgeStatus(projectId)
    if (epoch !== projectRequestEpoch || projectId !== selectedAsyncProjectId.value) return
    status.value = payload
  } catch (reason) {
    if (epoch !== projectRequestEpoch || projectId !== selectedAsyncProjectId.value) return
    statusError.value = reason instanceof Error ? reason.message : String(reason)
  } finally {
    if (epoch === projectRequestEpoch && projectId === selectedAsyncProjectId.value) {
      statusLoading.value = false
    }
  }
}

function selectTab(tab: TabKey) {
  activeTab.value = tab
  updateRouteQuery({ view: tab })
}

function onTabKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const current = Math.max(0, tabs.findIndex(item => item.key === activeTab.value))
  const next = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  selectTab(tabs[next].key)
  const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]')
  buttons[next]?.focus()
}

function openSource(id: string, offset = 0) {
  requestedSourceId.value = id
  requestedDocumentId.value = ''
  requestedOffset.value = offset
  requestedPath.value = []
  activeTab.value = 'document'
  updateRouteQuery({ view: 'document', source: id, document: undefined, offset: offset || undefined, commit: undefined })
}

function openDocument(id: string, offset = 0) {
  requestedDocumentId.value = id
  requestedSourceId.value = ''
  requestedOffset.value = offset
  requestedPath.value = []
  activeTab.value = 'document'
  updateRouteQuery({ view: 'document', document: id, source: undefined, offset: offset || undefined, commit: undefined })
}

function openCommit(seq: number) {
  requestedCommitSeq.value = seq
  activeTab.value = 'history'
  updateRouteQuery({ view: 'history', commit: seq, document: undefined, source: undefined, offset: undefined })
}

function selectCommit(seq: number) {
  if (requestedCommitSeq.value === seq && String(route.query.commit || '') === String(seq)) return
  requestedCommitSeq.value = seq
  updateRouteQuery({ commit: seq })
}

function updateSearchQuery(value: string) {
  searchQuery.value = value
  updateRouteQuery({ q: value || undefined })
}

function updateRouteQuery(values: Record<string, string | number | undefined>) {
  const query: Record<string, any> = { ...route.query }
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === '') delete query[key]
    else query[key] = String(value)
  })
  void router.replace({ query })
}

function normalizeTab(value: unknown): TabKey {
  const candidate = String(value || '') as TabKey
  return tabs.some(item => item.key === candidate) ? candidate : 'document'
}

function parsePositiveInteger(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function parseNonNegativeInteger(value: unknown): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0
}

function goChat() { router.push({ name: 'vibeKnowledge', query: { ...route.query, project: selectedAsyncProjectId.value || undefined } }) }
</script>

<style scoped lang="scss">
.kb-browser { --header-h: 60px; --tabs-h: 48px; display: grid; grid-template-rows: var(--header-h) var(--tabs-h) minmax(0,1fr); width: 100vw; height: 100vh; overflow: hidden; background: #fff; color: #202124; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; }
.window-drag { position: fixed; z-index: 20; top: 0; left: 0; right: 0; height: 7px; -webkit-app-region: drag; }
.topbar { display: grid; grid-template-columns: minmax(260px,1fr) auto minmax(300px,1fr); align-items: center; gap: 20px; padding: 8px 15px 6px; border-bottom: 1px solid #dedede; }
.topbar.mac .title-block { margin-inline-start: 64px; }
.title-block { display: flex; align-items: center; min-width: 0; gap: 9px; } h1, p { margin: 0; } h1 { font-size: 14px; font-weight: 650; } .title-block p { margin-top: 2px; overflow: hidden; color: #667085; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.icon-button { display: grid; width: 31px; height: 31px; flex: 0 0 auto; place-items: center; border: 1px solid #ddd; border-radius: 6px; background: #fff; color: #222; cursor: pointer; } .icon-button:hover { background: #f1f1f1; }
.metrics { display: flex; align-items: center; height: 34px; } .metrics button { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 68px; height: 34px; padding: 0 10px; border: 0; background: transparent; cursor: pointer; } .metrics button + button::before { position: absolute; top: 8px; bottom: 8px; left: 0; width: 1px; background: #dedede; content: ''; } .metrics button:hover { background: #f5f5f5; } .metrics b { font-size: 12px; line-height: 1; } .metrics span { color: #667085; font-size: 11px; line-height: 1; }
.metrics-error { margin: 0; color: #a33; font-size: 11px; }
.actions { display: flex; justify-content: flex-end; align-items: center; min-width: 0; gap: 8px; } .actions > i { width: 1px; height: 24px; background: #ddd; }
.project-select { width: min(250px, 46vw); } .project-select :deep(.app-select-trigger) { width: 100%; height: 34px; min-width: 0; padding: 0 10px 0 12px; border: 1px solid #d9d9d9; border-radius: 6px; background: #fff; box-shadow: none; font-family: inherit; font-size: 11px; } .project-select :deep(.app-select-trigger:hover), .project-select :deep(.app-select-trigger.is-open) { border-color: #bcbcbc; background: #f7f7f7; box-shadow: none; } .project-select :deep(.app-select-value) { text-align: right; }
.refresh { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 11px; border: 0; border-radius: 6px; background: #171717; color: #fff; cursor: pointer; } .refresh span { font-size: 11px; } .refresh:disabled { cursor: wait; opacity: .65; }
.tabs { --count: 5; position: relative; display: grid; grid-template-columns: repeat(var(--count),1fr); padding: 4px; border-bottom: 1px solid #ddd; background: #fff; }
.tabs .indicator { position: absolute; z-index: 0; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / var(--count)); border-radius: 5px; background: #151515; transform: translateX(calc(var(--tab-index) * 100%)); transition: transform .24s cubic-bezier(.2,.8,.2,1); }
.tabs button { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 5px; border: 0; background: transparent; color: #596273; cursor: pointer; } .tabs button.active { color: #fff; } .tabs strong { font-size: 12px; line-height: 1; } .tabs small { color: #667085; font-size: 10px; line-height: 1; } .tabs button.active small { color: #d4d7dc; }
.icon-button:focus-visible, .metrics button:focus-visible, .refresh:focus-visible, .tabs button:focus-visible { outline: 2px solid #475569; outline-offset: -2px; }
.workspace { min-width: 0; min-height: 0; overflow: hidden; } .workspace > * { width: 100%; height: 100%; }
.state { display: grid; place-items: center; min-height: 0; color: #667085; font-size: 13px; } .state.error { color: #a33; } .state > div { display: grid; gap: 6px; text-align: center; } .state > div strong { color: #344054; } .state > div span { font-size: 12px; }
.tab-enter-active, .tab-leave-active { transition: opacity .14s ease, transform .14s ease; } .tab-enter-from { opacity: 0; transform: translateY(4px); } .tab-leave-to { opacity: 0; transform: translateY(-3px); }
.loading .refresh svg { animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 900px) { .topbar { grid-template-columns: minmax(210px,1fr) auto; } .metrics { display: none; } }
@media (max-width: 620px) { .kb-browser { --header-h: 58px; --tabs-h: 46px; } .topbar { grid-template-columns: minmax(0, 1fr) auto; gap: 7px; padding-inline: 8px; } .title-block { min-width: 0; } .title-block p, .refresh span, .actions > i { display: none; } .project-select { width: min(176px, 45vw); } .tabs small { display: none; } }
@media (max-width: 420px) { .title-block h1 { display: none; } .project-select { width: min(190px, 54vw); } }
@media (prefers-reduced-motion: reduce) { .tabs .indicator, .tab-enter-active, .tab-leave-active { transition: none; } .loading .refresh svg { animation: none; } }
</style>

<style lang="scss">
html.vibe-fluid-page,
body.vibe-fluid-page,
#app.vibe-fluid-page {
  min-width: 0;
  min-height: 0;
}
</style>
