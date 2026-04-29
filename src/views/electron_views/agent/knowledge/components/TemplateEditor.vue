<template>
  <div class="tmpl-editor">
    <div class="tmpl-editor-header">
      <input
        v-model="form.name"
        class="tmpl-name-input"
        placeholder="Prompt 模板名称"
        @blur="autoSave"
      />
      <CustomSelect v-model="form.type" class="tmpl-type-select" :options="typeOptions" size="sm" @change="autoSave" />
      <CustomSelect v-model="form.kind" class="tmpl-type-select" :options="kindOptions" size="sm" @change="autoSave" />
      <CustomSelect v-model="form.target" class="tmpl-target-select" :options="targetOptions" size="sm" @change="autoSave" />
      <CustomSelect v-model="form.status" class="tmpl-type-select" :options="statusOptions" size="sm" @change="autoSave" />
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
      placeholder="在此编辑 Prompt 模板内容。可使用 {{name}} 这样的变量占位。"
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

const typeOptions = [
  { value: 'prompt', label: 'Prompt' },
  { value: 'rule', label: '规则' },
  { value: 'format', label: '格式' },
]

const kindOptions = [
  { value: 'text', label: '文本型' },
  { value: 'form', label: '表单型' },
]

const targetOptions = [
  { value: 'block_knowledge_description', label: '块知识描述' },
  { value: 'navigation_description', label: '导航说明' },
  { value: 'node_description', label: '节点说明' },
]

const statusOptions = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' },
]

const form = reactive({
  name: '',
  type: 'prompt' as string,
  kind: 'text' as 'text' | 'form',
  target: 'block_knowledge_description',
  status: 'enabled',
  content: '',
})

watch(() => props.template, (t) => {
  form.name = t.name
  form.type = t.type || 'prompt'
  form.kind = t.kind || 'text'
  form.target = t.target || 'block_knowledge_description'
  form.status = t.status || 'enabled'
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
      kind: form.kind,
      target: form.target,
      status: form.status,
      schema: props.template.schema || {},
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

.tmpl-type-select,
.tmpl-target-select {
  flex-shrink: 0;
  width: 96px;
}

.tmpl-target-select {
  width: 144px;
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
