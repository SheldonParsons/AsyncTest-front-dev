<template>
  <aside class="conversation-info-rail" :class="{ collapsed }" aria-label="对话信息栏">
    <header class="info-rail-head">
      <button
        class="info-rail-toggle"
        type="button"
        :title="collapsed ? '展开信息栏' : '收起信息栏'"
        :aria-label="collapsed ? '展开信息栏' : '收起信息栏'"
        :aria-expanded="!collapsed"
        @click="$emit('toggle')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings2-icon lucide-settings-2" aria-hidden="true"><path d="M14 17H5"/><path d="M19 7h-9"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
      </button>
    </header>

    <div v-if="!collapsed" class="info-rail-content">
      <section class="info-section" aria-labelledby="recent-knowledge-title">
        <header>
          <h2 id="recent-knowledge-title">最近知识变更</h2>
          <span class="view-all" aria-disabled="true">查看全部</span>
        </header>
        <p v-if="changesLoading" class="info-state">正在读取最近变更…</p>
        <p v-else-if="changesError" class="info-state error" role="status">{{ changesError }}</p>
        <p v-else-if="!changes.length" class="info-state">暂无知识变更</p>
        <div v-else class="info-list">
          <div v-for="item in changes" :key="item.id" class="info-row knowledge-row">
            <span class="change-dot" :class="`is-${item.kind}`" aria-hidden="true" />
            <span class="info-row-main">
              <strong :title="knowledgeChangeTitle(item)">{{ knowledgeChangeTitle(item) }}</strong>
              <small>{{ knowledgeChangeKindLabel(item.kind) }} · {{ item.actor_name || '未知用户' }} · {{ formatKnowledgeChangeTime(item.created_at) }}</small>
            </span>
          </div>
        </div>
      </section>

      <section class="info-section" aria-labelledby="recent-files-title">
        <header>
          <h2 id="recent-files-title">当前会话文件</h2>
        </header>
        <p v-if="filesLoading" class="info-state">正在读取会话文件…</p>
        <p v-else-if="filesError" class="info-state error" role="status">{{ filesError }}</p>
        <p v-else-if="!sessionId" class="info-state">选择会话后显示文件</p>
        <p v-else-if="!files.length" class="info-state">当前会话暂无文件</p>
        <div v-else class="info-list">
          <div v-for="file in files" :key="file.identity" class="info-row file-row">
            <span class="file-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 2v5h5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
            </span>
            <span class="info-row-main">
              <strong :title="file.filename">{{ file.filename }}</strong>
              <small v-if="fileMeta(file)">{{ fileMeta(file) }}</small>
            </span>
          </div>
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
defineEmits<{ toggle: [] }>()

function sizeLabel(value: unknown): string {
  const size = Number(value || 0)
  if (!Number.isFinite(size) || size <= 0) return ''
  if (size < 1024) return `${Math.round(size)} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function fileMeta(file: RecentSessionFile): string {
  return [
    String(file.mime || '').trim(),
    sizeLabel(file.size),
    String(file.status || '').trim(),
    file.last_seen_at ? formatKnowledgeChangeTime(file.last_seen_at) : '',
  ].filter(Boolean).join(' · ')
}
</script>

<style scoped lang="scss">
.conversation-info-rail {
  flex: 0 0 320px;
  width: 320px;
  min-width: 0;
  height: 100%;
  border-left: 1px solid rgba(15, 15, 15, .07);
  background: #fafaf9;
  overflow: hidden;
  transition: width 220ms ease, flex-basis 220ms ease;
}

.conversation-info-rail.collapsed {
  flex-basis: 44px;
  width: 44px;
}

.info-rail-head {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 8px;
  box-sizing: border-box;
}

.info-rail-toggle {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(15, 15, 15, .5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.info-rail-toggle:hover {
  background: rgba(15, 15, 15, .06);
  color: rgba(15, 15, 15, .82);
}

.info-rail-toggle svg { width: 17px; height: 17px; }
.info-rail-content { height: calc(100% - 48px); overflow-y: auto; padding: 0 12px 18px; box-sizing: border-box; }
.info-section { padding: 14px 0 18px; border-top: 1px solid rgba(15, 15, 15, .065); }
.info-section:first-child { border-top: 0; padding-top: 6px; }
.info-section > header { min-height: 28px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.info-section h2 { margin: 0; color: rgba(15, 15, 15, .84); font-size: 13px; font-weight: 650; }
.view-all { color: rgba(15, 15, 15, .35); font-size: 11px; cursor: default; user-select: none; }
.info-list { display: grid; gap: 2px; margin-top: 5px; }
.info-row { min-width: 0; display: grid; align-items: center; gap: 9px; padding: 8px 7px; border-radius: 9px; color: rgba(15, 15, 15, .76); }
.knowledge-row { grid-template-columns: 7px minmax(0, 1fr); }
.file-row { grid-template-columns: 24px minmax(0, 1fr); }
.change-dot { width: 6px; height: 6px; border-radius: 50%; background: #888; }
.change-dot.is-ingest { background: #5a956a; }
.change-dot.is-delete { background: #b55a5a; }
.change-dot.is-modify { background: #657d91; }
.file-icon { width: 24px; height: 24px; border-radius: 7px; background: rgba(15, 15, 15, .055); color: rgba(15, 15, 15, .5); display: inline-flex; align-items: center; justify-content: center; }
.info-row-main { min-width: 0; display: block; }
.info-row strong, .info-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.info-row strong { color: rgba(15, 15, 15, .78); font-size: 12px; font-weight: 600; }
.info-row small { margin-top: 3px; color: rgba(15, 15, 15, .4); font-size: 10px; }
.info-state { margin: 10px 7px 0; color: rgba(15, 15, 15, .38); font-size: 11px; line-height: 1.55; }
.info-state.error { color: #a34c4c; }

@media (max-width: 1180px) {
  .conversation-info-rail { flex-basis: 300px; width: 300px; }
  .conversation-info-rail.collapsed { flex-basis: 44px; width: 44px; }
}
</style>
