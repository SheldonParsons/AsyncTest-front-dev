<template>
  <section
    class="session-files-viewer"
    :data-session-id="sessionId || undefined"
    aria-label="当前会话文件列表"
  >
    <header class="session-files-head">
      <div class="session-files-heading">
        <h2>当前会话文件</h2>
        <p v-if="sessionId">按文件查看本会话中已上传的内容</p>
        <p v-else>选择会话后显示文件</p>
      </div>
      <span class="session-files-count" aria-live="polite">{{ fileItems.length }} 个</span>
    </header>

    <div
      ref="listEl"
      class="session-files-list"
      :aria-busy="loading || loadingMore"
      role="list"
      @scroll.passive="handleScroll"
    >
      <div v-if="loading && !fileItems.length" class="session-files-state" aria-live="polite">
        <span class="state-spinner" aria-hidden="true" />
        <strong>正在读取会话文件…</strong>
      </div>

      <div v-else-if="error && !fileItems.length" class="session-files-state error" role="alert">
        <strong>会话文件读取失败</strong>
        <span>{{ error }}</span>
        <button type="button" @click="emit('retry')">重试</button>
      </div>

      <div v-else-if="!sessionId" class="session-files-state">
        <strong>尚未选择会话</strong>
        <span>选择一个会话后，这里会列出该会话的文件。</span>
      </div>

      <div v-else-if="!fileItems.length" class="session-files-state">
        <strong>当前会话暂无文件</strong>
        <span>在对话中上传文件后，会显示在这里。</span>
      </div>

      <div v-else class="session-files-rows">
        <button
          v-for="file in fileItems"
          :key="file.identity"
          class="session-file-row"
          type="button"
          role="listitem"
          :aria-label="`打开文件 ${file.filename}`"
          @click="emit('open-file', file)"
        >
          <span class="file-icon" aria-hidden="true">
            <MarkdownFileIcon :size="30" :font-size="11" :radius="9" />
          </span>
          <span class="file-row-main">
            <strong :title="file.filename">{{ file.filename }}</strong>
            <small v-if="fileMeta(file)">{{ fileMeta(file) }}</small>
          </span>
          <svg class="file-row-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <div v-if="loadingMore && fileItems.length" class="session-files-more" aria-live="polite">
        <span class="state-spinner small" aria-hidden="true" />
        <span>继续读取…</span>
      </div>

      <div v-else-if="loading && fileItems.length" class="session-files-more" aria-live="polite">
        <span class="state-spinner small" aria-hidden="true" />
        <span>正在刷新会话文件…</span>
      </div>

      <div v-else-if="error && fileItems.length" class="session-files-more error" role="alert">
        <span>{{ error }}</span>
        <button type="button" @click="emit('retry')">重试</button>
      </div>

      <p v-else-if="sessionId && fileItems.length && !hasMore" class="session-files-end">
        已加载全部文件，没有更多内容
      </p>
      <p v-else-if="sessionId && fileItems.length && hasMore" class="session-files-end hint">
        向下滚动加载更多
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatKnowledgeChangeTime } from '../../browser/knowledgeChangePresentation'
import type { RecentSessionFile } from '../conversationInfoRailPolicy'
import MarkdownFileIcon from './icons/MarkdownFileIcon.vue'

interface SessionFilesViewerProps {
  /** 当前会话身份；切换会话时由父级递增上下文并清空旧列表。 */
  sessionId: string
  /** 列表项。`files` 是兼容 rail 命名的可选别名。 */
  items?: RecentSessionFile[]
  files?: RecentSessionFile[]
  loading?: boolean
  loadingMore?: boolean
  error?: string
  hasMore?: boolean
}

const props = withDefaults(defineProps<SessionFilesViewerProps>(), {
  items: undefined,
  files: undefined,
  loading: false,
  loadingMore: false,
  error: '',
  hasMore: false,
})

const emit = defineEmits<{
  'open-file': [file: RecentSessionFile]
  'load-more': []
  retry: []
}>()

const listEl = ref<HTMLElement | null>(null)
const loadMorePending = ref(false)
const fileItems = computed(() => props.items ?? props.files ?? [])

/**
 * The list component owns only the scroll gate. The parent owns the request,
 * cursor and de-duplication state; this keeps stale session responses out of
 * the Viewer while making repeated scroll events harmless.
 */
function requestMore(): void {
  if (
    !props.sessionId
    || !props.hasMore
    || props.loading
    || props.loadingMore
    || props.error
    || loadMorePending.value
  ) return
  loadMorePending.value = true
  emit('load-more')
}

function handleScroll(event: Event): void {
  const element = event.currentTarget as HTMLElement | null
  if (!element) return
  const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight
  if (distanceToBottom <= 96) requestMore()
}

// A page can finish with no rows (or an error). Release the local gate only
// after the parent has reflected that result, so one scroll frame cannot issue
// duplicate requests while the Promise is settling.
watch(
  () => [props.sessionId, fileItems.value.length, props.loadingMore, props.error, props.hasMore] as const,
  (next, previous) => {
    const [sessionId, count, loadingMore, error, hasMore] = next
    const [previousSessionId, previousCount, previousLoadingMore, previousError] = previous || []
    if (sessionId !== previousSessionId || count !== previousCount || previousLoadingMore !== loadingMore) {
      loadMorePending.value = false
    }
    if (error && error !== previousError) loadMorePending.value = false
    if (!hasMore || !sessionId) loadMorePending.value = false
  },
)

