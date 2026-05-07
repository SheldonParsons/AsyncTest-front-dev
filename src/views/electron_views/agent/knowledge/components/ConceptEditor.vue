<template>
  <div class="concept-editor">
    <header class="concept-header">
      <div class="concept-title-row">
        <input
          v-model="nameDraft"
          class="concept-name"
          placeholder="概念名称"
          @input="markDirty"
        />
        <button class="concept-mode-btn" @click="toggleEditMode">
          {{ editMode ? '切换预览' : '编辑内容' }}
        </button>
        <button
          class="concept-mode-btn concept-mode-btn--primary"
          :disabled="polishing || !selectedVariant"
          @click="polishDefinition"
        >
          {{ polishing ? '美化中...' : '美化标准定义' }}
        </button>
        <button class="concept-save" :disabled="!dirty || saving" @click="save">
          {{ saving ? '保存中...' : (dirty ? '保存' : '已保存') }}
        </button>
      </div>
      <p class="concept-subtitle">一个概念下可以保留多个生成结果；正式定义只能有一个。</p>
      <div class="concept-tabs" role="tablist" aria-label="概念版本">
        <button
          v-for="(variant, index) in sortedVariants"
          :key="variant.id || variant.status"
          :class="['concept-tab', `concept-tab--${variant.status}`, { 'concept-tab--active': selectedVariantId === variant.id }]"
          role="tab"
          :aria-selected="selectedVariantId === variant.id"
          @click="selectVariant(variant.id || '')"
        >
          <span class="concept-tab-main">
            <span class="concept-tab-label">{{ variantLabel(variant.status) }}</span>
            <span class="concept-tab-index">#{{ index + 1 }}</span>
          </span>
          <span class="concept-tab-meta">{{ variantMeta(variant) }}</span>
        </button>
      </div>
    </header>

    <main ref="bodyRef" class="concept-body">
      <div v-if="!selectedVariant" class="concept-empty">暂无概念定义</div>
      <template v-else>
        <section v-if="selectedVariant.status !== 'formal'" class="concept-review">
          <div>
            <strong>{{ variantLabel(selectedVariant.status) }}</strong>
            <p>{{ actionHint }}</p>
          </div>
          <div class="concept-review-actions">
            <button class="concept-secondary" @click="resolveVariant('ignore')">忽略</button>
            <button
              v-if="selectedVariant.status === 'supplement'"
              class="concept-secondary"
              :disabled="merging"
              @click="mergeVariantToFormal"
            >{{ merging ? '合并中...' : '合并到正式' }}</button>
            <button class="concept-primary" @click="resolveVariant('promote_to_formal')">
              {{ selectedVariant.status === 'replacement' ? '替代为正式' : '转为正式' }}
            </button>
          </div>
        </section>

        <section class="concept-section concept-section--primary">
          <div class="concept-section-title">
            <label class="concept-label">标准定义</label>
            <button
              v-if="editMode"
              class="concept-inline-btn"
              :disabled="polishing"
              @click="polishDefinition"
            >{{ polishing ? '美化中...' : '美化' }}</button>
          </div>
          <textarea
            v-if="editMode"
            v-model="variantDraft.definition"
            class="concept-textarea concept-textarea--definition"
            @input="markDirty"
          />
          <div v-else class="concept-markdown concept-markdown--definition" v-html="definitionHtml"></div>
        </section>

        <section class="concept-grid">
          <div class="concept-section">
            <label class="concept-label">别名</label>
            <input
              v-if="editMode"
              v-model="aliasesText"
              class="concept-input"
              placeholder="多个别名用逗号分隔"
              @input="markDirty"
            />
            <div v-else class="concept-readonly">{{ (selectedVariant.aliases || []).join('，') || '无' }}</div>
          </div>
          <div class="concept-section">
            <label class="concept-label">状态</label>
            <div class="concept-readonly">{{ variantLabel(selectedVariant.status) }}</div>
          </div>
        </section>

        <section class="concept-section">
          <label class="concept-label">系统生成概览</label>
          <textarea
            v-if="editMode"
            v-model="variantDraft.summary"
            class="concept-textarea"
            @input="markDirty"
          />
          <div v-else class="concept-markdown" v-html="summaryHtml"></div>
        </section>

        <section class="concept-section">
          <label class="concept-label">适用范围说明</label>
          <textarea
            v-if="editMode"
            v-model="variantDraft.scope"
            class="concept-textarea"
            @input="markDirty"
          />
          <div v-else class="concept-markdown" v-html="scopeHtml"></div>
        </section>

        <section class="concept-section">
          <label class="concept-label">备注正文</label>
          <textarea
            v-if="editMode"
            v-model="variantDraft.notes"
            class="concept-textarea concept-textarea--notes"
            @input="markDirty"
          />
          <div v-else class="concept-markdown" v-html="notesHtml"></div>
        </section>

        <section v-if="sourceStatusText || selectedVariant.source_block_id || selectedVariant.evidence || selectedVariant.match_reason" class="concept-section concept-section--source">
          <label class="concept-label">来源与判断</label>
          <p v-if="sourceStatusText" :class="['concept-source-status', { 'concept-source-status--missing': selectedVariant.source_status === 'missing' }]">
            {{ sourceStatusText }}
          </p>
          <p v-if="selectedVariant.source_block_id" class="concept-source">来源块：{{ selectedVariant.source_block_id }}</p>
          <p v-if="selectedVariant.match_reason" class="concept-evidence">判断：{{ selectedVariant.match_reason }}</p>
          <p v-if="selectedVariant.evidence" class="concept-evidence">{{ selectedVariant.evidence }}</p>
        </section>

        <section v-if="selectedVariant.status === 'formal'" class="concept-section concept-section--source">
          <div class="concept-section-title">
            <label class="concept-label">正式来源</label>
            <button class="concept-inline-btn" @click="loadImpactEvents">刷新</button>
          </div>
          <div v-if="!formalSources.length" class="concept-source-empty">暂无正式来源。手动创建或旧数据可能没有来源记录。</div>
          <div v-for="source in formalSources" :key="source.id" class="concept-source-card" :class="`is-${source.source_status || 'active'}`">
            <div class="concept-source-card-head">
              <strong>{{ sourceStatusLabel(source.source_status) }}</strong>
              <span>{{ source.source_block_id || '无来源块' }}</span>
            </div>
            <p>{{ source.contribution_text || '暂无贡献说明' }}</p>
          </div>
        </section>

        <section v-if="impactEvents.length" class="concept-section concept-section--source">
          <div class="concept-section-title">
            <label class="concept-label">概念影响待复核</label>
            <button class="concept-inline-btn" :disabled="loadingEvents" @click="loadImpactEvents">刷新</button>
          </div>
          <div v-for="event in impactEvents" :key="event.id" class="concept-impact-card">
            <div class="concept-source-card-head">
              <strong>{{ event.event_type === 'block_deleted' ? '来源块已删除' : '来源块已更新' }}</strong>
              <span>{{ event.status }}</span>
            </div>
            <p>{{ event.payload?.contribution_text || '该块曾支撑正式概念，需要复核是否仍然成立。' }}</p>
            <div v-if="event.proposal?.source_action" class="concept-impact-proposal">
              <strong>建议：{{ sourceActionLabel(event.proposal.source_action) }}</strong>
              <p v-if="event.proposal.reason">{{ event.proposal.reason }}</p>
              <p v-if="event.proposal.contribution_text">贡献说明：{{ event.proposal.contribution_text }}</p>
            </div>
            <div class="concept-review-actions">
              <button class="concept-secondary" :disabled="reviewingEventId === event.id" @click="reviewImpactEvent(event.id)">
                {{ reviewingEventId === event.id ? '复核中...' : '运行复核' }}
              </button>
              <button class="concept-secondary" @click="ignoreImpactEvent(event.id)">忽略</button>
              <button class="concept-primary" :disabled="!event.proposal?.source_action" @click="applyImpactEvent(event.id)">应用建议</button>
            </div>
          </div>
        </section>

        <section v-if="hasNextConcept" class="concept-next">
          <button class="concept-secondary" @click="$emit('request-next')">下一个</button>
        </section>
      </template>
    </main>
    <Teleport to="body">
      <Transition name="concept-dialog-fade">
        <div v-if="showMergeDialog" class="concept-run-overlay" role="dialog" aria-modal="true">
          <div class="concept-run-dialog">
            <header class="concept-run-header">
              <div>
                <p>概念合并</p>
                <h2>{{ merging ? '正在执行' : '执行完成' }}</h2>
              </div>
              <button class="concept-run-close" :disabled="merging" @click="showMergeDialog = false" aria-label="关闭">×</button>
            </header>
            <div ref="mergeDialogBodyRef" class="concept-run-body">
              <TransitionGroup name="concept-log-card" tag="div" class="concept-run-list">
                <div
                  v-for="(log, logIndex) in mergeLogs"
                  :key="log._key"
                  :class="['concept-run-item', `is-${log.type || 'progress'}`, { 'is-latest': merging && logIndex === mergeLogs.length - 1 }]"
                >
                  <span>{{ logIndex + 1 }}</span>
                  <div>
                    <strong>{{ log.message }}</strong>
                    <p v-if="log.detail">{{ log.detail }}</p>
                  </div>
                </div>
              </TransitionGroup>
              <div v-if="!mergeLogs.length" class="concept-run-empty">等待执行…</div>
            </div>
            <footer class="concept-run-footer">
              <button class="concept-secondary" :disabled="merging" @click="showMergeDialog = false">关闭</button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import type { KBConcept, KBConceptImpactEvent, KBConceptVariant } from '@/types/knowledge'
