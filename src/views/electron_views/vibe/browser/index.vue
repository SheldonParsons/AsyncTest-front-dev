<template>
  <main class="kb-browser" :class="{ loading }">
    <div class="window-drag" />
    <header class="topbar">
      <div class="title-block">
        <button class="icon-button" type="button" aria-label="返回对话" @click="goChat">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <span class="book-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>
        </span>
        <div><h1>原文浏览</h1><p>{{ selectedProjectName }} · {{ activeTabLabel }}</p></div>
      </div>

      <div v-if="status" class="metrics" aria-label="知识库概况">
        <button type="button" @click="activeTab = 'document'"><b>{{ status.summary.document_count }}</b><span>文档</span></button>
        <button type="button" @click="activeTab = 'document'"><b>{{ status.summary.span_count }}</b><span>跨度</span></button>
        <button type="button" @click="activeTab = 'history'"><b>{{ status.summary.commit_count }}</b><span>提交</span></button>
        <button type="button" @click="activeTab = 'history'"><b>{{ status.summary.tombstone_count }}</b><span>删除</span></button>
      </div>

      <div class="actions">
        <AppSelect class="project-select" :model-value="selectedAsyncProjectId" :options="projectOptions" placeholder="选择项目" dropdown-fit-content @change="selectProjectById" />
        <i />
        <button class="refresh" type="button" @click="reload"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 1 1-2.34-5.66L20 8M20 3v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>刷新</span></button>
      </div>
    </header>

    <nav class="tabs" :style="{ '--tab-index': activeTabIndex }" aria-label="知识库视图">
      <span class="indicator" />
      <button v-for="tab in tabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key"><strong>{{ tab.label }}</strong><small>{{ tab.hint }}</small></button>
    </nav>

    <section v-if="error" class="state error">{{ error }}</section>
    <section v-else-if="loading && !status" class="state">正在读取知识库…</section>
    <section v-else-if="status" class="workspace">
      <Transition name="tab" mode="out-in">
        <OverviewPanel v-if="activeTab === 'overview'" :key="`overview-${vibeProjectId}`" :project-id="vibeProjectId" :status="status" @open-source="openSource" @open-commit="openCommit" @open-module="openModule" />
        <SourceReader v-else-if="activeTab === 'document'" :key="`document-${vibeProjectId}`" :project-id="vibeProjectId" :requested-document-id="requestedDocumentId" :requested-source-id="requestedSourceId" :requested-path="requestedPath" :requested-offset="requestedOffset" />
        <SearchPanel v-else-if="activeTab === 'search'" :key="`search-${vibeProjectId}`" :project-id="vibeProjectId" @open-document="openDocument" />
        <CommitPanel v-else-if="activeTab === 'history'" :key="`history-${vibeProjectId}`" :project-id="vibeProjectId" :requested-seq="requestedCommitSeq" @open-source="openSource" />
        <ReceiptPanel v-else :key="`receipts-${vibeProjectId}`" :project-id="vibeProjectId" @open-commit="openCommit" />
      </Transition>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiGetJoinProjects } from '@/api/project/index'
import AppSelect from '@/components/common/select/AppSelect.vue'
import CommitPanel from './components/CommitPanel.vue'
import OverviewPanel from './components/OverviewPanel.vue'
import ReceiptPanel from './components/ReceiptPanel.vue'
import SearchPanel from './components/SearchPanel.vue'
import SourceReader from './components/SourceReader.vue'
import { getKnowledgeStatus, getVibeProjectByAsyncProject, initVibeProject, searchKnowledge, type KnowledgeStatus } from '../api'

type TabKey = 'overview' | 'document' | 'search' | 'history' | 'receipts'
const tabs: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: 'overview', label: '总览', hint: '现状' }, { key: 'document', label: '原文', hint: '阅读' },
  { key: 'search', label: '搜索', hint: '定位' }, { key: 'history', label: '变更', hint: '提交' },
  { key: 'receipts', label: '回执', hint: '确认' },
]

