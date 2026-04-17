<template>
  <div class="tmpl-editor">
    <div class="tmpl-editor-header">
      <input
        v-model="form.name"
        class="tmpl-name-input"
        placeholder="模板名称"
        @blur="autoSave"
      />
      <select v-model="form.type" class="tmpl-type-select" @change="autoSave">
        <option value="prompt">提示词</option>
        <option value="rule">规则</option>
        <option value="format">格式</option>
      </select>
      <div class="tmpl-editor-actions">
        <button class="tmpl-save-btn" @click="save" :disabled="saving">
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <button class="tmpl-delete-btn" @click="handleDelete">删除</button>
      </div>
    </div>

    <textarea
      v-model="form.content"
      class="tmpl-content-area"
      placeholder="在此编辑模板内容…"
      @blur="autoSave"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, watch } from 'vue'
import { updateTemplate } from '../api'
import type { KBTemplate } from '@/types/knowledge'

const props = defineProps<{
  template: KBTemplate
  kbId: number
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'deleted'): void
  (e: 'confirm-delete', tmpl: KBTemplate): void
}>()

const saving = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

const form = reactive({
  name: '',
  type: 'prompt' as string,
  content: '',
})

watch(() => props.template, (t) => {
  form.name = t.name
  form.type = t.type || 'prompt'
  form.content = t.content || ''
}, { immediate: true })

function autoSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => save(), 1000)
}

async function save() {
  if (saveTimer) clearTimeout(saveTimer)
  saving.value = true
  try {
    await updateTemplate(props.kbId, props.template.id, {
      name: form.name,
      type: form.type,
      content: form.content,
    })
    emit('saved')
  } catch (e: any) {
    window.$toast({ title: e.message || '保存失败', type: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  emit('confirm-delete', props.template)
}
</script>

<style lang="scss" scoped>
$bg-page: #ffffff;
$bg-sidebar: #f5f5f7;
$bg-hover: #eaeaec;
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.55);
$text-tertiary: rgba(0, 0, 0, 0.35);
$border-color: rgba(0, 0, 0, 0.08);
$accent: #1d1d1f;

.tmpl-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 28px 36px;
}

.tmpl-editor-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.tmpl-name-input {
  flex: 1;
  border: none;
  font-size: 20px;
  font-weight: 600;
  color: $text-primary;
  background: transparent;
  outline: none;
  letter-spacing: -0.374px;
  font-family: inherit;

  &::placeholder {
    color: $text-tertiary;
  }
}

.tmpl-type-select {
  padding: 6px 10px;
  border: 1px solid $border-color;
  border-radius: 8px;
  font-size: 12px;
  color: $text-secondary;
  background: $bg-sidebar;
  outline: none;
  font-family: inherit;

  &:focus {
    border-color: $accent;
  }
}

.tmpl-editor-actions {
  display: flex;
  gap: 6px;
}

.tmpl-save-btn {
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  background: $accent;
  color: #ffffff;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: opacity 0.15s;
  letter-spacing: -0.12px;

  &:hover:not(:disabled) {
    opacity: 0.88;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.tmpl-delete-btn {
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  background: $bg-sidebar;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(255, 59, 48, 0.08);
    color: #ff3b30;
  }
}

.tmpl-content-area {
  flex: 1;
  width: 100%;
  padding: 16px;
  border: 1px solid $border-color;
  border-radius: 10px;
  font-size: 14px;
  color: $text-primary;
  background: $bg-sidebar;
  outline: none;
  resize: none;
  font-family: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.6;
  box-sizing: border-box;
  letter-spacing: -0.12px;
  transition: border-color 0.15s, background 0.15s;

  &:focus {
    border-color: $accent;
    background: $bg-page;
  }

  &::placeholder {
    color: $text-tertiary;
  }
}
</style>
