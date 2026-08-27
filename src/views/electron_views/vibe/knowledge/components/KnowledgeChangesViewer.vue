<template>
  <section
    class="knowledge-changes-viewer"
    :data-project-id="projectId || undefined"
    :aria-busy="loading || loadingMore"
    aria-label="知识变更列表"
  >
    <header class="viewer-header">
      <div>
        <h2>知识变更列表</h2>
        <p>按提交查看当前项目的知识变更</p>
      </div>
      <span class="viewer-count" aria-live="polite">{{ items.length }} 条</span>
    </header>

    <div
      ref="listEl"
      class="change-list"
      role="list"
      @scroll.passive="handleScroll"
    >
      <p v-if="loading && !items.length" class="viewer-state" aria-live="polite">
        正在读取知识变更…
      </p>

      <template v-else>
        <button
          v-for="item in items"
          :id="`knowledge-change-${item.seq}`"
          :key="knowledgeChangeSummaryIdentity(item) || `change-${item.seq}`"
          class="change-row"
          type="button"
          role="listitem"
          :title="knowledgeChangeTitle(item)"
          @click="emit('open-change', item)"
        >
          <span class="change-main">
            <strong>{{ knowledgeChangeTitle(item) }}</strong>
            <small>{{ knowledgeChangeKindLabel(item.kind) }} · {{ item.actor_name || '未知用户' }} · {{ formatKnowledgeChangeTime(item.created_at) }}</small>
          </span>
          <em>#{{ item.seq }}</em>
        </button>

        <p v-if="loading && items.length" class="list-footer" aria-live="polite">正在刷新知识变更…</p>
        <div v-else-if="error" class="viewer-state error" role="alert">
          <span>{{ error }}</span>
          <button type="button" @click.stop="emit('retry')">重试</button>
        </div>
        <p v-else-if="loadingMore" class="list-footer" aria-live="polite">继续读取…</p>
        <p v-else-if="!items.length" class="viewer-state empty-state">
          <strong>暂无知识变更</strong>
          <span>确认录入后会形成第一笔提交。</span>
        </p>
        <p v-else-if="!hasMore" class="list-footer">已加载全部变更，没有更多内容</p>
        <p v-else class="list-footer hint">向下滚动加载更多</p>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { KnowledgeCommitSummary } from '../../api'
import {
  formatKnowledgeChangeTime,
  knowledgeChangeKindLabel,
  knowledgeChangeTitle,
} from '../../browser/knowledgeChangePresentation'
import { knowledgeChangeSummaryIdentity } from '../workspaceViewerPolicy'

const props = defineProps<{
  projectId: string
  items: KnowledgeCommitSummary[]
  loading: boolean
  loadingMore: boolean
  error: string
  hasMore: boolean
}>()

const emit = defineEmits<{
  'open-change': [item: KnowledgeCommitSummary]
  'load-more': []
  retry: []
}>()

const listEl = ref<HTMLElement | null>(null)
// The parent normally flips loadingMore synchronously. This local latch also
// protects against multiple scroll events in the same frame before Vue has
// propagated that prop update.
let loadMoreQueued = false

watch(
  () => [props.projectId, props.items.length, props.loadingMore, props.hasMore, props.error] as const,
  ([projectId, itemCount, loadingMore, hasMore, error], previous) => {
    if (!previous
      || projectId !== previous[0]
      || itemCount !== previous[1]
      || !loadingMore
      || !hasMore
      || Boolean(error)) {
      loadMoreQueued = false
    }
  },
)

function requestMore(): void {
  if (
    loadMoreQueued
    || props.loading
    || props.loadingMore
    || Boolean(props.error)
    || !props.hasMore
  ) return
  loadMoreQueued = true
  emit('load-more')
}

function handleScroll(event: Event): void {
  const element = event.currentTarget as HTMLElement | null
  if (!element) return
  const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight
  if (distanceToBottom > 96) return
  requestMore()
}

defineExpose({ listEl, handleScroll, requestMore })
</script>

<style scoped lang="scss">
.knowledge-changes-viewer,
.knowledge-changes-viewer * { box-sizing: border-box; }
.knowledge-changes-viewer {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  background: #fff;
  color: rgba(15, 15, 15, .88);
}
.viewer-header {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(15, 15, 15, .08);
}
.viewer-header h2,
.viewer-header p { margin: 0; }
.viewer-header h2 { color: rgba(15, 15, 15, .82); font-size: 14px; font-weight: 650; }
.viewer-header p { margin-top: 4px; color: rgba(15, 15, 15, .42); font-size: 11px; line-height: 1.45; }
.viewer-count { flex: 0 0 auto; color: rgba(15, 15, 15, .4); font-size: 11px; line-height: 20px; }
.change-list {
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 7px 10px 18px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
.change-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 58px;
  padding: 9px 8px;
  border: 0;
  border-bottom: 1px solid rgba(15, 15, 15, .055);
  border-radius: 6px;
  background: transparent;
  color: rgba(15, 15, 15, .78);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 140ms ease;
}
.change-row:hover { background: rgba(15, 15, 15, .045); }
.change-row:focus-visible,
.viewer-state button:focus-visible { outline: 2px solid rgba(15, 15, 15, .28); outline-offset: -2px; }
.change-main { min-width: 0; display: block; }
.change-main strong,
.change-main small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.change-main strong { color: rgba(15, 15, 15, .8); font-size: 13px; font-weight: 600; }
.change-main small { margin-top: 4px; color: rgba(15, 15, 15, .42); font-size: 11px; }
.change-row em { color: rgba(15, 15, 15, .4); font-size: 11px; font-style: normal; text-align: right; }
.viewer-state {
  display: grid;
  place-content: center;
  justify-items: center;
  min-height: 140px;
  padding: 24px 12px;
  color: rgba(15, 15, 15, .42);
  font-size: 12px;
  line-height: 1.55;
  text-align: center;
}
.viewer-state strong { color: rgba(15, 15, 15, .62); font-size: 13px; font-weight: 600; }
.viewer-state span { max-width: 360px; }
.viewer-state.error { color: #a34c4c; }
.viewer-state button {
  min-height: 30px;
  margin-top: 10px;
  padding: 0 12px;
  border: 1px solid rgba(163, 76, 76, .34);
  border-radius: 6px;
  background: #fff;
  color: #934141;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.list-footer { margin: 12px 0 0; color: rgba(15, 15, 15, .38); font-size: 11px; line-height: 1.5; text-align: center; }
.list-footer.hint { color: rgba(15, 15, 15, .3); }
@media (prefers-reduced-motion: reduce) {
  .change-row { transition: none; }
}
</style>
