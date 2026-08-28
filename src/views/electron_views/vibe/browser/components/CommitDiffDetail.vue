<template>
  <section class="detail-pane" aria-label="提交差异">
    <div v-if="detail" class="detail">
      <header class="detail-header">
        <div>
          <span>{{ knowledgeChangeKindLabel(detail.kind) }} · 提交 #{{ detail.seq }}</span>
          <h2>{{ knowledgeChangeTitle(detail) }}</h2>
        </div>
        <time>{{ formatKnowledgeChangeTime(detail.created_at, true) }}</time>
      </header>

      <div class="summary-bar" aria-label="正文变更统计">
        <div><strong>{{ documentChanges.length }}</strong><span>个文档</span></div>
        <div class="add"><strong>+{{ totalAdditions }}</strong><span>新增行</span></div>
        <div class="delete"><strong>-{{ totalDeletions }}</strong><span>删除行</span></div>
        <div><strong>{{ detail.actor_name || '未知用户' }}</strong><span>发起用户</span></div>
      </div>

      <section
        v-for="change in documentChanges"
        :id="changeDomId(change.id)"
        :key="change.id"
        class="diff-file"
      >
        <button
          class="file-header"
          type="button"
          :aria-expanded="isExpanded(change.id)"
          :aria-controls="diffDomId(change.id)"
          @click="toggleChange(change.id)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" :class="{ expanded: isExpanded(change.id) }">
            <path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="change-badge" :class="`is-${change.change_type}`">{{ changeTypeBadgeLabel(change.change_type) }}</span>
          <div>
            <strong>{{ displayPath(change) }}</strong>
            <small>{{ changeTypeLabel(change.change_type) }} · {{ generationLabel(change) }}</small>
          </div>
          <span class="stats"><b>+{{ change.additions }}</b><i>-{{ change.deletions }}</i></span>
        </button>
        <div v-if="isExpanded(change.id)" :id="diffDomId(change.id)" class="diff-scroll" tabindex="0">
          <template v-for="(hunk, hunkIndex) in change.hunks" :key="`${change.id}-${hunkIndex}`">
            <div class="hunk-header">{{ hunk.header }}</div>
            <div
              v-for="(line, lineIndex) in hunk.lines"
              :key="`${change.id}-${hunkIndex}-${lineIndex}`"
              class="diff-line"
              :class="`is-${line.kind}`"
            >
              <span class="line-number">{{ line.old_line ?? '' }}</span>
              <span class="line-number">{{ line.new_line ?? '' }}</span>
              <span class="prefix" aria-hidden="true">{{ linePrefix(line.kind) }}</span>
              <code>{{ line.text || ' ' }}</code>
            </div>
          </template>
          <p v-if="!change.hunks.length" class="no-lines">文件内容没有可显示的逐行差异。</p>
        </div>
      </section>

      <div v-if="!documentChanges.length" class="no-content-change">
        <strong>本次没有正文变化</strong>
        <span>这笔提交只包含结构、审计或维护信息。</span>
      </div>

      <section v-if="detail.tombstones.length" class="tombstone-changes">
        <h3>删除事件 <span>{{ detail.tombstones.length }}</span></h3>
        <div v-for="item in detail.tombstones" :key="item.id">
          <strong>- {{ item.object_key || item.target_id || '知识对象' }}</strong>
          <small>{{ item.reason || '用户确认删除' }} · {{ item.scope_key || 'global' }}</small>
        </div>
      </section>

      <section v-if="detail.structure_directives.length" class="structure-changes">
        <h3>结构调整 <span>{{ detail.structure_directives.length }}</span></h3>
        <div v-for="item in detail.structure_directives" :key="item.id">
          <strong>{{ item.target_path.join(' / ') || '导航位置' }}</strong>
          <small>{{ item.reason || item.object_key || '调整导航位置' }}</small>
        </div>
      </section>

      <details class="audit-details">
        <summary>提交信息与来源审计</summary>
        <dl>
          <div><dt>审计标识</dt><dd>{{ detail.trace_id || '无' }}</dd></div>
          <div><dt>会话</dt><dd>{{ detail.session_id || '无' }}</dd></div>
          <div><dt>基线</dt><dd>提交 #{{ detail.base_commit_seq }}</dd></div>
          <div><dt>确认标识</dt><dd>{{ detail.confirmation_id || '无' }}</dd></div>
        </dl>
        <div v-if="detail.sources.length" class="audit-sources">
          <h3>来源记录 <span>{{ detail.sources.length }}</span></h3>
          <button
            v-for="item in detail.sources"
            :key="item.id"
            type="button"
            :disabled="!detail.session_id"
            :title="detail.session_id ? `在 Viewer 中打开 ${item.display_name || item.filename}` : '该变更缺少所属会话，无法安全读取来源'"
            :aria-label="detail.session_id ? `打开来源：${item.display_name || item.filename}` : `${item.display_name || item.filename} 暂不可打开`"
            @click="emit('open-source', item.id)"
          >
            <strong>{{ item.display_name || item.filename }}</strong>
            <small>{{ item.display_kind }} · {{ item.mime_type }} · {{ item.content_hash.slice(0, 12) }}</small>
          </button>
        </div>
        <div class="request"><h3>原始请求</h3><p>{{ detail.request_text || '无' }}</p></div>
      </details>
    </div>
    <div v-else-if="loading" class="empty" aria-live="polite">正在生成逐行差异…</div>
    <div v-else-if="error" class="empty error" role="alert">
      <strong>提交详情读取失败</strong>
      <span>{{ error }}</span>
      <button type="button" @click="emit('retry')">重试</button>
    </div>
    <div v-else class="empty"><strong>选择一条提交</strong><span>这里会按文档展示真实的 + / - 正文变化。</span></div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { KnowledgeCommitDetail, KnowledgeDocumentChange } from '../../api'
