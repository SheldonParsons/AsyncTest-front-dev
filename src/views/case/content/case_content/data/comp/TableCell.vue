<template>
  <div
    class="ast-cell"
    :class="{ 'ast-cell--focus': isFocused }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <textarea
      ref="inputRef"
      class="ast-cell-input"
      :class="{ 'ast-cell-input--single': singleLine }"
      v-model="localValue"
      spellcheck="false"
      rows="1"
      @focus="isFocused = true"
      @blur="onBlur"
      @keydown="onKeydown"
    />

    <!-- expand to EditValue, only for data columns (not singleLine) -->
    <button
      v-if="!singleLine"
      v-show="isHovered || isFocused"
      class="ast-cell-expand"
      tabindex="-1"
      @mousedown.prevent
      @click.stop="openExpand"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
      </svg>
    </button>

    <EditValue
      ref="editValueRef"
      :env_name="envName"
      @add_code="onCodeAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import EditValue from '@/views/api/child_component/edit_value.vue'

const props = defineProps<{
  value: { id: number; data: string } | null
  singleLine?: boolean
  envName?: string
}>()

const emit = defineEmits<{
  update: [value: { id: number; data: string }]
  tab: [e: KeyboardEvent]
  enter: [e: KeyboardEvent]
}>()

const inputRef = ref<HTMLTextAreaElement>()
const editValueRef = ref<any>(null)
const localValue = ref(props.value?.data ?? '')
const isFocused = ref(false)
const isHovered = ref(false)

// Sync when external value changes (e.g. after batch edit), but don't disrupt typing
watch(() => props.value?.data, (newVal) => {
  if (!isFocused.value) {
    localValue.value = newVal ?? ''
    nextTick(resizeTextarea)
  }
})

watch(localValue, () => {
  nextTick(resizeTextarea)
})

onMounted(() => {
  resizeTextarea()
})

function onBlur() {
  isFocused.value = false
  resizeTextarea()
  if (props.value && localValue.value !== props.value.data) {
    emit('update', { ...props.value, data: localValue.value })
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    e.preventDefault()
    emit('tab', e)
  } else if (e.key === 'Enter') {
    // Enter 默认切换到下一行；Alt/Option + Enter 保留在单元格内换行
    if (!e.altKey) {
      e.preventDefault()
      emit('enter', e)
    }
  } else if (e.key === 'Escape') {
    localValue.value = props.value?.data ?? ''
    inputRef.value?.blur()
  }
}

function openExpand() {
  if (!editValueRef.value) return
  editValueRef.value.open_dialog()
  editValueRef.value.set_code(localValue.value)
}

function onCodeAdded(content: string) {
  localValue.value = content
  if (props.value) {
    emit('update', { ...props.value, data: content })
  }
}

function resizeTextarea() {
  const el = inputRef.value
  if (!el) return
  if (props.singleLine) {
    el.style.height = '36px'
    return
  }
  el.style.height = '36px'
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
})
</script>

<style lang="scss" scoped>
.ast-cell {
  position: relative;
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 3px 5px;
  box-sizing: border-box;
}

.ast-cell-input {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: none;
  background: transparent;
  font-size: 13px;
  font-family: inherit;
  color: #0f172a;
  padding: 8px 32px 8px 9px;
  resize: none;
  line-height: 1.5;
  box-sizing: border-box;
  min-height: 36px;
  max-height: 140px;
  overflow-y: auto;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 2px;
  }
}

// Single-line mode: clamp to one line
.ast-cell-input--single {
  white-space: nowrap;
  overflow: hidden;
  resize: none;
  max-height: 36px;
  min-height: 36px;
}

.ast-cell--focus .ast-cell-input {
  background: #ffffff;
  border-color: rgba(99, 102, 241, 0.26);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
}

.ast-cell:hover .ast-cell-input {
  background: rgba(248, 250, 252, 0.95);
}

.ast-cell-expand {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.96);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  padding: 0;
  flex-shrink: 0;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: #ffffff;
    color: #111827;
    border-color: rgba(99, 102, 241, 0.24);
  }
}
</style>
