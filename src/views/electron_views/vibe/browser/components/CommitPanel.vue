<template>
  <div class="commit-panel">
    <aside>
      <div class="filter">
        <div><strong>变更历史</strong><span>按提交查看正文差异</span></div>
        <AppSelect class="action-filter" :model-value="kind" :options="kindOptions" placeholder="全部动作" @change="changeKind" />
      </div>
      <div class="commit-list" :aria-busy="listLoading" @scroll.passive="loadMore">
        <button
          v-for="item in items"
          :id="`commit-${item.seq}`"
          :key="item.id"
          type="button"
          :class="{ active: detail?.seq === item.seq }"
          :aria-current="detail?.seq === item.seq ? 'true' : undefined"
          @click="open(item.seq)"
        >
          <span class="dot" :class="`is-${item.kind}`" />
          <div>
            <strong>{{ knowledgeChangeTitle(item) }}</strong>
            <small>{{ knowledgeChangeKindLabel(item.kind) }} · {{ item.actor_name || '未知用户' }} · {{ formatKnowledgeChangeTime(item.created_at) }}</small>
          </div>
          <em>#{{ item.seq }}</em>
        </button>
        <p v-if="listLoading" class="state" aria-live="polite">继续读取…</p>
        <div v-else-if="listError" class="side-state error" role="alert">
          <span>{{ listError }}</span>
          <button type="button" @click="fetchPage(true)">重试</button>
        </div>
        <div v-else-if="!items.length" class="side-state">
          <strong>尚无变更</strong>
          <span>确认录入后会形成第一笔提交。</span>
        </div>
      </div>
    </aside>

    <CommitDiffDetail
      :detail="detail"
      :loading="detailLoading"
      :error="detailError"
      :viewer-id="`browser-commit-${props.projectId}`"
      @open-source="emit('open-source', $event)"
      @retry="retryDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import AppSelect from '@/components/common/select/AppSelect.vue'
import CommitDiffDetail from './CommitDiffDetail.vue'
import {
  getKnowledgeCommit,
  getKnowledgeCommits,
  type KnowledgeCommitDetail,
  type KnowledgeCommitSummary,
} from '../../api'
import { formatKnowledgeChangeTime, knowledgeChangeKindLabel, knowledgeChangeTitle } from '../knowledgeChangePresentation'

const props = defineProps<{ projectId: string; requestedSeq?: number; revision?: number }>()
const emit = defineEmits<{
  'open-source': [id: string]
  'select-commit': [seq: number]
}>()

const items = ref<KnowledgeCommitSummary[]>([])
const detail = shallowRef<KnowledgeCommitDetail | null>(null)
const cursor = ref<number | null>(null)
const kind = ref('')
const listLoading = ref(false)
const detailLoading = ref(false)
const listError = ref('')
const detailError = ref('')
let listRequestEpoch = 0
let detailRequestEpoch = 0
let lastDetailSeq = 0

const kindOptions = [
  { value: '', label: '全部动作' },
  { value: 'ingest', label: '录入' },
  { value: 'modify', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'structure', label: '结构' },
  { value: 'rebuild', label: '重建' },
]
watch(
  () => [props.projectId, props.revision] as const,
  () => { void reset(props.requestedSeq) },
  { immediate: true },
)
watch(() => props.requestedSeq, (seq) => {
  if (seq && detail.value?.seq !== seq) void reveal(seq)
})
onBeforeUnmount(() => {
  listRequestEpoch += 1
  detailRequestEpoch += 1
})

async function reset(preferredSeq?: number) {
  listRequestEpoch += 1
  detailRequestEpoch += 1
  items.value = []
  detail.value = null
  cursor.value = null
  listError.value = ''
  detailError.value = ''
  lastDetailSeq = 0
  if (props.projectId) await fetchPage(true, preferredSeq)
}