import { formatKnowledgeChangeTime, knowledgeChangeKindLabel, knowledgeChangeTitle } from '../knowledgeChangePresentation'

const props = withDefaults(defineProps<{
  detail: KnowledgeCommitDetail | null
  loading?: boolean
  error?: string
  viewerId?: string
}>(), {
  loading: false,
  error: '',
  viewerId: 'commit-diff',
})

const emit = defineEmits<{
  'open-source': [id: string]
  retry: []
}>()

const expandedChangeIds = ref<Set<string>>(new Set())
const documentChanges = computed(() => props.detail?.document_changes || [])
const totalAdditions = computed(() => documentChanges.value.reduce((total, item) => total + item.additions, 0))
const totalDeletions = computed(() => documentChanges.value.reduce((total, item) => total + item.deletions, 0))
const viewerIdPrefix = computed(() => {
  const value = String(props.viewerId || 'commit-diff').trim().replace(/[^a-zA-Z0-9_-]+/g, '-')
  return value || 'commit-diff'
})

watch(
  () => props.detail,
  (detail) => {
    const changes = detail?.document_changes || []
    const expanded = changes.length && changes.reduce((total, item) => total + item.additions + item.deletions, 0) <= 240
      ? changes.map(item => item.id)
      : changes.slice(0, 1).map(item => item.id)
    expandedChangeIds.value = new Set(expanded)
  },
  { immediate: true },
)

