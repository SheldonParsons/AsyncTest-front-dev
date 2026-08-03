<template>
  <aside class="conversation-info-rail" :class="{ collapsed }" aria-label="对话信息栏">
    <div v-if="!collapsed" class="info-rail-content">
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
            @click="showComingSoon"
          >
            <span class="info-row-main">
              <strong :title="knowledgeChangeTitle(item)">{{ knowledgeChangeTitle(item) }}</strong>
              <small>{{ knowledgeChangeKindLabel(item.kind) }} · {{ item.actor_name || '未知用户' }} · {{ formatKnowledgeChangeTime(item.created_at) }}</small>
            </span>
          </button>
        </div>
      </section>

      <section class="info-section" aria-labelledby="recent-files-title">
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
            @click="showComingSoon"
          >
            <span class="file-icon" aria-hidden="true">
              <MarkdownFileIcon />
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
  changes: KnowledgeCommitSummary[]
  changesLoading: boolean
  changesError: string
  files: RecentSessionFile[]
  filesLoading: boolean
  filesError: string
  sessionId: string
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
  flex: 0 0 324px;
  align-self: flex-start;
  width: 324px;
  height: auto;
  max-height: clamp(280px, 50%, 520px);
  min-width: 0;
  min-height: 0;
  margin: 54px 10px 0;
  border: 1px solid rgba(15, 15, 15, .11);
  border-radius: 22px;
  background: rgba(255, 255, 255, .96);
  box-shadow:
    0 16px 40px rgba(15, 15, 15, .09),
    0 2px 8px rgba(15, 15, 15, .045);
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  opacity: 1;
  transform: translateX(0);
  transition:
    width 220ms ease,
    flex-basis 220ms ease,
    margin 220ms ease,
    opacity 170ms ease,
    transform 220ms ease;
}

.conversation-info-rail.collapsed {
  flex-basis: 0;
  width: 0;
  margin-right: 0;
  margin-left: 0;
  border-width: 0;
  box-shadow: none;
  opacity: 0;
  transform: translateX(14px);
  pointer-events: none;
}

.info-rail-content { height: auto; padding: 20px 16px 18px; box-sizing: border-box; }
.info-section { padding: 14px 0 18px; border-top: 1px solid rgba(15, 15, 15, .065); }
.info-section:first-child { border-top: 0; padding-top: 0; }
.info-section > header { min-height: 28px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.info-section h2 { margin: 0; color: #8f8f8f; font-size: 14px; font-weight: 600; line-height: 20px; }
.view-all { margin: -4px -6px -4px 0; padding: 4px 6px; border: 0; border-radius: 7px; background: transparent; color: rgba(15, 15, 15, .35); font: inherit; font-size: 11px; cursor: pointer; user-select: none; transition: background-color 140ms ease, color 140ms ease; }
.view-all:hover { background: rgba(15, 15, 15, .055); color: rgba(15, 15, 15, .58); }
.view-all:focus-visible { outline: 2px solid rgba(15, 15, 15, .2); outline-offset: 1px; }
.info-list { display: grid; gap: 2px; margin-top: 5px; }
.info-row { width: 100%; min-width: 0; display: grid; align-items: center; gap: 9px; padding: 8px 7px; border: 0; border-radius: 9px; background: transparent; color: rgba(15, 15, 15, .76); font: inherit; text-align: left; cursor: pointer; transition: background-color 140ms ease; }
.info-row:hover { background: rgba(15, 15, 15, .045); }
.info-row:focus-visible { outline: 2px solid rgba(15, 15, 15, .2); outline-offset: 1px; }
.knowledge-row { grid-template-columns: minmax(0, 1fr); }
.file-row { grid-template-columns: 24px minmax(0, 1fr); }
.file-icon { width: 24px; height: 24px; border-radius: 8px; background: linear-gradient(135deg, rgba(37,99,235,.95), rgba(124,58,237,.92) 52%, rgba(22,163,74,.9)); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.28), 0 5px 12px rgba(37,99,235,.18); display: inline-flex; align-items: center; justify-content: center; }
.file-icon :deep(.markdown-file-icon) { width: 18px; height: 18px; }
.info-row-main { min-width: 0; display: block; }
.info-row strong, .info-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.info-row strong { color: rgba(15, 15, 15, .78); font-size: 12px; font-weight: 600; }
.info-row small { margin-top: 3px; color: rgba(15, 15, 15, .4); font-size: 10px; }
.knowledge-row strong { font-size: 13px; }
.knowledge-row small { font-size: 11px; }
.info-state { margin: 10px 7px 0; color: rgba(15, 15, 15, .38); font-size: 11px; line-height: 1.55; }
.info-state.error { color: #a34c4c; }

@media (max-width: 1180px) {
  .conversation-info-rail { flex-basis: 300px; width: 300px; }
  .conversation-info-rail.collapsed { flex-basis: 0; width: 0; }
}
</style>