import { listConceptImpactEvents, polishConceptVariant, resolveConceptImpactEvent, resolveConceptVariant, reviewConceptImpactEvent, updateConcept } from '../api'

const props = defineProps<{
  concept: KBConcept
  kbId: number
  hasNextConcept?: boolean
}>()

const emit = defineEmits<{
  (e: 'saved', action?: 'ignore' | 'promote' | 'merge' | 'save'): void
  (e: 'dirty-changed', dirty: boolean): void
  (e: 'request-next'): void
}>()

const bodyRef = ref<HTMLElement | null>(null)
const selectedVariantId = ref('')
const nameDraft = ref('')
const aliasesDraft = ref<string[]>([])
const aliasesText = ref('')
const editMode = ref(false)
const dirty = ref(false)
const saving = ref(false)
const polishing = ref(false)
const merging = ref(false)
const loadingEvents = ref(false)
const reviewingEventId = ref('')
const showMergeDialog = ref(false)
const mergeDialogBodyRef = ref<HTMLElement | null>(null)
type MergeLog = { _key: string; type?: string; message: string; detail?: string }
const mergeLogs = ref<MergeLog[]>([])
const impactEvents = ref<KBConceptImpactEvent[]>([])
let mergeLogSeq = 0
const variantDraft = ref({
  definition: '',
  summary: '',
  scope: '',
  notes: '',
})

