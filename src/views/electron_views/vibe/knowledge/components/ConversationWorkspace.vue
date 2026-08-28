<template>
  <section class="conversation-workspace" aria-label="Viewer 工作区">
    <header v-if="tabs.length" class="workspace-head">
      <div
        ref="tabListEl"
        class="workspace-tablist"
        role="tablist"
        aria-label="已打开的 Viewer"
        @wheel="scrollTabsWithWheel"
      >
        <div
          v-for="(tab, index) in tabs"
          :key="tab.id"
          class="workspace-tab-shell"
          :class="{ active: tab.id === activeId }"
          role="presentation"
        >
          <button
            :id="tabDomId(tab.id)"
            :ref="element => setTabButton(tab.id, element)"
            class="workspace-tab"
            type="button"
            role="tab"
            :aria-selected="tab.id === activeId"
            :aria-controls="panelDomId(tab.id)"
            :tabindex="tab.id === activeId ? 0 : -1"
            :title="tab.title"
            @click="emit('select', tab.id)"
            @keydown="handleTabKeydown($event, index)"
          >
            <svg v-if="tab.kind === 'change-list' || tab.kind === 'file-list'" class="workspace-tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h11" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
            </svg>
            <svg v-else-if="tab.kind === 'change'" class="workspace-tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.9" />
              <path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
            </svg>
            <svg v-else class="workspace-tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 3h8l4 4v14H6z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" />
              <path d="M14 3v5h4M9 12h6M9 16h6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="workspace-tab-title">{{ tab.title }}</span>
          </button>
          <button
            class="workspace-tab-close"
            type="button"
            :aria-label="`关闭 ${tab.title}`"
            title="关闭"
            @click="closeTab(tab.id, index)"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div v-if="!tabs.length" ref="emptyStateEl" class="workspace-empty" role="status" tabindex="-1">
      <strong>您尚未选择任何 Viewer</strong>
      <span>从右侧 Panel 中选择文件或变更后，将在这里打开。</span>
    </div>

    <section
      v-else-if="activeTab"
      :id="panelDomId(activeTab.id)"
      class="workspace-panel"
      role="tabpanel"
      :aria-labelledby="tabDomId(activeTab.id)"
      tabindex="0"
    >
      <KnowledgeChangesViewer
        v-if="activeTab.kind === 'change-list'"
        :project-id="activeTab.projectId"
        :items="activeTab.items"
        :loading="activeTab.loading"
        :loading-more="activeTab.loadingMore"
        :error="activeTab.error"
        :has-more="activeTab.hasMore"
        @open-change="emit('open-change-list-item', $event)"
        @load-more="emit('load-more-change-list', activeTab.id)"
        @retry="emit('retry-change-list', activeTab.id)"
      />

      <SessionFilesViewer
        v-else-if="activeTab.kind === 'file-list'"
        :session-id="activeTab.sessionId"
        :items="activeTab.items"
        :loading="activeTab.loading"
        :loading-more="activeTab.loadingMore"
        :error="activeTab.error"
        :has-more="activeTab.hasMore"
        @open-file="emit('open-file-list-item', $event, activeTab.sessionId)"
        @load-more="emit('load-more-file-list', activeTab.id)"
        @retry="emit('retry-file-list', activeTab.id)"
      />

      <CommitDiffDetail
        v-else-if="activeTab.kind === 'change'"
        :detail="activeTab.detail"
        :loading="activeTab.loading"
        :error="activeTab.error"
        :viewer-id="activeTab.id"
        @open-source="emit('open-source', $event)"
        @retry="emit('retry-change', activeTab.id)"
      />

      <div v-else class="file-viewer" :aria-busy="activeTab.loading">
        <div v-if="activeTab.loading" class="viewer-state" aria-live="polite">
          <span class="viewer-spinner" aria-hidden="true" />
          <strong>正在读取{{ activeFileNoun }}…</strong>
        </div>
        <div v-else-if="activeTab.error" class="viewer-state error" role="alert">
          <strong>{{ activeFileNoun }}读取失败</strong>
          <span>{{ activeTab.error }}</span>
          <button type="button" @click="emit('retry-file', activeTab.id)">重试</button>
        </div>
        <div v-else-if="activeFileMode === 'unsupported'" class="viewer-state">
          <strong>暂不支持预览此文件</strong>
          <span>{{ fileTypeDescription(activeTab) }}</span>
        </div>
        <div v-else-if="!activeTab.content" class="viewer-state">
          <strong>{{ activeFileNoun }}内容为空</strong>
          <span>该{{ activeFileNoun }}没有可显示的正文。</span>
        </div>
        <article v-else-if="activeFileMode === 'markdown'" class="markdown-body" v-html="renderedMarkdown" />
        <pre v-else class="plain-body">{{ activeTab.content }}</pre>
      </div>
    </section>

    <div v-else class="workspace-empty" role="status">
      <strong>Viewer 状态已更新</strong>
      <span>请重新选择需要查看的页签。</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import CommitDiffDetail from '../../browser/components/CommitDiffDetail.vue'
