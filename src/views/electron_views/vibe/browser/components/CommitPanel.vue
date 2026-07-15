<template>
  <div class="commit-panel">
    <aside>
      <div class="filter">
        <div><strong>提交流水</strong><span>不可变记录</span></div>
        <AppSelect :model-value="kind" :options="kindOptions" placeholder="全部" @change="changeKind">
          <template #trigger="{ open, label, placeholder }"><span class="select-trigger">{{ label || placeholder }}<svg :class="{ open }" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span></template>
        </AppSelect>
      </div>
      <div class="commit-list" @scroll.passive="loadMore">
        <button v-for="item in items" :id="`commit-${item.seq}`" :key="item.id" type="button" :class="{ active: detail?.seq === item.seq }" @click="open(item.seq)">
          <span class="dot" :class="`is-${item.kind}`" /><div><strong>{{ item.reason || item.request_text || `提交 #${item.seq}` }}</strong><small>{{ kindLabel(item.kind) }} · {{ item.actor_name || '未知用户' }} · {{ formatTime(item.created_at) }}</small></div><em>#{{ item.seq }}</em>
        </button>
        <p v-if="loading" class="state">继续读取…</p>
      </div>
    </aside>

    <main>
      <div v-if="detail" class="detail">
        <header><div><span>{{ kindLabel(detail.kind) }} · 提交 #{{ detail.seq }}</span><h2>{{ detail.reason || detail.request_text }}</h2></div><time>{{ formatFullTime(detail.created_at) }}</time></header>
        <dl><div><dt>发起用户</dt><dd>{{ detail.actor_name || '未知用户' }}</dd></div><div><dt>审计标识</dt><dd>{{ detail.trace_id || '无' }}</dd></div><div><dt>会话</dt><dd>{{ detail.session_id || '无' }}</dd></div><div><dt>基线</dt><dd>提交 #{{ detail.base_commit_seq }}</dd></div></dl>
        <section v-if="detail.sources.length" class="change-group additions"><h3>新增来源 <span>{{ detail.sources.length }}</span></h3><button v-for="item in detail.sources" :key="item.id" type="button" @click="$emit('open-source', item.id)"><strong>+ {{ item.display_name || item.filename }}</strong><small>{{ item.mime_type }} · {{ item.chars }} 字符 · {{ item.content_hash.slice(0, 12) }}</small></button></section>
        <section v-if="detail.tombstones.length" class="change-group removals"><h3>删除事件 <span>{{ detail.tombstones.length }}</span></h3><div v-for="item in detail.tombstones" :key="item.id"><strong>- {{ item.object_key || item.target_id || '知识对象' }}</strong><small>{{ item.reason || '用户确认删除' }} · {{ item.scope_key || 'global' }}</small></div></section>
        <section v-if="detail.structure_directives.length" class="change-group structures"><h3>结构指令 <span>{{ detail.structure_directives.length }}</span></h3><div v-for="item in detail.structure_directives" :key="item.id"><strong>→ {{ item.target_path.join(' / ') }}</strong><small>{{ item.reason || item.object_key || '调整导航位置' }}</small></div></section>
        <section class="request"><h3>原始请求</h3><p>{{ detail.request_text || '无' }}</p></section>
      </div>
      <div v-else class="empty"><strong>选择一条提交</strong><span>这里会完整展示本次来源、删除事件和结构指令。</span></div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AppSelect from '@/components/common/select/AppSelect.vue'
import { getKnowledgeCommit, getKnowledgeCommits, type KnowledgeCommitDetail, type KnowledgeCommitSummary } from '../../api'

const props = defineProps<{ projectId: string; requestedSeq?: number }>()
defineEmits<{ 'open-source': [id: string] }>()
const items = ref<KnowledgeCommitSummary[]>([])
const detail = ref<KnowledgeCommitDetail | null>(null)
const cursor = ref<number | null>(null)
const kind = ref('')
const loading = ref(false)
const kindOptions = [{ value: '', label: '全部动作' }, { value: 'ingest', label: '录入' }, { value: 'modify', label: '修改' }, { value: 'delete', label: '删除' }, { value: 'structure', label: '结构' }, { value: 'rebuild', label: '重建' }]

watch(() => props.projectId, () => reset(), { immediate: true })
watch(() => props.requestedSeq, async (seq) => { if (seq) await reveal(seq) })