async function fetchPage(resetList: boolean, preferredSeq?: number) {
  if (!props.projectId || (!resetList && (listLoading.value || cursor.value === null))) return
  const epoch = ++listRequestEpoch
  const projectId = props.projectId
  listLoading.value = true
  if (resetList) listError.value = ''
  try {
    const page = await getKnowledgeCommits(projectId, {
      kind: kind.value,
      limit: 50,
      before: resetList ? undefined : cursor.value || undefined,
    })
    if (epoch !== listRequestEpoch || projectId !== props.projectId) return
    items.value = resetList ? page.items : [...items.value, ...page.items]
    cursor.value = page.next_cursor ?? null
    if (resetList && items.value[0]) await open(preferredSeq || items.value[0].seq)
  } catch (reason) {
    if (epoch !== listRequestEpoch || projectId !== props.projectId) return
    listError.value = messageOf(reason, '变更历史读取失败')
  } finally {
    if (epoch === listRequestEpoch) listLoading.value = false
  }
}

async function open(seq: number) {
  lastDetailSeq = seq
  const epoch = ++detailRequestEpoch
  const projectId = props.projectId
  detailLoading.value = true
  detailError.value = ''
  try {
    const payload = await getKnowledgeCommit(projectId, seq)
    if (epoch !== detailRequestEpoch || projectId !== props.projectId) return
    detail.value = payload.commit
    if (!items.value.some(item => item.seq === payload.commit.seq)) {
      items.value = [payload.commit, ...items.value]
    }
    emit('select-commit', payload.commit.seq)
  } catch (reason) {
    if (epoch !== detailRequestEpoch || projectId !== props.projectId) return
    detail.value = null
    detailError.value = messageOf(reason, '请稍后重试。')
  } finally {
    if (epoch === detailRequestEpoch) detailLoading.value = false
  }
}

function retryDetail(): void {
  if (lastDetailSeq > 0) void open(lastDetailSeq)
}

async function reveal(seq: number) {
  await open(seq)
  await nextTick()
  document.getElementById(`commit-${seq}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function changeKind(value: string | number) {
  kind.value = String(value)
  await reset()
}

async function loadMore(event: Event) {
  const el = event.currentTarget as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) await fetchPage(false)
}

function messageOf(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback
}
</script>

<style scoped lang="scss">
.commit-panel { display: grid; grid-template-columns: 320px minmax(0, 1fr); height: 100%; min-height: 0; overflow: hidden; background: #fff; }
aside { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; border-right: 1px solid #d9dde2; background: #f8f9fa; }
.filter { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px; border-bottom: 1px solid #dfe3e7; }
.filter strong,
.filter span { display: block; }
.filter strong { color: #252b35; font-size: 13px; }
.filter > div > span { margin-top: 3px; color: #667085; font-size: 11px; }
.action-filter :deep(.app-select-trigger) { min-width: 108px; height: 32px; font-size: 11px; }
.commit-list { min-height: 0; overflow-y: auto; padding: 7px; }
.commit-list > button { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; align-items: center; gap: 9px; width: 100%; min-height: 52px; padding: 9px 8px; border: 0; border-radius: 5px; background: transparent; color: #333; text-align: left; cursor: pointer; }
.commit-list > button:hover { background: #eceff2; }
.commit-list > button.active { background: #dde2e7; }
.commit-list > button:focus-visible { outline: 2px solid #475569; outline-offset: -2px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #7b8492; }
.dot.is-ingest { background: #4f8c61; }
.dot.is-delete { background: #ad4d4d; }
.dot.is-modify { background: #526f89; }
.commit-list strong,
.commit-list small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.commit-list strong { font-size: 12px; }
.commit-list small,
em { margin-top: 4px; color: #667085; font-size: 11px; font-style: normal; }
.state { color: #667085; font-size: 11px; text-align: center; }
.side-state { display: grid; place-content: center; min-height: 140px; color: #667085; font-size: 12px; text-align: center; }
.side-state strong { color: #3d4653; }
.side-state span { margin-top: 4px; }
.side-state button { width: max-content; min-height: 34px; margin: 9px auto 0; border: 1px solid #cfd4da; border-radius: 5px; padding: 0 11px; background: #fff; cursor: pointer; }
.side-state.error { color: #9f3838; }
@media (max-width: 760px) {
  .commit-panel { grid-template-columns: 1fr; grid-template-rows: 220px minmax(0, 1fr); }
  aside { border-right: 0; border-bottom: 1px solid #d9dde2; }
}
</style>