import KnowledgeChangesViewer from './KnowledgeChangesViewer.vue'
import SessionFilesViewer from './SessionFilesViewer.vue'
import type {
  WorkspaceFileViewerTab,
  WorkspaceViewerTab,
} from '../workspaceViewerPolicy'
import type { KnowledgeCommitSummary } from '../../api'
import type { RecentSessionFile } from '../conversationInfoRailPolicy'

const props = defineProps<{
  tabs: WorkspaceViewerTab[]
  activeId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  close: [id: string]
  'open-source': [id: string]
  'retry-file': [id: string]
  'retry-change': [id: string]
  'open-change-list-item': [item: KnowledgeCommitSummary]
  'load-more-change-list': [id: string]
  'retry-change-list': [id: string]
  'open-file-list-item': [file: RecentSessionFile, sessionId: string]
  'load-more-file-list': [id: string]
  'retry-file-list': [id: string]
}>()

const tabListEl = ref<HTMLElement | null>(null)
const emptyStateEl = ref<HTMLElement | null>(null)
const tabButtons = new Map<string, HTMLButtonElement>()

const activeTab = computed(() => props.tabs.find(tab => tab.id === props.activeId) || null)
const activeFileNoun = computed(() => (
  activeTab.value?.kind === 'file'
  && ['knowledge-citation', 'knowledge-source'].includes(String(activeTab.value.file.kind || ''))
    ? '来源'
    : '文件'
))
const activeFileMode = computed(() => (
  activeTab.value?.kind === 'file' ? filePresentationMode(activeTab.value) : 'unsupported'
))
const renderedMarkdown = computed(() => {
  if (activeTab.value?.kind !== 'file' || activeFileMode.value !== 'markdown') return ''
  return DOMPurify.sanitize(String(marked.parse(activeTab.value.content || '')), {
    USE_PROFILES: { html: true },
  })
})

function setTabButton(id: string, element: Element | ComponentPublicInstance | null): void {
  if (element instanceof HTMLButtonElement) tabButtons.set(id, element)
  else tabButtons.delete(id)
}

function domToken(value: string): string {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.codePointAt(0) || 0
    hash = Math.imul(hash, 16777619)
  }
  const readable = value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'viewer'
  return `${readable}-${(hash >>> 0).toString(36)}`
}

function tabDomId(id: string): string {
  return `workspace-tab-${domToken(id)}`
}

function panelDomId(id: string): string {
  return `workspace-panel-${domToken(id)}`
}

function focusTab(id: string | null | undefined): void {
  if (!id) {
    void nextTick(() => emptyStateEl.value?.focus())
    return
  }
  void nextTick(() => tabButtons.get(id)?.focus())
}

function handleTabKeydown(event: KeyboardEvent, index: number): void {
  if (event.key === 'Delete') {
    event.preventDefault()
    closeTab(props.tabs[index].id, index)
    return
  }
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const targetIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? props.tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + props.tabs.length) % props.tabs.length
  const target = props.tabs[targetIndex]
  if (!target) return
  emit('select', target.id)
  focusTab(target.id)
}

function closeTab(id: string, index: number): void {
  const focusAfterClose = id === props.activeId
    ? (props.tabs[index + 1]?.id || props.tabs[index - 1]?.id || null)
    : props.activeId
  emit('close', id)
  focusTab(focusAfterClose)
}

