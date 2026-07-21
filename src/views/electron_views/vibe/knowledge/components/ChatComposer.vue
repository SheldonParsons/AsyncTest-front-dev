<template>
  <section
    ref="rootEl"
    class="chat-composer"
    aria-label="聊天输入框"
  >
    <!-- 添加内容菜单（文件） -->
    <div class="attachment-menu" :class="{ 'is-open': menuOpen && !isQuestion }" role="menu" aria-label="添加内容">
      <div class="menu-section">
        <div class="menu-title">文件</div>
        <button class="menu-item" type="button" role="menuitem" @click="pickMarkdown">
          <span class="markdown-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M7 9.5H25C26.1 9.5 27 10.4 27 11.5V20.5C27 21.6 26.1 22.5 25 22.5H7C5.9 22.5 5 21.6 5 20.5V11.5C5 10.4 5.9 9.5 7 9.5Z" fill="rgba(255,255,255,.18)" stroke="currentColor" stroke-width="1.6"/>
              <path d="M9 19V13L12 16.7L15 13V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19 13V18.5M19 18.5L16.9 16.4M19 18.5L21.1 16.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M23.5 13V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="item-text">
            <strong>Markdown 文件</strong>
            <span>.md / .markdown（默认作提问资料；说"录入/导入"则整篇入库）</span>
          </span>
        </button>
      </div>
    </div>


    <div class="composer-shell" :class="{ 'is-question': isQuestion }">
      <!-- 询问模式：Codex 反问式提问 + 选项列表 -->
      <div v-if="isQuestion" class="question-view" aria-label="提问和选项列表">
        <h1 class="question-title">{{ question?.title }}</h1>
        <div v-if="question?.description" class="question-description">{{ question?.description }}</div>
        <!-- 改原文·diff 预览：确认前看清红删绿增 -->
        <div v-if="question?.diff" class="edit-diff">
          <div v-if="question.diff.breadcrumb" class="edit-diff-bc">{{ question.diff.breadcrumb }}</div>
          <div class="edit-diff-body">
            <div
              v-for="(ln, i) in diffLines(question.diff.oldBody, question.diff.newBody)"
              :key="i"
              class="d-line"
              :class="'d-' + ln.t"
            >{{ ln.t === 'del' ? '− ' : ln.t === 'add' ? '+ ' : '  ' }}{{ ln.text }}</div>
          </div>
        </div>
        <!-- 连锁·多处 diff：逐项勾选要不要一起改 -->
        <div v-if="cascadeRows.length" class="cascade-list" aria-label="连锁影响的多处原文">
          <label
            v-for="row in cascadeRows"
            :key="row.id"
            class="cascade-row"
            :class="{ 'is-checked': checkedIds.has(row.id) }"
          >
            <input
              type="checkbox"
              class="cascade-check"
              :checked="checkedIds.has(row.id)"
              @change="toggleCascade(row.id)"
            />
            <span class="cascade-body">
              <span class="cascade-bc">
                <span v-if="row.mode === 'semantic'" class="cascade-tag sem">语义</span>
                <span v-else class="cascade-tag lit">同词</span>
                {{ row.breadcrumb }}
              </span>
              <span v-if="row.reason" class="cascade-reason">{{ row.reason }}</span>
              <span class="cascade-diff">
                <span
                  v-for="(ln, i) in diffLines(row.oldBody, row.newBody)"
                  :key="i"
                  class="d-line"
                  :class="'d-' + ln.t"
                >{{ ln.t === 'del' ? '− ' : ln.t === 'add' ? '+ ' : '  ' }}{{ ln.text }}</span>
              </span>
            </span>
          </label>
          <div class="cascade-hint">已勾选 {{ checkedIds.size }} / {{ cascadeRows.length }} 处</div>
        </div>
        <!-- 模块删除：危险操作清单，确认前明确会删哪些原文块 -->
        <div v-if="deleteManyRows.length" class="delete-many-panel" aria-label="模块删除影响范围">
          <div class="delete-many-head">
            <span>将删除 {{ deleteManyRows.length }} 个原文块</span>
            <strong>{{ question?.deleteMany?.prefix }}</strong>
          </div>
          <div class="delete-many-list">
            <article v-for="row in deleteManyRows" :key="row.id" class="delete-many-row">
              <span class="delete-mark" aria-hidden="true">DEL</span>
              <span class="delete-copy">
                <strong>{{ row.title || lastPath(row.breadcrumb) }}</strong>
                <small>{{ row.breadcrumb }}</small>
                <em v-if="row.bodyPreview">{{ row.bodyPreview }}</em>
              </span>
            </article>
          </div>
        </div>
        <div class="question-list" role="radiogroup" aria-label="选择回答">
          <template v-for="(item, i) in (question?.items || [])" :key="i">
            <div v-if="item.type === 'input'" class="custom-row" :class="{ 'is-active': activeIndex === i }">
              <span class="custom-entry">
                <span class="custom-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m15 5 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <input
                  class="custom-input"
                  type="text"
                  :placeholder="item.placeholder || customPlaceholder"
                  :required="item.required"
                  :aria-required="item.required || undefined"
                  v-model="customValues[i]"
                  @focus="activeIndex = i"
                  @keydown="onCustomKeydown($event, i)"
                />
              </span>
              <span class="question-actions">
                <button v-if="item.showSkip !== false" class="skip-button" type="button" @click="emitAnswer('__SKIP__')">跳过</button>
                <button
                  class="submit-button"
                  type="button"
                  :disabled="isRequiredInputEmpty(item, i)"
                  @click="submitCustom(i)"
                >
                  {{ item.submitLabel || '提交' }}
                  <svg class="enter-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 4v7a4 4 0 0 1-4 4H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m9 10-5 5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </span>
            </div>
            <button
              v-else
              class="choice-row"
              :class="{ 'is-active': activeIndex === i }"
              type="button"
              role="radio"
              :aria-checked="activeIndex === i"
              @click="emitAnswer(item.value || item.label || '')"
            >
              <span class="choice-number">{{ i + 1 }}</span>
              <span class="choice-copy">
                <span class="choice-label" v-html="item.label"></span>
                <small v-if="item.description" class="choice-description">{{ item.description }}</small>
              </span>
              <span class="question-nav" aria-hidden="true">
                <svg v-if="activeIndex === i" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
              </span>
            </button>
          </template>
        </div>
      </div>

      <!-- 普通输入模式 -->
      <div v-else class="normal-view">
        <div class="attachment-list" :class="{ 'is-visible': selectedFiles.length > 0 }" aria-live="polite">
          <span v-for="(file, i) in selectedFiles" :key="fileKey(file)" class="attachment-chip">
            <span class="chip-icon">MD</span>
            <span class="chip-name">{{ file.name }}</span>
            <button class="chip-remove" type="button" :aria-label="`移除附件 ${file.name}`" @click="removeFile(i)">×</button>
          </span>
        </div>

        <div class="input-row">
          <textarea
            ref="inputEl"
            class="composer-input"
            rows="1"
            :placeholder="placeholder"
            :value="modelValue"
            @input="onInput"
            @keydown="onInputKeydown"
          />
        </div>

        <div class="composer-actions">
          <button
            class="icon-button attach-button"
            type="button"
            aria-label="添加内容"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <svg class="file-upload-rise" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <g class="upload-file">
                <path d="M13 8H22.2L28 13.8V27C28 28.2 27.2 29 26 29H13C11.8 29 11 28.2 11 27V10C11 8.8 11.8 8 13 8Z" fill="#fff" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
                <path d="M22 8.4V14H27.6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M15.2 20H24.8M15.2 24H22.8" stroke="currentColor" stroke-width="2.05" stroke-linecap="round"/>
              </g>
              <path class="upload-pin" d="M24.8 12.8L16.3 21.3C14.5 23.1 14.5 26 16.3 27.8C18.1 29.6 21 29.6 22.8 27.8L29.7 20.9C31 19.6 31 17.5 29.7 16.2C28.4 14.9 26.3 14.9 25 16.2L18.2 23C17.7 23.5 17.7 24.4 18.2 24.9C18.7 25.4 19.6 25.4 20.1 24.9L26.3 18.7" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <span v-if="modelOptions.length || modelValueId" class="model-picker-anchor">
            <button
              class="model-picker"
              type="button"
              :disabled="modelDisabled || sending"
              :aria-expanded="modelMenuOpen ? 'true' : 'false'"
              aria-label="选择模型"
              @click.stop="toggleModelMenu"
            >
              <span>{{ currentModelLabel }}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            <div class="model-menu" :class="{ 'is-open': modelMenuOpen && !isQuestion }" role="menu" aria-label="选择模型">
              <div class="model-menu-head">
                <span>选择模型</span>
                <em v-if="modelDisabled">刷新中...</em>
              </div>
              <button
                v-for="item in modelOptions"
                :key="item.value"
                class="model-menu-item"
                :class="{ active: item.value === modelValueId }"
                type="button"
                role="menuitemradio"
                :aria-checked="item.value === modelValueId ? 'true' : 'false'"
                :disabled="modelDisabled || sending"
                @click="selectModel(item.value)"
              >
                <span>
                  <strong>{{ item.label }}</strong>
                  <small v-if="item.hint">{{ item.hint }}</small>
                </span>
                <svg v-if="item.value === modelValueId" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m20 6-11 11-5-5" /></svg>
              </button>
              <div v-if="!modelOptions.length" class="model-menu-empty">暂无可用模型</div>
            </div>
          </span>

          <button
            class="icon-button send-button"
            :class="{ 'is-sending': sending, 'is-stopping': stopping }"
            type="button"
            :aria-label="stopping ? '正在停止' : sending ? '停止本轮' : '发送'"
            :title="stopping ? '正在停止' : sending ? '停止本轮' : '发送'"
            :disabled="stopping || (!sending && sendDisabled)"
            @click="onSend"
          >
            <svg class="send-arrow-flow" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <g class="send-arrow-shape">
                <circle class="orbit" cx="20" cy="20" r="15.25" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" />
                <path class="arrow-stem" d="M20 29V12.25" stroke="currentColor" stroke-width="2.45" stroke-linecap="round" />
                <path class="arrow-head" d="M12.9 19.35L20 12.25L27.1 19.35" stroke="currentColor" stroke-width="2.45" stroke-linecap="round" stroke-linejoin="round" />
              </g>
              <g class="send-running-shape">
                <rect class="pause-block" x="12" y="12" width="16" height="16" rx="3.5" fill="currentColor" />
                <circle class="run-dot dot-1" cx="14" cy="20" r="2.45" fill="currentColor" />
                <circle class="run-dot dot-2" cx="20" cy="20" r="2.45" fill="currentColor" />
                <circle class="run-dot dot-3" cx="26" cy="20" r="2.45" fill="currentColor" />
              </g>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <span v-if="attachmentError" class="composer-status composer-error" role="alert">{{ attachmentError }}</span>
    <span v-else-if="statusText" class="composer-status">{{ statusText }}</span>
    <input ref="fileInputEl" type="file" accept=".md,.markdown,text/markdown,text/plain" multiple hidden @change="onFileChange" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { admitAttachmentSelection } from '../composables/attachmentAdmission'

