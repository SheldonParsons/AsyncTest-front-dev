<template>
  <div class="kb-expandable-textarea">
    <textarea
      ref="textareaRef"
      :value="modelValue"
      :placeholder="placeholder"
      :style="{ height: currentHeight }"
      @input="onInput"
    />
    <button type="button" @click="toggleExpanded">
      {{ expanded ? '收起' : '展开' }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  collapsedHeight?: number
}>(), {
  placeholder: '',
  collapsedHeight: 64,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const expanded = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const currentHeight = ref(`${props.collapsedHeight}px`)

function updateHeight() {
  const textarea = textareaRef.value
  if (!textarea || !expanded.value) {
    currentHeight.value = `${props.collapsedHeight}px`
    return
  }
  textarea.scrollTop = 0
  currentHeight.value = `${Math.max(textarea.scrollHeight, props.collapsedHeight)}px`
}

function toggleExpanded() {
  expanded.value = !expanded.value
  nextTick(updateHeight)
}

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

watch(() => props.modelValue, () => nextTick(updateHeight))
watch(() => props.collapsedHeight, updateHeight)
</script>

<style lang="scss" scoped>
.kb-expandable-textarea {
  display: flex;
  flex-direction: column;
  gap: 6px;

  textarea {
    width: 100%;
    min-height: 64px;
    border: 1px solid #d8d8de;
    border-radius: 7px;
    padding: 8px 9px;
    background: #fff;
    box-sizing: border-box;
    color: #1d1d1f;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.55;
    outline: none;
    overflow: hidden;
    resize: none;
    transition:
      height .16s ease,
      border-color .16s ease,
      box-shadow .16s ease;

    &:focus {
      border-color: rgba(29, 29, 31, .42);
      box-shadow: 0 0 0 3px rgba(29, 29, 31, .06);
    }
  }

  button {
    align-self: flex-end;
    height: 20px;
    min-width: 42px;
    border: 1px solid rgba(29, 29, 31, .12);
    border-radius: 6px;
    background: rgba(255, 255, 255, .92);
    color: #666;
    font-size: 11px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .05);
    transition:
      background .15s ease,
      color .15s ease,
      border-color .15s ease;

    &:hover {
      background: #1d1d1f;
      border-color: #1d1d1f;
      color: #fff;
    }
  }
}
</style>