function scrollTabsWithWheel(event: WheelEvent): void {
  const container = tabListEl.value
  if (!container || container.scrollWidth <= container.clientWidth) return
  const delta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (!delta) return
  event.preventDefault()
  container.scrollLeft += delta
}

function filePresentationMode(tab: WorkspaceFileViewerTab): 'markdown' | 'text' | 'unsupported' {
  const mime = String(tab.file.mime || '').trim().toLowerCase()
  const filename = String(tab.file.filename || tab.title || '').trim().toLowerCase()
  if (mime.includes('markdown') || /\.(?:md|markdown)$/i.test(filename)) return 'markdown'
  if (mime.startsWith('text/') || /(?:json|javascript|typescript|xml|yaml|csv|sql|shellscript)/i.test(mime)) return 'text'
  if (/\.(?:txt|log|json|jsonl|ya?ml|csv|tsv|xml|html?|css|s[ac]ss|[cm]?[jt]sx?|py|java|go|rs|sql|sh|zsh|fish|toml|ini|conf)$/i.test(filename)) return 'text'
  return 'unsupported'
}

function fileTypeDescription(tab: WorkspaceFileViewerTab): string {
  const mime = String(tab.file.mime || '').trim()
  return mime ? `文件类型：${mime}` : '当前文件类型无法作为文本显示。'
}

function focusActiveViewer(): void {
  focusTab(props.activeId)
}

defineExpose({ focusActiveViewer })

