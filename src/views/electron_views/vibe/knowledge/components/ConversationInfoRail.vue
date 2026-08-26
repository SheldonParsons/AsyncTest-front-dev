<template>
  <aside
    class="conversation-info-rail"
    :class="{ collapsed, 'viewer-open': viewerOpen }"
    :aria-hidden="collapsed ? 'true' : undefined"
    :inert="collapsed"
    aria-label="对话信息栏"
  >
    <div class="info-rail-content">
      <section class="info-section knowledge-section" aria-labelledby="recent-knowledge-title">
        <header>
          <h2 id="recent-knowledge-title">最近知识变更</h2>
          <button class="view-all" type="button" title="功能即将开放" @click="showComingSoon">查看全部</button>
        </header>
        <p v-if="changesLoading" class="info-state">正在读取最近变更…</p>
        <p v-else-if="changesError" class="info-state error" role="status">{{ changesError }}</p>
        <p v-else-if="!changes.length" class="info-state">暂无知识变更</p>
        <div v-else class="info-list">
          <button
            v-for="item in changes"
            :key="item.id"
            class="info-row knowledge-row"
            type="button"
            @click="emit('open-change', item)"
          >
            <span class="info-row-main">
              <strong :title="knowledgeChangeTitle(item)">{{ knowledgeChangeTitle(item) }}</strong>
              <small>{{ knowledgeChangeKindLabel(item.kind) }} · {{ item.actor_name || '未知用户' }} · {{ formatKnowledgeChangeTime(item.created_at) }}</small>
            </span>
          </button>
        </div>
      </section>

      <section class="info-section file-section" aria-labelledby="recent-files-title">
        <header>
          <h2 id="recent-files-title">当前会话文件</h2>
          <button class="view-all" type="button" title="功能即将开放" @click="showComingSoon">查看全部</button>
        </header>
        <p v-if="filesLoading" class="info-state">正在读取会话文件…</p>
        <p v-else-if="filesError" class="info-state error" role="status">{{ filesError }}</p>
        <p v-else-if="!sessionId" class="info-state">选择会话后显示文件</p>
        <p v-else-if="!files.length" class="info-state">当前会话暂无文件</p>
        <div v-else class="info-list">
          <button
            v-for="file in files.slice(0, 5)"
            :key="file.identity"
            class="info-row file-row"
            type="button"
            @click="emit('open-file', file)"
          >
            <span class="file-icon" aria-hidden="true">
              <MarkdownFileIcon :size="24" :font-size="9" :radius="8" />
            </span>
            <span class="info-row-main">
              <strong :title="file.filename">{{ file.filename }}</strong>
              <small v-if="fileMeta(file)">{{ fileMeta(file) }}</small>
            </span>
          </button>
        </div>
      </section>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { KnowledgeCommitSummary } from '../../api'
import {
  formatKnowledgeChangeTime,
  knowledgeChangeKindLabel,
  knowledgeChangeTitle,
} from '../../browser/knowledgeChangePresentation'
import type { RecentSessionFile } from '../conversationInfoRailPolicy'
import MarkdownFileIcon from './icons/MarkdownFileIcon.vue'

defineProps<{
  collapsed: boolean
  viewerOpen: boolean
  changes: KnowledgeCommitSummary[]
  changesLoading: boolean
  changesError: string
  files: RecentSessionFile[]
  filesLoading: boolean
  filesError: string
  sessionId: string
}>()

const emit = defineEmits<{
  'open-change': [item: KnowledgeCommitSummary]
  'open-file': [file: RecentSessionFile]
}>()

function showComingSoon(): void {
  window.$toast({ title: '开发中，敬请期待' })
}