const sortedVariants = computed(() => {
  const order: Record<string, number> = { formal: 0, conflict: 1, replacement: 2, supplement: 3, duplicate: 4, new: 5 }
  return [...(props.concept.variants || [])].sort((a, b) => (order[a.status || 'new'] ?? 9) - (order[b.status || 'new'] ?? 9))
})

const selectedVariant = computed<KBConceptVariant | null>(() =>
  sortedVariants.value.find(item => item.id === selectedVariantId.value)
  || sortedVariants.value[0]
  || null,
)

const formalSources = computed(() => props.concept.formal_sources || [])

const sourceStatusText = computed(() => {
  if (!selectedVariant.value) return ''
  if (selectedVariant.value.source_status === 'missing') return '来源块已删除，概念仍保留为独立知识。'
  if (!selectedVariant.value.source_block_id) return '手动创建，无来源块。'
  return ''
})

const actionHint = computed(() => {
  const status = selectedVariant.value?.status
  if (status === 'formal') return '当前为正式定义。'
  if (status === 'duplicate') return '该候选被判断为重复定义，可以忽略，或确认后转为正式。'
  if (status === 'supplement') return '该候选被判断为补充定义，可以合并到正式定义。'
  if (status === 'replacement') return '该候选被判断为更准确的概念命名，可以替代当前正式概念名；旧名称会保留为别名。'
  if (status === 'conflict') return '该候选与正式定义存在冲突，请人工判断是否替换正式定义。'
  return '该候选尚未成为正式定义。'
})