watch(() => props.activeId, (id) => {
  void nextTick(() => tabButtons.get(id || '')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
})
</script>

<style scoped lang="scss">
.conversation-workspace {
  // 开合由外层裁剪；内容按目标宽度排版，拖拽仍实时更新该变量。
  width: var(--workspace-window-width, 100%);
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: rgba(15, 15, 15, 0.88);
}

.workspace-head {
  height: 40px;
  flex: 0 0 40px;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 54px 3px 8px;
  border-bottom: 1px solid rgba(15, 15, 15, 0.07);
  box-sizing: border-box;
  background: #fff;
  -webkit-app-region: no-drag;
}

.workspace-tablist {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.workspace-tablist::-webkit-scrollbar { display: none; }

.workspace-tab-shell {
  min-width: 112px;
  max-width: 238px;
  height: 30px;
  flex: 0 1 206px;
  display: flex;
  align-items: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgba(15, 15, 15, 0.58);
  transition: background-color 140ms ease, color 140ms ease;
}

.workspace-tab-shell:hover {
  background: rgba(15, 15, 15, 0.04);
  color: rgba(15, 15, 15, 0.82);
}

.workspace-tab-shell.active {
  background: rgba(15, 15, 15, 0.06);
  color: rgba(15, 15, 15, 0.9);
}

.workspace-tab {
  min-width: 0;
  height: 100%;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 2px 0 9px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.workspace-tab:focus-visible,
.workspace-tab-close:focus-visible,
.viewer-state button:focus-visible,
.workspace-panel:focus-visible {
  outline: 2px solid rgba(15, 15, 15, 0.3);
  outline-offset: -2px;
}

.workspace-tab-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: rgba(15, 15, 15, 0.54);
}

.workspace-tab-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: 12px;
  font-weight: 620;
  line-height: 1;
}

.workspace-tab-close {
  border: 0;
  background: transparent;
  color: rgba(15, 15, 15, 0.42);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, opacity 120ms ease;
}

.workspace-tab-close {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  margin-right: 3px;
  border-radius: 6px;
  opacity: 0;
}

.workspace-tab-shell:hover .workspace-tab-close,
.workspace-tab-shell.active .workspace-tab-close,
.workspace-tab-close:focus-visible { opacity: 0.72; }

.workspace-tab-close:hover {
  background: rgba(15, 15, 15, 0.075);
  color: rgba(15, 15, 15, 0.86);
  opacity: 1;
}

.workspace-tab-close svg { width: 14px; height: 14px; }

.workspace-empty,
.viewer-state {
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  display: grid;
  place-content: center;
  justify-items: center;
  padding: 28px;
  box-sizing: border-box;
  color: rgba(15, 15, 15, 0.4);
  text-align: center;
}

.workspace-empty strong,
.viewer-state strong {
  color: rgba(15, 15, 15, 0.62);
  font-size: 13px;
  font-weight: 600;
}

.workspace-empty span,
.viewer-state span {
  max-width: 360px;
  margin-top: 7px;
  font-size: 11px;
  line-height: 1.6;
}

.workspace-panel {
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  background: #fff;
}

.file-viewer {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  box-sizing: border-box;
}

.viewer-state { height: 100%; }
.viewer-state.error { color: #9b3c3c; }
.viewer-state.error strong { color: #8e3434; }

.viewer-state button {
  min-height: 30px;
  margin-top: 12px;
  padding: 0 12px;
  border: 1px solid rgba(15, 15, 15, 0.14);
  border-radius: 7px;
  background: #fff;
  color: rgba(15, 15, 15, 0.72);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.viewer-state button:hover { background: rgba(15, 15, 15, 0.045); }

.viewer-spinner {
  width: 18px;
  height: 18px;
  margin: 0 0 10px !important;
  border: 2px solid rgba(15, 15, 15, 0.12);
  border-top-color: rgba(15, 15, 15, 0.55);
  border-radius: 50%;
  animation: viewer-spin 720ms linear infinite;
}

.markdown-body,
.plain-body {
  width: min(920px, calc(100% - 48px));
  min-width: 0;
  margin: 0 auto;
  padding: 30px 0 72px;
  box-sizing: border-box;
  color: #242424;
  font-size: 14px;
  line-height: 1.78;
  overflow-wrap: anywhere;
}

.plain-body {
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  tab-size: 2;
}

.markdown-body :deep(h1) { margin: 0 0 20px; padding-bottom: 11px; border-bottom: 1px solid #ddd; font-size: 24px; line-height: 1.35; }
.markdown-body :deep(h2) { margin: 30px 0 11px; padding-left: 10px; border-left: 2px solid #222; font-size: 19px; line-height: 1.4; }
.markdown-body :deep(h3) { margin: 23px 0 9px; font-size: 16px; line-height: 1.45; }
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) { margin: 18px 0 8px; line-height: 1.5; }
.markdown-body :deep(p) { margin: 10px 0; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { margin: 10px 0; padding-left: 26px; }
.markdown-body :deep(li) { margin: 5px 0; }
.markdown-body :deep(blockquote) { margin: 16px 0; padding: 2px 14px; border-left: 3px solid #d1d5db; color: #59616d; }
.markdown-body :deep(code) { padding: 2px 5px; border-radius: 4px; background: #f1f1f1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 0.92em; }
.markdown-body :deep(pre) { max-width: 100%; padding: 15px; border: 1px solid #dedede; border-radius: 7px; background: #f7f7f7; overflow: auto; }
.markdown-body :deep(pre code) { padding: 0; background: transparent; font-size: 12px; white-space: pre; }
.markdown-body :deep(table) { display: block; max-width: 100%; margin: 16px 0; overflow-x: auto; border-collapse: collapse; }
.markdown-body :deep(th),
.markdown-body :deep(td) { padding: 7px 10px; border: 1px solid #ddd; text-align: left; vertical-align: top; }
.markdown-body :deep(a) { color: #315e91; text-decoration: underline; text-underline-offset: 2px; }
.markdown-body :deep(img) { display: block; max-width: 100%; height: auto; margin: 16px auto; }
.markdown-body :deep(hr) { margin: 24px 0; border: 0; border-top: 1px solid #ddd; }

@keyframes viewer-spin { to { transform: rotate(360deg); } }

@media (max-width: 760px) {
  .workspace-head { padding-right: 48px; padding-left: 8px; }
  .workspace-tab-shell { min-width: 98px; flex-basis: 160px; }
  .markdown-body,
  .plain-body { width: calc(100% - 28px); padding-top: 22px; }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-tab-shell,
  .workspace-tab-close { transition: none; }
  .viewer-spinner { animation-duration: 1.5s; }
}
</style>