interface QuestionItem { type: 'choice' | 'input'; label?: string; description?: string; value?: string; placeholder?: string; required?: boolean; showSkip?: boolean; submitLabel?: string }
interface EditDiff { breadcrumb?: string; oldBody?: string; newBody?: string }
// 连锁（Phase 3）：多处受影响段，逐项可勾选。mode=literal(同词)/semantic(措辞不同)；reason=为什么提议改它；checked=默认是否勾。
interface CascadeRow { id: number; breadcrumb?: string; oldBody?: string; newBody?: string; reason?: string; mode?: string; checked?: boolean }
interface DeleteManyRow { id: number; breadcrumb?: string; title?: string; bodyPreview?: string }
interface ModelOption { value: string; label: string; hint?: string }
interface Question { title: string; description?: string; items: QuestionItem[]; diff?: EditDiff; cascade?: CascadeRow[]; deleteMany?: { prefix?: string; items: DeleteManyRow[] } }

const props = withDefaults(defineProps<{
  modelValue: string
  sending?: boolean
  stopping?: boolean
  placeholder?: string
  statusText?: string
  question?: Question | null
  customPlaceholder?: string
  modelOptions?: ModelOption[]
  modelValueId?: string
  modelDisabled?: boolean
}>(), { sending: false, stopping: false, placeholder: '询问任何问题', statusText: '', question: null, customPlaceholder: '或者告诉我该怎么处理…', modelOptions: () => [], modelValueId: '', modelDisabled: false })

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'send', payload: { text: string; files: File[] }): void
  (e: 'answer', value: string): void
  (e: 'stop'): void
  (e: 'model-open'): void
  (e: 'model-change', value: string): void
}>()

const rootEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const attachmentError = ref('')
const menuOpen = ref(false)
const modelMenuOpen = ref(false)
const activeIndex = ref(0)
const customValues = reactive<Record<number, string>>({})
const checkedIds = ref<Set<number>>(new Set())   // 连锁：默认全勾，用户可逐项取消

const isQuestion = computed(() => !!props.question && Array.isArray(props.question.items) && props.question.items.length > 0)
const currentModelLabel = computed(() => props.modelOptions.find(item => item.value === props.modelValueId)?.label || props.modelOptions[0]?.label || '模型')
const cascadeRows = computed<CascadeRow[]>(() => props.question?.cascade || [])
const deleteManyRows = computed<DeleteManyRow[]>(() => props.question?.deleteMany?.items || [])
function toggleCascade(id: number) {
  const s = new Set(checkedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  checkedIds.value = s
}

// 改原文 diff：行级局部 diff（共同前缀/后缀外的中段 = 删/增），给确认前过目。
function lastPath(path?: string): string {
  const parts = String(path || '').split('>').map(s => s.trim()).filter(Boolean)
  return parts[parts.length - 1] || ''
}

function diffLines(oldT?: string, newT?: string): { t: 'ctx' | 'del' | 'add'; text: string }[] {
  const a = String(oldT || '').split('\n'); const b = String(newT || '').split('\n')
  let s = 0; while (s < a.length && s < b.length && a[s] === b[s]) s++
  let e = 0; while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++
  const out: { t: 'ctx' | 'del' | 'add'; text: string }[] = []
  for (let i = 0; i < s; i++) out.push({ t: 'ctx', text: a[i] })
  for (let i = s; i < a.length - e; i++) out.push({ t: 'del', text: a[i] })
  for (let i = s; i < b.length - e; i++) out.push({ t: 'add', text: b[i] })
  for (let i = a.length - e; i < a.length; i++) out.push({ t: 'ctx', text: a[i] })
  return out
}
const sendDisabled = computed(() => props.modelValue.trim().length === 0 && selectedFiles.value.length === 0)

watch(() => props.question, () => {
  activeIndex.value = 0
  menuOpen.value = false
  modelMenuOpen.value = false
  // 连锁默认勾选：字面(checked!==false)默认勾、语义(checked===false)默认不勾，逼你过目。
  checkedIds.value = new Set((props.question?.cascade || []).filter(r => r.checked !== false).map(r => r.id))
  if (isQuestion.value) focusActive()  // 反问一出现就聚焦首项，上下键立即可用
})

function autoGrow() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 170)}px`
}
function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
  nextTick(autoGrow)
}
function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    onSend()
  }
}
function toggleModelMenu() {
  if (props.modelDisabled || props.sending) return
  const opening = !modelMenuOpen.value
  modelMenuOpen.value = opening
  menuOpen.value = false
  if (opening) emit('model-open')
}
function selectModel(value: string) {
  if (!value || props.modelDisabled || props.sending) return
  modelMenuOpen.value = false
  emit('model-change', value)
}

function onSend() {
  if (props.stopping) return
  if (props.sending) { emit('stop'); return }  // T26：处理中按钮=■，点击=停止本轮
  if (sendDisabled.value) return
  emit('send', { text: props.modelValue, files: [...selectedFiles.value] })
  selectedFiles.value = []
  attachmentError.value = ''
  if (fileInputEl.value) fileInputEl.value.value = ''
  nextTick(autoGrow)
}

function pickMarkdown() { menuOpen.value = false; fileInputEl.value?.click() }
function fileKey(f: File) { return `${f.name}-${f.size}-${f.lastModified}` }
function onFileChange() {
  const picked = Array.from(fileInputEl.value?.files || [])
  if (!picked.length) return
  const admission = admitAttachmentSelection(selectedFiles.value, picked)
  selectedFiles.value = admission.files
  attachmentError.value = admission.error
  if (fileInputEl.value) fileInputEl.value.value = ''
}
function removeFile(i: number) {
  selectedFiles.value = selectedFiles.value.filter((_, idx) => idx !== i)
  attachmentError.value = ''
}

function emitAnswer(value: string) {
  // 连锁确认：把勾选的段 id 一并带出（__CASCADE_APPLY__:id,id,…）；没勾任何项就当取消。
  if (cascadeRows.value.length && value === '__APPLY_EDIT__') {
    const ids = [...checkedIds.value]
    value = ids.length ? `__CASCADE_APPLY__:${ids.join(',')}` : '__CANCEL_EDIT__'
  }
  emit('answer', value); customValues[activeIndex.value] = ''
}

function isRequiredInputEmpty(item: QuestionItem, i: number) {
  return item.type === 'input' && item.required === true && !(customValues[i] || '').trim()
}

// 提交按钮（0703 修交互陷阱）：输入框有字 → 提交手输；【为空但高亮着某个选项】→ 等同点击该选项——
// 此前"选中『确认应用』再点提交"会发出空值,确认被静默吞掉(反问收起、什么都没发生)。
// 没高亮任何选项且没输入 → 维持老行为(空值=跳过)。
function submitCustom(i: number) {
  const typed = (customValues[i] || '').trim()
  const item = (props.question?.items || [])[i]
  if (item?.type === 'input' && item.required && !typed) return
  if (typed) { emitAnswer(typed); return }
  const act = (props.question?.items || [])[activeIndex.value]
  if (act && act.type === 'choice') { emitAnswer(act.value || act.label || ''); return }
  emitAnswer('')
}

function onCustomKeydown(e: KeyboardEvent, i: number) {
  if (e.key === 'Enter' && (customValues[i] || '').trim()) { e.preventDefault(); emitAnswer((customValues[i] || '').trim()) }
  if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1) }
}
function moveActive(delta: number) {
  const n = props.question?.items.length || 0
  if (!n) return
  activeIndex.value = Math.max(0, Math.min(n - 1, activeIndex.value + delta))
  focusActive()
}
function focusActive() {
  // 聚焦当前项的可聚焦元素（选项=按钮 / 输入项=input），按 DOM 顺序与 activeIndex 对齐。
  nextTick(() => {
    rootEl.value?.querySelectorAll<HTMLElement>('.choice-row, .custom-input')[activeIndex.value]?.focus()
  })
}
// 文档级键盘：反问出现时，上下键随时可切（不必先点进某个框）。Enter 落在选项按钮上由按钮原生处理。
function onDocKeydown(e: KeyboardEvent) {
  if (!isQuestion.value) return
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const ae = document.activeElement as HTMLElement | null
  if (ae && ae.classList.contains('custom-input')) return  // 在自定义输入框里时交给它自己处理
  e.preventDefault()
  moveActive(e.key === 'ArrowDown' ? 1 : -1)
}

function onDocClick(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) { menuOpen.value = false; modelMenuOpen.value = false }
}
onMounted(() => {
  document.addEventListener('click', onDocClick, true)
  document.addEventListener('keydown', onDocKeydown, true)
  autoGrow()
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick, true)
  document.removeEventListener('keydown', onDocKeydown, true)
})
watch(() => props.modelValue, () => nextTick(autoGrow))
</script>

<style scoped>
.chat-composer { position: relative; display: grid; gap: 6px; width: 100%; }

.composer-shell {
  position: relative; display: grid; gap: 6px; padding: 10px 12px 8px;
  border: 1px solid rgba(15, 15, 15, .1); border-radius: 20px;
  background: #fff;
  /* 组件嵌在已经是白卡的对话区里，不需要 demo 里那种悬浮重阴影（会看着像底下多一层灰）。 */
  box-shadow: 0 1px 2px rgba(17, 24, 39, .04);
}
.composer-shell.is-question { gap: 14px; padding: 18px 20px 14px; }

.question-view { display: grid; gap: 14px; }
.question-title { margin: 0; color: #20242b; font-size: 15px; font-weight: 600; line-height: 1.45; }
.question-description { color: #8d929a; font-size: 13px; line-height: 1.4; }

/* 改原文 diff 预览 */
.edit-diff { border: 1px solid #e4e6ea; border-radius: 10px; overflow: hidden; background: #fcfcfd; }
.edit-diff-bc { padding: 6px 11px; font-size: 11.5px; color: #8d929a; background: #f5f6f8; border-bottom: 1px solid #eceef1; word-break: break-all; }
.edit-diff-body { max-height: 240px; overflow: auto; padding: 6px 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; line-height: 1.6; }
.d-line { padding: 0 11px; white-space: pre-wrap; word-break: break-word; }
.d-ctx { color: #57606a; }
.d-del { background: #ffe9e7; color: #b3261e; }
.d-add { background: #e7f6ea; color: #1a7f37; }
.question-list { display: grid; gap: 4px; }

/* 连锁·多处 diff（逐项勾选） */
.cascade-list { display: grid; gap: 8px; max-height: 340px; overflow: auto; padding: 2px; }
.cascade-row { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 10px; align-items: start; padding: 9px 11px; border: 1px solid #e4e6ea; border-radius: 12px; background: #fcfcfd; cursor: pointer; transition: border-color 140ms ease, background-color 140ms ease, opacity 140ms ease; }
.cascade-row:hover { border-color: #d3d6db; }
.cascade-row.is-checked { border-color: #cfe6d6; background: #fbfefc; }
.cascade-row:not(.is-checked) { opacity: .55; }
.cascade-check { width: 16px; height: 16px; margin-top: 2px; accent-color: #1a7f37; cursor: pointer; }
.cascade-body { display: grid; gap: 5px; min-width: 0; }
.cascade-bc { color: #6b7280; font-size: 11.5px; line-height: 1.5; word-break: break-all; }
.cascade-tag { display: inline-block; font-size: 10px; font-weight: 700; padding: 0 5px; border-radius: 5px; margin-right: 5px; vertical-align: 1px; }
.cascade-tag.sem { color: #9a6700; background: #fdf6e3; }
.cascade-tag.lit { color: #1a7f37; background: #eaf6ec; }
.cascade-reason { color: #9a6700; font-size: 11.5px; line-height: 1.45; }
.cascade-diff { display: grid; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.55; border-radius: 7px; overflow: hidden; }
.cascade-hint { padding: 1px 4px; color: #8d929a; font-size: 12px; }

/* 模块删除确认：高密度清单，危险但克制 */
.delete-many-panel { display: grid; gap: 8px; border: 1px solid #e3e4e8; border-radius: 10px; background: #fff; overflow: hidden; }
.delete-many-head { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: center; padding: 8px 11px; background: #f6f6f7; border-bottom: 1px solid #eceef1; }
.delete-many-head span { color: #b42318; font-size: 12px; font-weight: 700; white-space: nowrap; }
.delete-many-head strong { min-width: 0; color: #3f444c; font-size: 12px; font-weight: 500; word-break: break-all; }
.delete-many-list { display: grid; max-height: 300px; overflow: auto; }
.delete-many-row { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; padding: 9px 11px; border-bottom: 1px solid #f0f1f3; }
.delete-many-row:last-child { border-bottom: 0; }
.delete-mark { align-self: start; margin-top: 1px; width: 32px; height: 18px; display: grid; place-items: center; border-radius: 5px; color: #b42318; background: #fff1f0; border: 1px solid #ffd6d2; font-size: 10px; font-weight: 800; line-height: 1; }
.delete-copy { display: grid; gap: 3px; min-width: 0; }
.delete-copy strong { color: #20242b; font-size: 12.5px; font-weight: 650; line-height: 1.3; }
.delete-copy small { color: #747982; font-size: 11.5px; line-height: 1.4; word-break: break-all; }
.delete-copy em { color: #9a9ea6; font-size: 11.5px; line-height: 1.45; font-style: normal; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

.choice-row {
  display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: 9px;
  min-height: 38px; border: 0; border-radius: 12px; padding: 5px 10px 5px 11px;
  color: #23272f; background: transparent; text-align: left; cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}
.choice-row:hover { background: #f5f5f6; outline: none; }
.choice-row.is-active { background: #ececed; outline: none; }  /* 键盘选中：更深一档 + 右侧 ↑↓，与 hover 区分 */
.choice-number { width: 24px; height: 24px; display: grid; place-items: center; border: 1.5px solid #d8dadd; border-radius: 999px; color: #8c929b; background: #f9fafb; font-size: 12px; font-weight: 600; line-height: 1; }
.choice-row.is-active .choice-number { border-color: #171b21; color: #fff; background: #171b21; }
.choice-copy { min-width: 0; display: grid; gap: 2px; }
.choice-label { min-width: 0; color: inherit; font-size: 14px; font-weight: 500; line-height: 1.35; }
.choice-label :deep(.muted) { color: #8f939a; font-weight: 400; }
.choice-description { color: #92969d; font-size: 11.5px; font-weight: 400; line-height: 1.35; overflow-wrap: anywhere; }
.question-nav { color: #a3a8b0; line-height: 1; white-space: nowrap; display: inline-flex; align-items: center; }

.custom-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 9px; }
.custom-entry { display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; gap: 8px; min-width: 0; border: 1.5px solid transparent; border-radius: 10px; padding: 4px 9px; }
.custom-row.is-active .custom-entry, .custom-entry:focus-within { border-color: #2f8cff; }
.custom-icon { width: 24px; height: 24px; display: grid; place-items: center; border: 1.5px solid #d8dadd; border-radius: 999px; color: #a1a6ae; background: #f9fafb; }
.custom-row.is-active .custom-icon, .custom-entry:focus-within .custom-icon { border-color: #171b21; color: #fff; background: #171b21; }
.custom-icon svg { width: 14px; height: 14px; }
.custom-input { width: 100%; min-width: 0; border: 0; outline: none; color: #20242b; background: transparent; font-size: 14px; font-weight: 400; line-height: 1.35; }
.custom-input::placeholder { color: #969aa1; }

.question-actions { display: flex; align-items: center; gap: 8px; justify-self: end; padding-left: 8px; }
.skip-button, .submit-button { border: 0; border-radius: 999px; padding: 6px 12px; cursor: pointer; font-size: 13px; font-weight: 500; line-height: 1; }
.skip-button { color: #8b9098; background: transparent; }
.skip-button:hover { color: #4b5563; }
.submit-button { display: inline-flex; align-items: center; gap: 7px; color: #fff; background: #171b21; }
.submit-button:hover { background: #030712; }
.submit-button:disabled { cursor: default; color: #9ca3af; background: #eef0f2; }
.enter-mark { width: 18px; height: 18px; }

.attachment-menu {
  position: absolute; left: 0; bottom: calc(100% + 6px); width: min(360px, 100%); max-height: 270px; overflow: hidden;
  padding: 10px; border: 1px solid rgba(229, 231, 235, .92); border-radius: 18px; background: rgba(255, 255, 255, .96);
  box-shadow: 0 18px 48px rgba(17, 24, 39, .13); backdrop-filter: blur(18px);
  opacity: 0; transform: translateY(8px) scale(.98); transform-origin: 28px 100%; pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease; z-index: 6;
}
.attachment-menu.is-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.model-menu {
  position: absolute; right: 0; bottom: calc(100% + 8px); width: 270px; max-width: min(270px, calc(100vw - 32px)); max-height: 260px; overflow: auto;
  padding: 8px; border: 1px solid rgba(229, 231, 235, .92); border-radius: 16px; background: rgba(255, 255, 255, .98);
  box-shadow: 0 18px 48px rgba(17, 24, 39, .13); backdrop-filter: blur(18px);
  opacity: 0; transform: translateY(8px) scale(.98); transform-origin: calc(100% - 28px) 100%; pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease; z-index: 7;
}
.model-menu.is-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.model-menu-head { display: flex; align-items: center; justify-content: space-between; padding: 5px 7px 7px; color: #8a8f98; font-size: 12px; }
.model-menu-head em { font-style: normal; }
.model-menu-item { width: 100%; min-height: 44px; display: grid; grid-template-columns: minmax(0, 1fr) 18px; align-items: center; gap: 8px; padding: 8px 9px; border: 0; border-radius: 11px; background: transparent; color: #171b21; text-align: left; cursor: pointer; }
.model-menu-item:hover { background: #f3f4f6; }
.model-menu-item.active { background: #f0f0f0; }
.model-menu-item:disabled { opacity: .58; cursor: not-allowed; }
.model-menu-item span { min-width: 0; display: grid; gap: 2px; }
.model-menu-item strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; }
.model-menu-item small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #8a8f98; font-size: 11px; }
.model-menu-empty { padding: 14px 8px; color: #8a8f98; font-size: 12px; }
.menu-section { display: grid; gap: 6px; }
.menu-title { padding: 4px 8px; color: #4b5563; font-size: 12px; font-weight: 650; }
.menu-item { width: 100%; display: grid; grid-template-columns: 34px 1fr; align-items: center; gap: 10px; border: 0; border-radius: 12px; padding: 8px; color: #171b21; background: transparent; text-align: left; cursor: pointer; }
.menu-item:hover { background: #f3f4f6; }
.markdown-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: linear-gradient(135deg, rgba(37,99,235,.95), rgba(124,58,237,.92) 52%, rgba(22,163,74,.9)); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.28), 0 8px 18px rgba(37,99,235,.22); }
.markdown-icon svg { width: 24px; height: 24px; }
.item-text { display: grid; gap: 1px; }
.item-text strong { font-size: 13px; font-weight: 700; }
.item-text span { color: #8a8f98; font-size: 12px; }

.normal-view { display: grid; gap: 6px; }
.attachment-list { display: none; flex-wrap: wrap; gap: 6px; align-items: center; min-width: 0; }
.attachment-list.is-visible { display: flex; }
.attachment-chip { display: grid; width: fit-content; max-width: 100%; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 6px 8px 6px 6px; border: 1px solid #e4e6ea; border-radius: 12px; background: #f9fafb; color: #374151; font-size: 12px; }
.chip-icon { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 7px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; font-size: 9px; font-weight: 800; }
.chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip-remove { width: 22px; height: 22px; display: grid; place-items: center; border: 0; border-radius: 999px; color: #6b7280; background: transparent; cursor: pointer; }
.chip-remove:hover { color: #171b21; background: #e5e7eb; }

.input-row { min-height: 40px; }
.composer-input { width: 100%; min-height: 40px; max-height: 170px; resize: none; border: 0; outline: none; overflow: auto; padding: 3px 2px; color: #171b21; background: transparent; font-size: 14px; font-weight: 400; line-height: 1.5; box-sizing: border-box; }
.composer-input::placeholder { font-weight: 400; }
.composer-input::placeholder { color: #9ca3af; }

.composer-actions { min-height: 30px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.model-picker-anchor { position: relative; display: inline-flex; min-width: 0; margin-left: auto; }
.model-picker { max-width: 180px; min-width: 0; height: 28px; display: inline-flex; align-items: center; gap: 5px; padding: 0 7px; border: 0; border-radius: 999px; background: transparent; color: #5f6670; font-size: 12px; cursor: pointer; }
.model-picker:hover, .model-picker[aria-expanded="true"] { background: #f3f4f6; color: #171b21; }
.model-picker:disabled { opacity: .55; cursor: not-allowed; }
.model-picker span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.model-picker svg { flex: 0 0 auto; }
.icon-button { width: 30px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 999px; color: #171b21; background: transparent; cursor: pointer; transition: background-color 140ms ease, color 140ms ease, transform 140ms ease; }
.icon-button svg { width: 22px; height: 22px; color: currentColor; overflow: visible; }
.attach-button:hover, .attach-button[aria-expanded="true"] { background: #f3f4f6; }
.send-button {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 0;
  color: #fff;
  background: #171b21;
}
.send-button svg { display: block; width: 22px; height: 22px; margin: 0; flex: 0 0 auto; }
.send-button:disabled { color: #9ca3af; background: #f3f4f6; cursor: default; }
.send-button:not(:disabled):hover { background: #030712; }
.send-button:not(:disabled):active { transform: scale(.98); }
.send-button.is-sending { color: #fff; background: #1f2937; cursor: pointer; } /* T26:处理中=停止按钮,必须可点 */

.composer-status { padding: 0 6px; color: #8a8f98; font-size: 12px; }
.composer-status.composer-error { color: #b42318; }

/* —— 动效（移植自 motion 组件） —— */
.send-button .orbit { opacity: 0; stroke-dasharray: 30 96; transform-origin: 20px 20px; }
.send-button .arrow-stem, .send-button .arrow-head { transform-origin: 20px 20px; }
.send-button .run-dot { opacity: 0; transform-origin: center; }
.send-button.is-sending .send-arrow-shape { display: none; }
.send-button:not(.is-sending) .send-running-shape { display: none; }
.send-button.is-sending .pause-block { animation: cc-pause-out 1500ms cubic-bezier(.25,.1,.25,1) infinite both; }
.send-button.is-sending .dot-1 { animation: cc-run-dot 1500ms cubic-bezier(.25,.1,.25,1) infinite both; }
.send-button.is-sending .dot-2 { animation: cc-run-dot 1500ms cubic-bezier(.25,.1,.25,1) 90ms infinite both; }
.send-button.is-sending .dot-3 { animation: cc-run-dot 1500ms cubic-bezier(.25,.1,.25,1) 180ms infinite both; }
.send-button:not(:disabled):hover .orbit { animation: cc-orbit 1600ms cubic-bezier(.25,.1,.25,1) infinite both; }
.send-button:not(:disabled):hover .arrow-stem, .send-button:not(:disabled):hover .arrow-head { animation: cc-arrow 1600ms cubic-bezier(.25,.1,.25,1) infinite both; }
.attach-button .upload-file, .attach-button .upload-pin { transform-origin: 20px 20px; }
.attach-button .upload-pin { opacity: 0; }
.attach-button:hover .upload-file, .attach-button[aria-expanded="true"] .upload-file { animation: cc-upfile 1500ms cubic-bezier(.25,.1,.25,1) infinite both; }
.attach-button:hover .upload-pin, .attach-button[aria-expanded="true"] .upload-pin { animation: cc-uppin 1500ms cubic-bezier(.25,.1,.25,1) infinite both; }

@keyframes cc-pause-out { 0%,18% { opacity: 1; transform: scaleX(1); } 34%,72% { opacity: 0; transform: scaleX(.42); } 100% { opacity: 1; transform: scaleX(1); } }
@keyframes cc-run-dot { 0%,18% { opacity: 0; transform: translateY(3px) scale(.72); } 34% { opacity: 1; transform: translateY(0) scale(1); } 50% { opacity: .55; transform: translateY(-2px) scale(.92); } 66% { opacity: 1; transform: translateY(0) scale(1); } 82%,100% { opacity: 0; transform: translateY(3px) scale(.72); } }
@keyframes cc-upfile { 0%,18% { opacity: 1; transform: translateY(0) scale(1); } 34%,72% { opacity: 0; transform: translateY(-2px) scale(.72); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes cc-uppin { 0%,20% { opacity: 0; transform: translate(-1.5px,3px) rotate(-10deg) scale(.72); } 36% { opacity: 1; transform: translate(-1.5px,-1px) rotate(0) scale(1); } 52% { opacity: .78; transform: translate(-1.5px,-2px) rotate(4deg) scale(.96); } 68% { opacity: 1; transform: translate(-1.5px,-1px) rotate(0) scale(1); } 84%,100% { opacity: 0; transform: translate(-1.5px,3px) rotate(-8deg) scale(.72); } }
@keyframes cc-orbit { 0%,18% { opacity: 0; transform: rotate(0); } 26% { opacity: .86; transform: rotate(0); } 78% { opacity: .86; transform: rotate(360deg); } 88%,100% { opacity: 0; transform: rotate(360deg); } }
@keyframes cc-arrow { 0% { opacity: 1; } 22% { opacity: 0; } 72% { opacity: 0; } 90%,100% { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .send-button .pause-block, .send-button .run-dot, .attach-button .upload-file, .attach-button .upload-pin, .send-button .orbit, .send-button .arrow-stem, .send-button .arrow-head { animation: none !important; }
}
</style>