const definitionHtml = computed(() => markdownHtml(variantDraft.value.definition || selectedVariant.value?.definition || ''))
const summaryHtml = computed(() => markdownHtml(variantDraft.value.summary || selectedVariant.value?.summary || ''))
const scopeHtml = computed(() => markdownHtml(variantDraft.value.scope || selectedVariant.value?.scope || ''))
const notesHtml = computed(() => markdownHtml(variantDraft.value.notes || selectedVariant.value?.notes || ''))

watch(() => props.concept.id, reset, { immediate: true })
watch(() => props.concept.updated_at, reset)
watch(() => selectedVariant.value?.id, resetVariantDraft, { immediate: true })
watch(() => props.concept.id, () => loadImpactEvents(), { immediate: true })

function reset() {
  nameDraft.value = props.concept.name || ''
  aliasesDraft.value = props.concept.aliases || []
  const currentId = selectedVariantId.value
  selectedVariantId.value = sortedVariants.value.some(item => item.id === currentId)
    ? currentId
    : props.concept.official_variant_id || sortedVariants.value[0]?.id || ''
  resetVariantDraft()
  dirty.value = false
  emit('dirty-changed', false)
}

function resetVariantDraft() {
  const variant = selectedVariant.value
  aliasesDraft.value = variant?.aliases || props.concept.aliases || []
  aliasesText.value = aliasesDraft.value.join('，')
  variantDraft.value = {
    definition: variant?.definition || '',
    summary: variant?.summary || '',
    scope: variant?.scope || '',
    notes: variant?.notes || '',
  }
}

function selectVariant(id: string) {
  if (selectedVariantId.value === id) return
  selectedVariantId.value = id
  dirty.value = false
  emit('dirty-changed', false)
}

function toggleEditMode() {
  editMode.value = !editMode.value
}