function sizeLabel(value: unknown): string {
  const size = Number(value || 0)
  if (!Number.isFinite(size) || size <= 0) return ''
  if (size < 1024) return `${Math.round(size)} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function fileTypeLabel(file: RecentSessionFile): string {
  const mime = String(file.mime || '').trim().toLowerCase()
  const filename = String(file.filename || '').trim().toLowerCase()
  if (mime.includes('markdown') || filename.endsWith('.md') || filename.endsWith('.markdown')) return 'MD'
  if (mime.startsWith('text/')) return mime.slice(5).toUpperCase()
  return String(file.mime || '').trim()
}

function fileMeta(file: RecentSessionFile): string {
  return [
    fileTypeLabel(file),
    sizeLabel(file.size),
    String(file.status || '').trim(),
    file.last_seen_at ? formatKnowledgeChangeTime(file.last_seen_at) : '',
  ].filter(Boolean).join(' · ')
}

defineExpose({ listEl, handleScroll })
</script>

<style scoped lang="scss">
.session-files-viewer,
.session-files-viewer * { box-sizing: border-box; }

.session-files-viewer {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  background: #fff;
  color: rgba(15, 15, 15, .84);
}

.session-files-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 22px 28px 14px;
  border-bottom: 1px solid rgba(15, 15, 15, .08);
}

.session-files-heading { min-width: 0; }
.session-files-heading h2,
.session-files-heading p { margin: 0; }
.session-files-heading h2 { color: rgba(15, 15, 15, .82); font-size: 14px; font-weight: 650; line-height: 1.35; }
.session-files-heading p { margin-top: 4px; color: rgba(15, 15, 15, .42); font-size: 11px; line-height: 1.5; }
.session-files-count { flex: 0 0 auto; color: rgba(15, 15, 15, .42); font-size: 11px; line-height: 24px; }

.session-files-list {
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding: 8px 20px 28px;
}

.session-files-rows { display: grid; gap: 2px; }

.session-file-row {
  width: 100%;
  min-width: 0;
  min-height: 62px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border: 0;
  border-bottom: 1px solid rgba(15, 15, 15, .065);
  border-radius: 9px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}

.session-file-row:hover { background: rgba(15, 15, 15, .045); }
.session-file-row:focus-visible { position: relative; z-index: 1; outline: 2px solid rgba(15, 15, 15, .25); outline-offset: -2px; }
.file-icon { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; color: rgba(15, 15, 15, .55); }
.file-icon :deep(.markdown-file-icon) { width: 100%; height: 100%; }
.file-row-main { min-width: 0; display: block; }
.file-row-main strong,
.file-row-main small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-row-main strong { color: rgba(15, 15, 15, .78); font-size: 13px; font-weight: 600; line-height: 1.35; }
.file-row-main small { margin-top: 4px; color: rgba(15, 15, 15, .4); font-size: 11px; line-height: 1.3; }
.file-row-chevron { width: 16px; height: 16px; color: rgba(15, 15, 15, .28); transition: transform 140ms ease, color 140ms ease; }
.session-file-row:hover .file-row-chevron { color: rgba(15, 15, 15, .54); transform: translateX(2px); }

.session-files-state {
  min-height: 190px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 6px;
  padding: 30px 20px;
  color: rgba(15, 15, 15, .4);
  text-align: center;
}

.session-files-state strong { color: rgba(15, 15, 15, .62); font-size: 13px; font-weight: 600; }
.session-files-state span:not(.state-spinner) { max-width: 360px; font-size: 11px; line-height: 1.6; }
.session-files-state.error { color: #9b3c3c; }
.session-files-state.error strong { color: #8e3434; }
.session-files-state button,
.session-files-more button {
  min-height: 30px;
  margin-top: 6px;
  padding: 0 12px;
  border: 1px solid rgba(15, 15, 15, .14);
  border-radius: 7px;
  background: #fff;
  color: rgba(15, 15, 15, .72);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.session-files-state button:hover,
.session-files-more button:hover { background: rgba(15, 15, 15, .045); }

.session-files-more,
.session-files-end {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 3px 0 0;
  color: rgba(15, 15, 15, .38);
  font-size: 11px;
  text-align: center;
}
.session-files-more.error { min-height: 56px; flex-wrap: wrap; color: #9b3c3c; }
.session-files-more.error button { margin-top: 0; }
.session-files-end { color: rgba(15, 15, 15, .3); }
.session-files-end.hint { color: rgba(15, 15, 15, .28); }

.state-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(15, 15, 15, .12);
  border-top-color: rgba(15, 15, 15, .55);
  border-radius: 50%;
  animation: session-files-spin 720ms linear infinite;
}
.state-spinner.small { width: 14px; height: 14px; border-width: 1.5px; }

@keyframes session-files-spin { to { transform: rotate(360deg); } }

@media (max-width: 760px) {
  .session-files-head { padding: 18px 16px 12px; }
  .session-files-list { padding-right: 12px; padding-left: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .session-file-row,
  .file-row-chevron { transition: none; }
  .state-spinner { animation-duration: 1.5s; }
}
</style>