async function reset() { items.value = []; detail.value = null; cursor.value = null; if (props.projectId) await fetchPage(true) }
async function fetchPage(resetList: boolean) {
  if (!props.projectId || loading.value || (!resetList && cursor.value === null)) return
  loading.value = true
  try {
    const page = await getKnowledgeCommits(props.projectId, { kind: kind.value, limit: 50, before: resetList ? undefined : cursor.value || undefined })
    items.value = resetList ? page.items : [...items.value, ...page.items]
    cursor.value = page.next_cursor ?? null
    if (resetList && items.value[0]) await open(items.value[0].seq)
  } finally { loading.value = false }
}
async function open(seq: number) { detail.value = (await getKnowledgeCommit(props.projectId, seq)).commit }
async function reveal(seq: number) {
  if (!items.value.some(item => item.seq === seq)) { const item = (await getKnowledgeCommit(props.projectId, seq)).commit; items.value = [item, ...items.value] }
  await open(seq); await nextTick(); document.getElementById(`commit-${seq}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
async function changeKind(value: string | number) { kind.value = String(value); await reset() }
async function loadMore(event: Event) { const el = event.currentTarget as HTMLElement; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) await fetchPage(false) }
function kindLabel(value: string) { return ({ ingest: '录入', modify: '修改', delete: '删除', structure: '结构', rebuild: '重建' } as Record<string, string>)[value] || value }
function formatTime(value: string) { return new Date(value).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) }
function formatFullTime(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
</script>

<style scoped lang="scss">
.commit-panel { display: grid; grid-template-columns: 330px minmax(0, 1fr); height: 100%; min-height: 0; overflow: hidden; }
aside { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; border-right: 1px solid #ddd; background: #fafafa; }
.filter { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px; border-bottom: 1px solid #e4e4e4; } .filter strong, .filter span { display: block; } .filter strong { font-size: 13px; } .filter > div > span { color: #999; font-size: 10px; }
.select-trigger { display: flex; align-items: center; gap: 5px; min-width: 92px; padding: 7px 8px; border-radius: 5px; background: #eee; font-size: 11px; } .select-trigger svg { margin-left: auto; transition: transform .15s; } .select-trigger svg.open { transform: rotate(180deg); }
.commit-list { min-height: 0; overflow-y: auto; padding: 7px; }
.commit-list button { display: grid; grid-template-columns: 8px minmax(0,1fr) auto; align-items: center; gap: 9px; width: 100%; padding: 10px 8px; border: 0; border-radius: 5px; background: transparent; color: #333; text-align: left; cursor: pointer; }
.commit-list button:hover { background: #eee; } .commit-list button.active { background: #dedede; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #888; } .dot.is-ingest { background: #5a956a; } .dot.is-delete { background: #b55a5a; } .dot.is-modify { background: #657d91; }
.commit-list strong, .commit-list small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .commit-list strong { font-size: 12px; } .commit-list small, em { margin-top: 3px; color: #929292; font-size: 10px; font-style: normal; }
main { min-width: 0; min-height: 0; overflow-y: auto; } .detail { width: min(940px, calc(100% - 48px)); margin: 0 auto; padding: 30px 0 70px; }
.detail > header { display: flex; align-items: start; justify-content: space-between; gap: 24px; padding-bottom: 20px; border-bottom: 1px solid #ddd; } header span { color: #777; font-size: 12px; } h2 { margin: 7px 0 0; font-size: 22px; } time { color: #999; font-size: 11px; white-space: nowrap; }
dl { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); margin: 18px 0 26px; } dl div { padding: 0 13px; border-left: 1px solid #e5e5e5; } dl div:first-child { padding-left: 0; border-left: 0; } dt { color: #999; font-size: 10px; } dd { margin: 4px 0 0; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.change-group { margin-top: 20px; } h3 { margin: 0 0 8px; font-size: 13px; } h3 span { color: #999; font-weight: 400; }
.change-group button, .change-group > div { display: block; width: 100%; padding: 11px 13px; border: 0; border-bottom: 1px solid rgba(0,0,0,.06); background: transparent; text-align: left; } .change-group button { cursor: pointer; } .change-group button:hover { filter: brightness(.98); }
.change-group strong, .change-group small { display: block; } .change-group strong { font-size: 12px; } .change-group small { margin-top: 3px; color: #777; font-size: 10px; }
.additions button { background: #edf7ef; color: #28663a; } .removals > div { background: #fbecec; color: #8c3535; } .structures > div { background: #f0f2f4; color: #475764; }
.request { margin-top: 28px; padding-top: 18px; border-top: 1px solid #e5e5e5; } .request p { margin: 0; white-space: pre-wrap; color: #555; font-size: 13px; line-height: 1.7; }
.state { color: #999; font-size: 11px; text-align: center; } .empty { display: grid; place-content: center; height: 100%; color: #999; text-align: center; } .empty strong { color: #555; } .empty span { margin-top: 6px; font-size: 12px; }
@media (max-width: 760px) { .commit-panel { grid-template-columns: 1fr; grid-template-rows: 220px minmax(0,1fr); } aside { border-right: 0; border-bottom: 1px solid #ddd; } .detail { width: calc(100% - 30px); padding-top: 20px; } dl { grid-template-columns: 1fr 1fr; gap: 14px 0; } }
</style>