const route = useRoute()
const router = useRouter()
const projects = ref<any[]>([])
const selectedAsyncProjectId = ref('')
const vibeProjectId = ref('')
const status = ref<KnowledgeStatus | null>(null)
const activeTab = ref<TabKey>('document')
const requestedDocumentId = ref('')
const requestedSourceId = ref('')
const requestedPath = ref<string[]>([])
const requestedOffset = ref(0)
const requestedCommitSeq = ref<number>()
const loading = ref(false)
const error = ref('')

const projectOptions = computed(() => projects.value.map(item => ({ value: String(item.id), label: item.name || item.project_name || `项目 ${item.id}`, hint: item.description || '' })))
const selectedProjectName = computed(() => projects.value.find(item => String(item.id) === selectedAsyncProjectId.value)?.name || '当前项目')
const activeTabLabel = computed(() => tabs.find(item => item.key === activeTab.value)?.label || '原文')
const activeTabIndex = computed(() => String(Math.max(0, tabs.findIndex(item => item.key === activeTab.value))))

onMounted(() => {
  setFluidPage(true)
  bootstrap()
})
onBeforeUnmount(() => setFluidPage(false))

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
  selectedAsyncProjectId.value = String(project.id)
  localStorage.setItem('vibe_project_source_project_id', selectedAsyncProjectId.value)
  loading.value = true; error.value = ''; status.value = null
  requestedDocumentId.value = ''; requestedSourceId.value = ''; requestedPath.value = []; requestedCommitSeq.value = undefined
  try {
    let vibe
    try { vibe = await getVibeProjectByAsyncProject(Number(project.id)) }
    catch { vibe = await initVibeProject(Number(project.id), { name: project.name || project.project_name || `项目 ${project.id}` }) }
    vibeProjectId.value = String(vibe.id)
    await reload()
    await router.replace({ query: { ...route.query, project: selectedAsyncProjectId.value } })
  } catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason) } finally { loading.value = false }
}

async function reload() {
  if (!vibeProjectId.value) return
  loading.value = true; error.value = ''
  try { status.value = await getKnowledgeStatus(vibeProjectId.value) }
  catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason) }
  finally { loading.value = false }
}

function openSource(id: string, offset = 0) { requestedSourceId.value = id; requestedDocumentId.value = ''; requestedOffset.value = offset; requestedPath.value = []; activeTab.value = 'document' }
function openDocument(id: string, offset = 0) { requestedDocumentId.value = id; requestedSourceId.value = ''; requestedOffset.value = offset; requestedPath.value = []; activeTab.value = 'document' }
async function openModule(path: string[]) {
  const query = path[path.length - 1] || ''
  const hit = query ? (await searchKnowledge(vibeProjectId.value, { q: query, limit: 20 })).items.find(item => path.every((part, index) => item.title_path[index] === part)) : undefined
  if (hit) openDocument(hit.document_id, hit.start_offset)
  else { requestedPath.value = [...path]; requestedDocumentId.value = ''; requestedSourceId.value = ''; requestedOffset.value = 0; activeTab.value = 'document' }
}
function openCommit(seq: number) { requestedCommitSeq.value = seq; activeTab.value = 'history' }
function goChat() { router.push({ name: 'vibeKnowledge', query: { ...route.query, project: selectedAsyncProjectId.value || undefined } }) }
</script>

