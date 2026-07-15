<template>
  <div class="receipt-panel" @scroll.passive="loadMore">
    <div class="receipt-list">
      <article v-for="item in items" :key="item.id" :class="{ open: openSeq === item.seq }">
        <button type="button" @click="toggle(item.seq)">
          <span class="status"><i />已应用</span><div><strong>{{ item.reason || item.request_text || `提交 #${item.seq}` }}</strong><small>{{ kindLabel(item.kind) }} · {{ item.actor_name || '未知用户' }} · {{ formatTime(item.created_at) }}</small></div><em>#{{ item.seq }}</em>
          <svg :class="{ open: openSeq === item.seq }" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
        <div v-if="openSeq === item.seq" class="receipt-detail">
          <p>{{ detail?.request_text }}</p>
          <dl><div><dt>新增来源</dt><dd>{{ detail?.sources.length || 0 }}</dd></div><div><dt>删除事件</dt><dd>{{ detail?.tombstones.length || 0 }}</dd></div><div><dt>结构指令</dt><dd>{{ detail?.structure_directives.length || 0 }}</dd></div><div><dt>审计标识</dt><dd>{{ detail?.trace_id || '无' }}</dd></div></dl>
          <button class="view-change" type="button" @click="$emit('open-commit', item.seq)">查看完整变更</button>
        </div>
      </article>
      <p v-if="loading" class="state">继续读取回执…</p>
      <p v-else-if="!items.length" class="state">尚无回执。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getKnowledgeReceipt, getKnowledgeReceipts, type KnowledgeCommitDetail, type KnowledgeReceipt } from '../../api'

const props = defineProps<{ projectId: string }>()
defineEmits<{ 'open-commit': [seq: number] }>()
const items = ref<KnowledgeReceipt[]>([])
const cursor = ref<number | null>(null)
const openSeq = ref<number | null>(null)
const detail = ref<(KnowledgeCommitDetail & { receipt_id: string }) | null>(null)
const cache = new Map<number, KnowledgeCommitDetail & { receipt_id: string }>()
const loading = ref(false)

watch(() => props.projectId, () => reset(), { immediate: true })
async function reset() { items.value = []; cursor.value = null; openSeq.value = null; detail.value = null; cache.clear(); if (props.projectId) await fetchPage(true) }
async function fetchPage(resetList: boolean) {
  if (!props.projectId || loading.value || (!resetList && cursor.value === null)) return
  loading.value = true
  try { const page = await getKnowledgeReceipts(props.projectId, { limit: 40, before: resetList ? undefined : cursor.value || undefined }); items.value = resetList ? page.items : [...items.value, ...page.items]; cursor.value = page.next_cursor ?? null } finally { loading.value = false }
}
async function toggle(seq: number) {
  if (openSeq.value === seq) { openSeq.value = null; detail.value = null; return }
  openSeq.value = seq
  if (!cache.has(seq)) cache.set(seq, (await getKnowledgeReceipt(props.projectId, seq)).receipt)
  detail.value = cache.get(seq) || null
}
async function loadMore(event: Event) { const el = event.currentTarget as HTMLElement; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) await fetchPage(false) }
function kindLabel(value: string) { return ({ ingest: '录入', modify: '修改', delete: '删除', structure: '结构', rebuild: '重建' } as Record<string,string>)[value] || value }
function formatTime(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
</script>

<style scoped lang="scss">
.receipt-panel { height: 100%; overflow-y: auto; } .receipt-list { width: min(900px, calc(100% - 36px)); margin: 0 auto; padding: 22px 0 60px; }
article { border-bottom: 1px solid #e7e7e7; } article > button { display: grid; grid-template-columns: 66px minmax(0,1fr) 42px 18px; align-items: center; gap: 14px; width: 100%; padding: 16px 8px; border: 0; background: transparent; color: #292929; text-align: left; cursor: pointer; }
article > button:hover { background: #f6f6f6; } article.open { background: #fafafa; }
.status { color: #477854; font-size: 11px; } .status i { display: inline-block; width: 6px; height: 6px; margin-right: 5px; border-radius: 50%; background: #4e9562; }
strong, small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } strong { font-size: 13px; } small, em { margin-top: 3px; color: #959595; font-size: 10px; font-style: normal; }
svg { transition: transform .15s ease; } svg.open { transform: rotate(180deg); }
.receipt-detail { padding: 4px 8px 18px 88px; } .receipt-detail p { margin: 0 0 14px; white-space: pre-wrap; color: #555; font-size: 12px; line-height: 1.6; }
dl { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); margin: 0; padding: 12px 0; border-block: 1px solid #e5e5e5; } dl div { padding: 0 12px; border-left: 1px solid #e5e5e5; } dl div:first-child { border-left: 0; padding-left: 0; } dt { color: #999; font-size: 10px; } dd { margin: 3px 0 0; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.view-change { margin-top: 13px; padding: 7px 11px; border: 0; border-radius: 5px; background: #e8e8e8; color: #333; font-size: 11px; cursor: pointer; } .view-change:hover { background: #ddd; }
.state { padding: 24px; color: #999; font-size: 12px; text-align: center; }
@media (max-width: 660px) { article > button { grid-template-columns: 58px minmax(0,1fr) 34px 16px; gap: 8px; } .receipt-detail { padding-left: 8px; } dl { grid-template-columns: 1fr 1fr; gap: 12px 0; } }
</style>