function sizeLabel(value: unknown): string {
  const size = Number(value || 0)
  if (!Number.isFinite(size) || size <= 0) return ''
  if (size < 1024) return `${Math.round(size)} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function fileTypeLabel(file: RecentSessionFile): string {
  const rawMime = String(file.mime || '').trim()
  const mime = rawMime.toLowerCase()
  const filename = String(file.filename || '').trim().toLowerCase()
  if (mime.includes('markdown') || filename.endsWith('.md') || filename.endsWith('.markdown')) return 'MD'
  return rawMime
}

function fileMeta(file: RecentSessionFile): string {
  return [
    fileTypeLabel(file),
    sizeLabel(file.size),
    String(file.status || '').trim(),
    file.last_seen_at ? formatKnowledgeChangeTime(file.last_seen_at) : '',
  ].filter(Boolean).join(' · ')
}
</script>

<style scoped lang="scss">
.conversation-info-rail {
  position: absolute;
  top: 54px;
  right: var(--conversation-info-rail-gutter, 10px);
  z-index: 23;
  width: min(
    var(--conversation-info-rail-width, 324px),
    calc(
      100%
      - var(--conversation-info-rail-gutter, 10px)
      - var(--conversation-info-rail-gutter, 10px)
    )
  );
  height: auto;
  max-height: clamp(320px, 58%, 580px);
  min-width: 0;
  min-height: 0;
  margin: 0;
  border: 1px solid rgba(15, 15, 15, .11);
  border-radius: 22px;
  background: rgba(255, 255, 255, .96);
  box-shadow:
    0 16px 40px rgba(15, 15, 15, .09),
    0 2px 8px rgba(15, 15, 15, .045);
  overflow-x: hidden;
  overflow-y: hidden;
  box-sizing: border-box;
  opacity: 1;
  transform: translateX(0);
  transition:
    width 220ms ease,
    border-color 170ms ease,
    border-width 170ms ease,
    box-shadow 170ms ease,
    opacity 170ms ease,
    transform 220ms ease,
    right 320ms cubic-bezier(.22, 1, .36, 1);
}

.conversation-info-rail.viewer-open {
  right: calc(var(--workspace-window-width) + var(--conversation-info-rail-gutter, 10px));
  width: min(
    var(--conversation-info-rail-width, 324px),
    calc(
      100% - var(--workspace-window-width)
      - var(--conversation-info-rail-gutter, 10px)
      - var(--conversation-info-rail-gutter, 10px)
    )
  );
}

.conversation-info-rail.collapsed {
  width: 0;
  border-width: 0;
  border-color: transparent;
  box-shadow: none;
  opacity: 0;
  transform: translateX(14px);
  pointer-events: none;
}

.info-rail-content {
  width: 100%;
  min-width: 298px;
  height: auto;
  padding: 20px 16px 18px;
  box-sizing: border-box;
  overflow: hidden;
  opacity: 1;
  transform: translateX(0);
  transition: opacity 170ms ease, transform 220ms ease;
}
.conversation-info-rail.collapsed .info-rail-content {
  opacity: 0;
  transform: translateX(14px);
}
.info-section { padding: 14px 0 18px; border-top: 1px solid rgba(15, 15, 15, .065); }
.info-section:first-child { border-top: 0; padding-top: 0; }
.info-section > header { min-height: 28px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.info-section h2 { margin: 0; color: #8f8f8f; font-size: 14px; font-weight: 600; line-height: 20px; }
.view-all { margin: -4px -6px -4px 0; padding: 4px 6px; border: 0; border-radius: 7px; background: transparent; color: rgba(15, 15, 15, .35); font: inherit; font-size: 11px; cursor: pointer; user-select: none; transition: background-color 140ms ease, color 140ms ease; }
.view-all:hover { background: rgba(15, 15, 15, .055); color: rgba(15, 15, 15, .58); }
.view-all:focus-visible { outline: 2px solid rgba(15, 15, 15, .2); outline-offset: 1px; }
.info-list {
  display: grid;
  gap: 2px;
  min-height: 0;
  margin-top: 5px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}
.knowledge-section .info-list { max-height: 196px; }
.file-section .info-list { max-height: 176px; }
.info-row { width: 100%; min-width: 0; display: grid; align-items: center; gap: 9px; padding: 8px 7px; border: 0; border-radius: 9px; background: transparent; color: rgba(15, 15, 15, .76); font: inherit; text-align: left; cursor: pointer; transition: background-color 140ms ease; }
.info-row:hover { background: rgba(15, 15, 15, .045); }
.info-row:focus-visible { outline: 2px solid rgba(15, 15, 15, .2); outline-offset: 1px; }
.knowledge-row { grid-template-columns: minmax(0, 1fr); padding: 6px 7px; }
.file-row { grid-template-columns: 24px minmax(0, 1fr); }
.file-icon { width: 24px; height: 24px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.file-icon :deep(.markdown-file-icon) { width: 100%; height: 100%; }
.info-row-main { min-width: 0; display: block; }
.info-row strong, .info-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.info-row strong { color: rgba(15, 15, 15, .78); font-size: 12px; font-weight: 600; }
.info-row small { margin-top: 3px; color: rgba(15, 15, 15, .4); font-size: 10px; }
.knowledge-row strong { font-size: 13px; }
.knowledge-row small { font-size: 11px; }
.info-state { margin: 10px 7px 0; color: rgba(15, 15, 15, .38); font-size: 11px; line-height: 1.55; }
.info-state.error { color: #a34c4c; }

@media (prefers-reduced-motion: reduce) {
  .conversation-info-rail,
  .info-rail-content,
  .view-all,
  .info-row {
    transition: none;
  }
}
</style>