<style scoped lang="scss">
.kb-browser { --header-h: 60px; --tabs-h: 48px; display: grid; grid-template-rows: var(--header-h) var(--tabs-h) minmax(0,1fr); width: 100vw; height: 100vh; overflow: hidden; background: #fff; color: #202124; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; }
.window-drag { position: fixed; z-index: 20; top: 0; left: 0; right: 0; height: 7px; -webkit-app-region: drag; }
.topbar { display: grid; grid-template-columns: minmax(260px,1fr) auto minmax(300px,1fr); align-items: center; gap: 20px; padding: 8px 15px 6px; border-bottom: 1px solid #dedede; }
.title-block { display: flex; align-items: center; min-width: 0; gap: 9px; } h1, p { margin: 0; } h1 { font-size: 14px; font-weight: 650; } .title-block p { margin-top: 2px; color: #999; font-size: 10px; }
.icon-button, .book-icon { display: grid; width: 31px; height: 31px; flex: 0 0 auto; place-items: center; border: 1px solid #ddd; border-radius: 6px; background: #fff; color: #222; } .icon-button { cursor: pointer; } .icon-button:hover { background: #f1f1f1; }
.metrics { display: flex; align-items: center; height: 30px; } .metrics button { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 54px; height: 30px; padding: 0 10px; border: 0; background: transparent; cursor: pointer; } .metrics button + button::before { position: absolute; top: 7px; bottom: 7px; left: 0; width: 1px; background: #dedede; content: ''; } .metrics button:hover { background: #f5f5f5; } .metrics b { font-size: 12px; line-height: 1; } .metrics span { color: #8b8b8b; font-size: 10px; line-height: 1; }
.actions { display: flex; justify-content: flex-end; align-items: center; min-width: 0; gap: 8px; } .actions > i { width: 1px; height: 24px; background: #ddd; }
.project-select { width: min(250px, 46vw); } .project-select :deep(.app-select-trigger) { width: 100%; height: 34px; min-width: 0; padding: 0 10px 0 12px; border: 1px solid #d9d9d9; border-radius: 6px; background: #fff; box-shadow: none; font-family: inherit; font-size: 11px; } .project-select :deep(.app-select-trigger:hover), .project-select :deep(.app-select-trigger.is-open) { border-color: #bcbcbc; background: #f7f7f7; box-shadow: none; } .project-select :deep(.app-select-value) { text-align: right; }
.refresh { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 11px; border: 0; border-radius: 6px; background: #171717; color: #fff; cursor: pointer; } .refresh span { font-size: 11px; }
.tabs { --count: 5; position: relative; display: grid; grid-template-columns: repeat(var(--count),1fr); padding: 4px; border-bottom: 1px solid #ddd; background: #fff; }
.tabs .indicator { position: absolute; z-index: 0; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / var(--count)); border-radius: 5px; background: #151515; transform: translateX(calc(var(--tab-index) * 100%)); transition: transform .24s cubic-bezier(.2,.8,.2,1); }
.tabs button { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 5px; border: 0; background: transparent; color: #777; cursor: pointer; } .tabs button.active { color: #fff; } .tabs strong { font-size: 12px; line-height: 1; } .tabs small { color: #aaa; font-size: 9px; line-height: 1; } .tabs button.active small { color: #bdbdbd; }
.workspace { min-width: 0; min-height: 0; overflow: hidden; } .workspace > * { width: 100%; height: 100%; }
.state { display: grid; place-items: center; min-height: 0; color: #999; font-size: 13px; } .state.error { color: #a33; }
.tab-enter-active, .tab-leave-active { transition: opacity .14s ease, transform .14s ease; } .tab-enter-from { opacity: 0; transform: translateY(4px); } .tab-leave-to { opacity: 0; transform: translateY(-3px); }
.loading .refresh svg { animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 900px) { .topbar { grid-template-columns: minmax(210px,1fr) auto; } .metrics { display: none; } }
@media (max-width: 620px) { .kb-browser { --header-h: 58px; --tabs-h: 46px; } .topbar { gap: 9px; padding-inline: 8px; } .title-block .book-icon, .title-block p, .refresh span { display: none; } .project-select { width: min(190px, 42vw); } .tabs small { display: none; } }
</style>

<style lang="scss">
html.vibe-fluid-page,
body.vibe-fluid-page,
#app.vibe-fluid-page {
  min-width: 0;
  min-height: 0;
}
</style>