function toggleChange(id: string) {
  const next = new Set(expandedChangeIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedChangeIds.value = next
}

function isExpanded(id: string) {
  return expandedChangeIds.value.has(id)
}

function changeDomId(id: string) {
  return `${viewerIdPrefix.value}-change-${id}`
}

function diffDomId(id: string) {
  return `${viewerIdPrefix.value}-diff-${id}`
}

function displayPath(change: KnowledgeDocumentChange) {
  const path = change.new_path !== '/dev/null' ? change.new_path : change.old_path
  const duplicateCount = documentChanges.value.filter(item => {
    const itemPath = item.new_path !== '/dev/null' ? item.new_path : item.old_path
    return itemPath === path
  }).length
  return duplicateCount > 1 ? `${path} · ${change.document_id.slice(0, 8)}` : path
}

function generationLabel(change: KnowledgeDocumentChange) {
  const oldGeneration = change.old_generation_id ? change.old_generation_id.slice(0, 10) : '无'
  const newGeneration = change.new_generation_id ? change.new_generation_id.slice(0, 10) : '无'
  return `${oldGeneration} → ${newGeneration}`
}

function changeTypeBadgeLabel(value: KnowledgeDocumentChange['change_type']) {
  return ({ added: '录入', modified: '修改', deleted: '删除' } as const)[value]
}

function changeTypeLabel(value: KnowledgeDocumentChange['change_type']) {
  return ({ added: '新增文档', modified: '修改文档', deleted: '删除文档' } as const)[value]
}

function linePrefix(value: 'context' | 'add' | 'delete') {
  return value === 'add' ? '+' : value === 'delete' ? '-' : ' '
}
</script>

<style scoped lang="scss">
.detail-pane { min-width: 0; min-height: 0; height: 100%; overflow-y: auto; box-sizing: border-box; scroll-behavior: smooth; }
.detail { width: min(1120px, calc(100% - 42px)); margin: 0 auto; padding: 28px 0 70px; }
.detail-header { display: flex; align-items: start; justify-content: space-between; gap: 24px; padding-bottom: 18px; border-bottom: 1px solid #d8dde3; }
.detail-header span { color: #667085; font-size: 12px; }
h2 { margin: 7px 0 0; color: #20242b; font-size: 22px; line-height: 1.35; }
time { color: #667085; font-size: 12px; white-space: nowrap; }
.summary-bar { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 16px 0 20px; border: 1px solid #dfe3e7; border-radius: 7px; overflow: hidden; }
.summary-bar > div { padding: 11px 13px; border-left: 1px solid #e6e9ec; }
.summary-bar strong,
.summary-bar span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.summary-bar strong { font-size: 13px; }
.summary-bar span { margin-top: 3px; color: #667085; font-size: 11px; }
.summary-bar .add strong { color: #23733c; }
.summary-bar .delete strong { color: #a13f3f; }
.change-badge { display: inline-grid; width: max-content; min-width: 38px; height: 22px; place-items: center; border-radius: 4px; padding: 0 7px; background: #e8edf2; color: #506579; font-size: 11px; font-weight: 700; }
.change-badge.is-added { background: #e3f3e7; color: #286b3b; }
.change-badge.is-deleted { background: #f9e4e4; color: #973d3d; }
.stats { display: flex; gap: 7px; font-size: 11px; }
.stats b { color: #2d7a43; }
.stats i { color: #a14242; font-style: normal; }
.diff-file { margin-top: 12px; border: 1px solid #d7dce1; border-radius: 7px; overflow: hidden; scroll-margin-top: 12px; }
.file-header { display: grid; grid-template-columns: 18px max-content minmax(0, 1fr) auto; align-items: center; gap: 8px; width: 100%; min-height: 48px; padding: 7px 11px; border: 0; background: #f4f6f8; color: #29313b; text-align: left; cursor: pointer; }
.file-header:hover { background: #eceff2; }
.file-header:focus-visible { outline: 2px solid #475569; outline-offset: -2px; }
.file-header > svg { transition: transform .16s ease; }
.file-header > svg.expanded { transform: rotate(90deg); }
.file-header > div { min-width: 0; }
.file-header strong,
.file-header small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-header strong { font-size: 12px; }
.file-header small { margin-top: 3px; color: #667085; font-size: 10px; }
.diff-scroll { display: grid; grid-template-columns: minmax(max-content, 1fr); max-height: 620px; overflow: auto; border-top: 1px solid #d7dce1; background: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.diff-scroll:focus-visible { outline: 2px solid #475569; outline-offset: -2px; }
.hunk-header { min-width: max-content; padding: 7px 13px; background: #edf4fb; color: #42617d; font-size: 12px; white-space: pre; }
.diff-line { display: grid; grid-template-columns: 52px 52px 24px minmax(max-content, 1fr); min-width: max-content; min-height: 22px; color: #30343a; font-size: 12px; line-height: 22px; }
.diff-line.is-add { background: #eaf7ed; }
.diff-line.is-delete { background: #fcebec; }
.line-number { position: sticky; left: 0; border-right: 1px solid rgba(0, 0, 0, .06); padding: 0 8px; background: inherit; color: #7b8490; text-align: right; user-select: none; }
.line-number + .line-number { left: 52px; }
.prefix { padding-left: 8px; color: #667085; user-select: none; }
.diff-line.is-add .prefix { color: #20723a; }
.diff-line.is-delete .prefix { color: #9d3535; }
.diff-line code { padding-right: 18px; color: inherit; font: inherit; white-space: pre; }
.no-lines { margin: 0; padding: 18px; color: #667085; font-family: Inter, "PingFang SC", sans-serif; font-size: 12px; text-align: center; }
.no-content-change { display: grid; place-content: center; min-height: 150px; margin-top: 16px; border: 1px dashed #cfd4da; border-radius: 7px; color: #667085; text-align: center; }
.no-content-change strong { color: #344054; }
.no-content-change span { margin-top: 5px; font-size: 12px; }
.tombstone-changes,
.structure-changes { margin-top: 22px; }
h3 { margin: 0 0 8px; font-size: 13px; }
h3 span { color: #667085; font-weight: 400; }
.tombstone-changes > div,
.structure-changes > div { padding: 10px 12px; border-bottom: 1px solid #e5e8eb; background: #f1f3f5; }
.tombstone-changes > div { background: #fbecec; color: #8c3535; }
.tombstone-changes strong,
.tombstone-changes small,
.structure-changes strong,
.structure-changes small { display: block; }
.tombstone-changes small,
.structure-changes small { margin-top: 3px; color: #667085; font-size: 11px; }
.tombstone-changes small { color: #9a5151; }
.audit-details { margin-top: 28px; border-top: 1px solid #dfe3e7; padding-top: 14px; }
.audit-details summary { width: max-content; color: #475467; font-size: 12px; font-weight: 600; cursor: pointer; }
dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 18px 0 22px; }
dl div { padding: 0 13px; border-left: 1px solid #e5e8eb; }
dl div:first-child { padding-left: 0; border-left: 0; }
dt { color: #667085; font-size: 10px; }
dd { margin: 4px 0 0; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.audit-sources button { display: block; width: 100%; min-height: 44px; padding: 8px 10px; border: 0; border-bottom: 1px solid #e8ebee; background: #f7f8f9; text-align: left; cursor: pointer; }
.audit-sources button:not(:disabled):hover { background: #eff2f4; }
.audit-sources button:disabled { cursor: default; opacity: .55; }
.audit-sources strong,
.audit-sources small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.audit-sources strong { font-size: 12px; }
.audit-sources small { margin-top: 3px; color: #667085; font-size: 10px; }
.request { margin-top: 22px; }
.request p { margin: 0; white-space: pre-wrap; color: #475467; font-size: 13px; line-height: 1.7; }
.empty { display: grid; place-content: center; height: 100%; color: #667085; text-align: center; }
.empty strong { color: #344054; }
.empty span { margin-top: 6px; font-size: 12px; }
.empty.error { color: #9f3838; }
.empty button {
  width: max-content;
  min-height: 32px;
  margin: 12px auto 0;
  padding: 0 12px;
  border: 1px solid #cfd4da;
  border-radius: 7px;
  background: #fff;
  color: #5c6675;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.empty button:hover { background: #f4f6f8; color: #303846; }
.empty button:focus-visible { outline: 2px solid #667085; outline-offset: 2px; }
@media (max-width: 760px) {
  .detail { width: calc(100% - 24px); padding-top: 18px; }
  .detail-header { display: block; }
  .detail-header time { display: block; margin-top: 8px; }
  .summary-bar { grid-template-columns: 1fr 1fr; }
  .summary-bar > div:nth-child(3) { border-left: 0; border-top: 1px solid #e6e9ec; }
  .summary-bar > div:nth-child(4) { border-top: 1px solid #e6e9ec; }
  dl { grid-template-columns: 1fr 1fr; gap: 14px 0; }
}
@media (prefers-reduced-motion: reduce) {
  .detail-pane { scroll-behavior: auto; }
  .file-header > svg { transition: none; }
}
</style>