function parseAliases(value: string) {
  return value
    .split(/[,，\n]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function markdownHtml(value: string) {
  const text = value && value.trim() ? value : '暂无内容'
  return marked.parse(text) as string
}

function variantLabel(status?: string) {
  return ({
    formal: '正式',
    new: '新增',
    duplicate: '重复',
    supplement: '补充',
    conflict: '冲突',
    replacement: '替代',
  } as Record<string, string>)[status || 'new'] || status || '新增'
}

function variantMeta(variant: KBConceptVariant) {
  if (variant.source_status === 'missing') return '来源失效'
  if (!variant.source_block_id) return '手动'
  if (!variant.created_at) return '提取'
  const date = new Date(variant.created_at)
  if (Number.isNaN(date.getTime())) return '提取'
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function sourceStatusLabel(status?: string) {
  return ({
    active: '有效来源',
    stale: '待复核',
    deleted: '已删除',
    ignored: '已忽略',
  } as Record<string, string>)[status || 'active'] || status || '有效来源'
}

function sourceActionLabel(action?: string) {
  return ({
    keep: '保留来源',
    update: '更新来源与正式定义',
    remove: '移除来源',
  } as Record<string, string>)[action || 'keep'] || action || '保留来源'
}

async function loadImpactEvents() {
  if (!props.concept.id || !props.kbId) return
  loadingEvents.value = true
  try {
    impactEvents.value = await listConceptImpactEvents(props.kbId, {
      status: 'pending',
      concept_id: props.concept.id,
    })
  } catch (e) {
    console.error('[load concept impact events failed]', e)
  } finally {
    loadingEvents.value = false
  }
}

async function reviewImpactEvent(eventId: string) {
  reviewingEventId.value = eventId
  try {
    const updated = await reviewConceptImpactEvent(props.kbId, eventId)
    impactEvents.value = impactEvents.value.map(item => item.id === eventId ? updated : item)
    window.$toast?.({ title: '复核建议已生成', type: 'success' })
  } catch (e: any) {
    window.$toast?.({ title: e.message || '复核失败', type: 'error' })
  } finally {
    reviewingEventId.value = ''
  }
}

async function applyImpactEvent(eventId: string) {
  const event = impactEvents.value.find(item => item.id === eventId)
  if (!event?.proposal?.source_action) return
  try {
    await resolveConceptImpactEvent(props.kbId, eventId, { action: 'apply', proposal: event.proposal as any })
    impactEvents.value = impactEvents.value.filter(item => item.id !== eventId)
    emit('saved', 'save')
    window.$toast?.({ title: '已应用概念修订建议', type: 'success' })
  } catch (e: any) {
    window.$toast?.({ title: e.message || '应用失败', type: 'error' })
  }
}

async function ignoreImpactEvent(eventId: string) {
  try {
    await resolveConceptImpactEvent(props.kbId, eventId, { action: 'ignore' })
    impactEvents.value = impactEvents.value.filter(item => item.id !== eventId)
    window.$toast?.({ title: '已忽略影响事件', type: 'success', position: 'bottom-left' })
  } catch (e: any) {
    window.$toast?.({ title: e.message || '忽略失败', type: 'error' })
  }
}

function markDirty() {
  if (!dirty.value) {
    dirty.value = true
    emit('dirty-changed', true)
  }
}

async function save() {
  if (saving.value) return
  const variant = selectedVariant.value
  saving.value = true
  try {
    const aliases = parseAliases(aliasesText.value)
    await updateConcept(props.kbId, props.concept.id, {
      name: nameDraft.value.trim() || props.concept.name,
      aliases,
      variant_id: variant?.id || undefined,
      definition: variantDraft.value.definition,
      summary: variantDraft.value.summary,
      scope: variantDraft.value.scope,
      notes: variantDraft.value.notes,
    })
    aliasesDraft.value = aliases
    dirty.value = false
    emit('dirty-changed', false)
    emit('saved', 'save')
    window.$toast?.({ title: '已保存', type: 'success' })
  } catch (e: any) {
    window.$toast?.({ title: e.message || '保存失败', type: 'error' })
  } finally {
    saving.value = false
  }
}

async function polishDefinition() {
  const variant = selectedVariant.value
  if (!variant?.id || polishing.value) return
  if (!editMode.value) editMode.value = true
  if (!variantDraft.value.definition.trim()) {
    window.$toast?.({ title: '请先填写标准定义', type: 'info' })
    return
  }
  polishing.value = true
  try {
    const result = await polishConceptVariant(props.kbId, props.concept.id, variant.id, {
      name: nameDraft.value.trim() || variant.name,
      definition: variantDraft.value.definition,
    })
    variantDraft.value.definition = result.definition || variantDraft.value.definition
    markDirty()
    window.$toast?.({ title: '标准定义已美化', type: 'success' })
  } catch (e: any) {
    window.$toast?.({ title: e.message || '美化失败', type: 'error' })
  } finally {
    polishing.value = false
  }
}

async function resolveVariant(action: 'ignore' | 'promote_to_formal' | 'merge_to_formal') {
  const variant = selectedVariant.value
  if (!variant?.id) return
  await resolveConceptVariant(props.kbId, props.concept.id, variant.id, { action })
  emit('saved', action === 'ignore' ? 'ignore' : action === 'merge_to_formal' ? 'merge' : 'promote')
  window.$toast?.({
    title: action === 'ignore' ? '已忽略' : action === 'merge_to_formal' ? '已合并到正式' : '已转为正式',
    type: 'success',
    position: action === 'ignore' ? 'bottom-left' : undefined,
  })
}

async function mergeVariantToFormal() {
  const variant = selectedVariant.value
  if (!variant?.id || merging.value) return
  merging.value = true
  showMergeDialog.value = true
  mergeLogs.value = []
  mergeLogSeq = 0
  appendMergeLog('progress', '开始合并到正式概念', `待合并 tag：${variant.name || props.concept.name}`)
  try {
    appendMergeLog('progress', '检查当前正式定义')
    const formal = props.concept.variants?.find(item => item.id === props.concept.official_variant_id)
    if (!formal) throw new Error('当前概念没有正式定义，无法合并')
    appendMergeLog('progress', '调用后端合并接口', '后端会调用 LLM 合并正式定义、概览、适用范围和备注')
    const startedAt = performance.now()
    const result = await resolveConceptVariant(props.kbId, props.concept.id, variant.id, { action: 'merge_to_formal' })
    const elapsedMs = result?._meta?.llm_elapsed_ms ?? Math.round(performance.now() - startedAt)
    appendMergeLog('llm', 'LLM 合并返回', formatDuration(elapsedMs))
    appendMergeLog('result', '合并完成', '补充 tag 已合并到正式定义，并从待处理列表移除')
    emit('saved', 'merge')
    window.$toast?.({ title: '已合并到正式', type: 'success' })
  } catch (e: any) {
    appendMergeLog('error', '合并失败', e.message || '请稍后重试')
    window.$toast?.({ title: e.message || '合并失败', type: 'error' })
  } finally {
    merging.value = false
  }
}

function appendMergeLog(type: string, message: string, detail = '') {
  mergeLogs.value.push({ _key: `${Date.now()}-${mergeLogSeq++}`, type, message, detail })
  scrollMergeDialogToBottom()
}

function formatDuration(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  if (value < 1000) return `LLM 用时 ${Math.round(value)}ms`
  return `LLM 用时 ${(value / 1000).toFixed(value < 10000 ? 1 : 0)}s`
}

async function scrollMergeDialogToBottom() {
  await nextTick()
  const el = mergeDialogBodyRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
}

async function scrollToBottom() {
  await nextTick()
  if (!bodyRef.value) return
  bodyRef.value.scrollTo({ top: bodyRef.value.scrollHeight, behavior: 'smooth' })
}

defineExpose({ save, scrollToBottom })
</script>

<style scoped lang="scss">
.concept-editor { height: 100%; display: flex; flex-direction: column; background: #fff; color: #1d1d1f; overflow: hidden; }
.concept-header { padding: 18px 24px 14px; border-bottom: 1px solid rgba(0,0,0,0.08); background: #fbfbfc; }
.concept-title-row { display: flex; align-items: center; gap: 12px; }
.concept-name { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 20px; font-weight: 700; }
.concept-subtitle { margin: 8px 0 0; color: rgba(0,0,0,0.52); font-size: 12.5px; }
.concept-mode-btn {
  flex: 0 0 auto;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 8px;
  background: #fff;
  color: #1d1d1f;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.concept-mode-btn--primary { background: #1d1d1f; border-color: #1d1d1f; color: #fff; }
.concept-mode-btn:disabled { opacity: 0.42; cursor: default; }
.concept-tabs {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  overflow-x: auto;
  padding: 4px;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  background: #f0f0f2;
}
.concept-tab {
  position: relative;
  flex: 0 0 auto;
  min-width: 112px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: rgba(0,0,0,0.62);
  padding: 8px 10px 9px;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}
.concept-tab:hover { background: rgba(255,255,255,0.62); color: #1d1d1f; }
.concept-tab--active {
  border-color: rgba(0,0,0,0.12);
  background: #fff;
  color: #1d1d1f;
}
.concept-tab--active::after {
  content: "";
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 3px;
  height: 2px;
  border-radius: 999px;
  background: #1d1d1f;
}
.concept-tab-main { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.concept-tab-label { font-size: 12px; font-weight: 800; }
.concept-tab-index { color: rgba(0,0,0,0.38); font-size: 11px; font-weight: 700; }
.concept-tab-meta {
  display: block;
  margin-top: 3px;
  color: rgba(0,0,0,0.46);
  font-size: 11px;
  font-weight: 600;
}
.concept-tab--formal.concept-tab--active::after { background: #075ea8; }
.concept-tab--conflict.concept-tab--active::after { background: #b42318; }
.concept-tab--replacement.concept-tab--active::after { background: #7a4c00; }
.concept-tab--supplement.concept-tab--active::after { background: #1d4ed8; }
.concept-tab--duplicate.concept-tab--active::after { background: #64748b; }
.concept-save, .concept-primary, .concept-secondary { border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; }
.concept-save, .concept-primary { background: #1d1d1f; color: #fff; }
.concept-save:disabled { opacity: 0.35; cursor: default; }
.concept-secondary { background: #f2f2f4; color: #1d1d1f; }
.concept-body { flex: 1; overflow-y: auto; padding: 22px 24px 32px; display: flex; flex-direction: column; gap: 16px; }
.concept-empty { color: rgba(0,0,0,0.45); font-size: 13px; padding: 18px; border: 1px dashed rgba(0,0,0,0.14); border-radius: 8px; }
.concept-grid { display: grid; grid-template-columns: minmax(0, 1fr) 180px; gap: 14px; }
.concept-section { display: flex; flex-direction: column; gap: 8px; }
.concept-section-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.concept-label { font-size: 12px; font-weight: 700; color: rgba(0,0,0,0.58); }
.concept-textarea, .concept-readonly, .concept-input { border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; background: #fff; padding: 10px 11px; font-size: 13px; line-height: 1.55; outline: none; }
.concept-readonly { color: rgba(0,0,0,0.58); background: #f8f8f9; }
.concept-input { height: 38px; line-height: 1.2; }
.concept-input:focus, .concept-textarea:focus { border-color: rgba(0,0,0,0.32); box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
.concept-textarea { resize: vertical; min-height: 86px; }
.concept-textarea--definition { min-height: 120px; }
.concept-textarea--notes { min-height: 150px; }
.concept-markdown {
  min-height: 44px;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  background: #fff;
  padding: 12px 14px;
  color: rgba(0,0,0,0.76);
  font-size: 13px;
  line-height: 1.65;
}
.concept-markdown--definition { border-color: rgba(0,0,0,0.12); background: linear-gradient(180deg, #fff, #fbfbfc); }
.concept-markdown :deep(p) { margin: 0 0 8px; }
.concept-markdown :deep(p:last-child) { margin-bottom: 0; }
.concept-markdown :deep(ul), .concept-markdown :deep(ol) { margin: 6px 0 6px 18px; padding: 0; }
.concept-markdown :deep(li) { margin: 4px 0; }
.concept-markdown :deep(h1), .concept-markdown :deep(h2), .concept-markdown :deep(h3) { margin: 10px 0 6px; color: #1d1d1f; line-height: 1.35; }
.concept-markdown :deep(h1) { font-size: 17px; }
.concept-markdown :deep(h2) { font-size: 15px; }
.concept-markdown :deep(h3) { font-size: 14px; }
.concept-markdown :deep(strong) { color: #111; }
.concept-markdown :deep(code) { border-radius: 4px; background: rgba(0,0,0,0.06); padding: 1px 4px; }
.concept-inline-btn {
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 7px;
  background: #fff;
  color: #1d1d1f;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.concept-inline-btn:disabled { opacity: 0.45; cursor: default; }
.concept-section--source { padding: 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; background: #fafafa; }
.concept-source, .concept-evidence, .concept-source-status { margin: 0; color: rgba(0,0,0,0.62); font-size: 12.5px; line-height: 1.6; }
.concept-source-status--missing { color: #b42318; font-weight: 700; }
.concept-source-empty {
  padding: 12px;
  border-radius: 8px;
  background: #fff;
  color: rgba(0,0,0,0.42);
  font-size: 12.5px;
}
.concept-source-card,
.concept-impact-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 12px;
  margin-top: 8px;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  background: #fff;
}
.concept-source-card.is-stale,
.concept-source-card.is-deleted {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(255, 247, 237, 0.72);
}
.concept-source-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(0,0,0,0.54);
  font-size: 12px;
}
.concept-source-card-head strong {
  color: #1d1d1f;
  font-size: 12.5px;
}
.concept-source-card p,
.concept-impact-card p {
  margin: 0;
  color: rgba(0,0,0,0.64);
  font-size: 12.5px;
  line-height: 1.55;
}
.concept-impact-proposal {
  padding: 9px 10px;
  border-radius: 7px;
  background: rgba(0, 113, 227, 0.05);
  border: 1px solid rgba(0, 113, 227, 0.14);
}
.concept-impact-proposal strong {
  display: block;
  margin-bottom: 4px;
  color: #075ea8;
  font-size: 12.5px;
}
.concept-review { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 14px; border-radius: 8px; background: #fff7ed; border: 1px solid rgba(255, 149, 0, 0.24); }
.concept-review p { margin: 4px 0 0; color: rgba(0,0,0,0.58); font-size: 12px; }
.concept-review-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.concept-review-actions button:disabled { opacity: 0.45; cursor: default; }
.concept-next { display: flex; justify-content: flex-end; padding-top: 4px; }

.concept-run-overlay {
  position: fixed;
  inset: 0;
  z-index: 10030;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(3px);
}
.concept-run-dialog {
  width: min(660px, calc(100vw - 48px));
  max-height: min(680px, calc(100vh - 80px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(0,0,0,0.2);
}
.concept-run-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
.concept-run-header p { margin: 0 0 3px; color: rgba(0,0,0,0.45); font-size: 11px; font-weight: 800; }
.concept-run-header h2 { margin: 0; color: #1d1d1f; font-size: 16px; font-weight: 800; }
.concept-run-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: rgba(0,0,0,0.5);
  font-size: 18px;
  cursor: pointer;
}
.concept-run-close:hover { background: rgba(0,0,0,0.05); color: #1d1d1f; }
.concept-run-close:disabled { opacity: 0.4; cursor: default; }
.concept-run-body { padding: 12px 18px 14px; overflow-y: auto; }
.concept-run-list { display: flex; flex-direction: column; gap: 8px; }
.concept-run-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(0,0,0,0.07);
  border-radius: 8px;
  background: #fafafa;
}
.concept-run-item > span { color: rgba(0,0,0,0.38); font-size: 12px; font-variant-numeric: tabular-nums; }
.concept-run-item strong { display: block; color: #1d1d1f; font-size: 13px; line-height: 1.45; }
.concept-run-item p { margin: 4px 0 0; color: rgba(0,0,0,0.58); font-size: 12px; line-height: 1.45; }
.concept-run-item.is-llm { border-color: rgba(0, 113, 227, 0.18); background: rgba(0, 113, 227, 0.04); }
.concept-run-item.is-result { border-color: rgba(23, 114, 69, 0.18); background: rgba(23, 114, 69, 0.05); }
.concept-run-item.is-error { border-color: rgba(180, 35, 24, 0.18); background: rgba(180, 35, 24, 0.05); }
.concept-run-item.is-latest:not(.is-result):not(.is-error) { animation: concept-run-active 1.6s ease-in-out infinite; }
.concept-run-empty { padding: 24px; text-align: center; color: rgba(0,0,0,0.42); font-size: 13px; }
.concept-run-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid rgba(0,0,0,0.08);
}
.concept-log-card-enter-active { transition: opacity 180ms ease, transform 180ms ease; }
.concept-log-card-enter-from { opacity: 0; transform: translateY(8px) scale(0.992); }
.concept-log-card-enter-to { opacity: 1; transform: translateY(0) scale(1); }
.concept-log-card-move { transition: transform 180ms ease; }
.concept-dialog-fade-enter-active, .concept-dialog-fade-leave-active { transition: opacity 160ms ease; }
.concept-dialog-fade-enter-from, .concept-dialog-fade-leave-to { opacity: 0; }
@keyframes concept-run-active {
  0%, 100% { border-color: rgba(0,0,0,0.07); background: #fafafa; }
  50% { border-color: rgba(0, 113, 227, 0.2); background: rgba(0, 113, 227, 0.035); }
}
</style>
