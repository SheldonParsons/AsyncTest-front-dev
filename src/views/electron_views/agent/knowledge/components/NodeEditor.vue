<template>
  <div class="node-editor">
    <!-- Header -->
    <div class="node-editor-header">
      <div class="node-editor-header-left">
        <span :class="['node-type-badge', `node-type-badge--${form.type}`]">{{ typeLabel }}</span>
        <input
          v-model="form.name"
          class="node-name-input"
          placeholder="节点名称"
          @blur="autoSave"
        />
      </div>
      <button class="node-save-btn" @click="save" :disabled="saving">
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </div>

    <!-- Basic Info -->
    <section class="node-section">
      <h3 class="node-section-title">基本信息</h3>
      <div class="node-field-row">
        <div class="node-field">
          <label class="node-field-label">类型</label>
          <select v-model="form.type" class="node-field-select" @change="autoSave">
            <option value="directory">目录</option>
            <option value="page">页面</option>
            <option value="component">组件</option>
            <option value="standalone">独立页面</option>
          </select>
        </div>
      </div>
      <div class="node-field">
        <label class="node-field-label">描述</label>
        <textarea
          v-model="form.description"
          class="node-field-textarea"
          placeholder="描述该节点的用途和内容"
          rows="3"
          @blur="autoSave"
        />
      </div>
    </section>

    <!-- Zones -->
    <section class="node-section">
      <div class="node-section-header">
        <h3 class="node-section-title">页面区域</h3>
        <button class="node-section-add" @click="addZone">+ 添加区域</button>
      </div>
      <div v-if="form.content.zones.length === 0" class="node-section-empty">
        <p>暂无区域定义</p>
      </div>
      <div v-else class="node-zones">
        <div v-for="(zone, i) in form.content.zones" :key="i" class="node-zone-card">
          <div class="node-zone-header">
            <input v-model="zone.name" class="node-zone-name" placeholder="区域名称" @blur="autoSave" />
            <select v-model="zone.type" class="node-zone-type" @change="autoSave">
              <option value="tab">Tab</option>
              <option value="section">Section</option>
              <option value="area">Area</option>
              <option value="toolbar">Toolbar</option>
              <option value="form">Form</option>
              <option value="table">Table</option>
              <option value="custom">Custom</option>
            </select>
            <button class="node-zone-delete" @click="removeZone(i)">×</button>
          </div>
          <textarea
            v-model="zone.description"
            class="node-zone-desc"
            placeholder="区域描述"
            rows="2"
            @blur="autoSave"
          />
          <input v-model="zone.position" class="node-zone-position" placeholder="位置（如：顶部、左侧等）" @blur="autoSave" />
        </div>
      </div>
    </section>

    <!-- Interactions -->
    <section class="node-section">
      <div class="node-section-header">
        <h3 class="node-section-title">交互</h3>
        <button class="node-section-add" @click="addInteraction">+ 添加交互</button>
      </div>
      <div v-if="form.content.interactions.length === 0" class="node-section-empty">
        <p>暂无交互定义</p>
      </div>
      <div v-else class="node-interactions">
        <div v-for="(ix, i) in form.content.interactions" :key="i" class="node-interaction-card">
          <div class="node-interaction-row">
            <input v-model="ix.element" class="node-ix-element" placeholder="触发元素" @blur="autoSave" />
            <select v-model="ix.trigger" class="node-ix-trigger" @change="autoSave">
              <option value="click">点击</option>
              <option value="hover">悬停</option>
              <option value="input">输入</option>
              <option value="submit">提交</option>
              <option value="custom">自定义</option>
            </select>
            <button class="node-zone-delete" @click="removeInteraction(i)">×</button>
          </div>
          <textarea
            v-model="ix.description"
            class="node-ix-desc"
            placeholder="交互描述"
            rows="2"
            @blur="autoSave"
          />
        </div>
      </div>
    </section>

    <!-- Business Rules -->
    <section class="node-section">
      <h3 class="node-section-title">业务规则</h3>
      <textarea
        v-model="form.content.business_rules"
        class="node-field-textarea node-field-textarea--tall"
        placeholder="描述业务规则、校验逻辑、权限控制等"
        rows="5"
        @blur="autoSave"
      />
    </section>

    <!-- Notes -->
    <section class="node-section">
      <h3 class="node-section-title">补充说明</h3>
      <textarea
        v-model="form.content.notes"
        class="node-field-textarea"
        placeholder="其他补充信息"
        rows="3"
        @blur="autoSave"
      />
    </section>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, watch, computed } from 'vue'
import { updateNode } from '../api'
import type { KBNode, KBNodeContent, KBZone, KBInteraction } from '@/types/knowledge'

const props = defineProps<{
  node: KBNode
  kbId: number
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const saving = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

const form = reactive({
  name: '',
  type: 'page' as string,
  description: '',
  content: {
    zones: [] as KBZone[],
    interactions: [] as KBInteraction[],
    business_rules: '',
    notes: '',
  } as KBNodeContent,
})

const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    directory: '目录',
    page: '页面',
    component: '组件',
    standalone: '独立',
  }
  return labels[form.type] || form.type
})

watch(() => props.node, (n) => {
  form.name = n.name
  form.type = n.type || 'page'
  form.description = n.description || ''
  form.content = {
    zones: n.content?.zones ? JSON.parse(JSON.stringify(n.content.zones)) : [],
    interactions: n.content?.interactions ? JSON.parse(JSON.stringify(n.content.interactions)) : [],
    business_rules: n.content?.business_rules || '',
    notes: n.content?.notes || '',
  }
}, { immediate: true })

function autoSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => save(), 1000)
}

async function save() {
  if (saveTimer) clearTimeout(saveTimer)
  saving.value = true
  try {
    await updateNode(props.kbId, props.node.id, {
      name: form.name,
      type: form.type,
      description: form.description,
      content: form.content,
    })
    emit('saved')
  } catch (e: any) {
    window.$toast({ title: e.message || '保存失败', type: 'error' })
  } finally {
    saving.value = false
  }
}

function addZone() {
  form.content.zones.push({
    id: crypto.randomUUID(),
    name: '',
    type: 'section',
    description: '',
    position: '',
    fields: [],
  })
}

function removeZone(i: number) {
  form.content.zones.splice(i, 1)
  autoSave()
}

function addInteraction() {
  form.content.interactions.push({
    id: crypto.randomUUID(),
    element: '',
    trigger: 'click',
    description: '',
    result: { type: 'action' },
  })
}

function removeInteraction(i: number) {
  form.content.interactions.splice(i, 1)
  autoSave()
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

.node-editor {
  padding: 28px 36px;
  max-width: 760px;
}

.node-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.node-editor-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.node-type-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 5px;
  letter-spacing: -0.08px;
  white-space: nowrap;
  background: $bg-sidebar;
  color: $text-secondary;
}

.node-name-input {
  flex: 1;
  border: none;
  font-size: 22px;
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

.node-save-btn {
  padding: 7px 18px;
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

// Sections
.node-section {
  margin-bottom: 28px;
}

.node-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.node-section-title {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

.node-section-add {
  border: none;
  background: transparent;
  font-size: 12px;
  color: $accent;
  cursor: pointer;
  padding: 0;
  margin-bottom: 12px;
  transition: opacity 0.12s;
  letter-spacing: -0.12px;

  &:hover {
    opacity: 0.7;
  }
}

.node-section-empty {
  padding: 20px;
  border-radius: 8px;
  background: $bg-sidebar;
  text-align: center;

  p {
    margin: 0;
    font-size: 13px;
    color: $text-tertiary;
  }
}

// Fields
.node-field-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.node-field {
  flex: 1;
  margin-bottom: 12px;
}

.node-field-label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  letter-spacing: -0.12px;
}

.node-field-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid $border-color;
  border-radius: 8px;
  font-size: 13px;
  color: $text-primary;
  background: $bg-sidebar;
  outline: none;
  font-family: inherit;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;

  &:focus {
    border-color: $accent;
    background: $bg-page;
  }
}

.node-field-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid $border-color;
  border-radius: 8px;
  font-size: 13px;
  color: $text-primary;
  background: $bg-sidebar;
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
  letter-spacing: -0.12px;
  transition: border-color 0.15s, background 0.15s;

  &:focus {
    border-color: $accent;
    background: $bg-page;
  }

  &--tall {
    min-height: 100px;
  }

  &::placeholder {
    color: $text-tertiary;
  }
}

// Zone cards
.node-zones {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.node-zone-card {
  padding: 14px;
  border-radius: 10px;
  background: $bg-sidebar;
}

.node-zone-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.node-zone-name {
  flex: 1;
  border: none;
  border-bottom: 1px solid transparent;
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
  background: transparent;
  outline: none;
  padding: 2px 0;
  font-family: inherit;

  &:focus {
    border-bottom-color: $accent;
  }

  &::placeholder {
    color: $text-tertiary;
  }
}

.node-zone-type {
  padding: 4px 8px;
  border: 1px solid $border-color;
  border-radius: 5px;
  font-size: 11px;
  color: $text-secondary;
  background: $bg-page;
  outline: none;
  font-family: inherit;
}

.node-zone-delete {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: $text-tertiary;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;

  &:hover {
    background: rgba(255, 59, 48, 0.08);
    color: #ff3b30;
  }
}

.node-zone-desc {
  width: 100%;
  border: none;
  font-size: 12px;
  color: $text-primary;
  background: transparent;
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  margin-bottom: 6px;
  box-sizing: border-box;

  &::placeholder {
    color: $text-tertiary;
  }
}

.node-zone-position {
  width: 100%;
  border: none;
  border-bottom: 1px solid $border-color;
  font-size: 12px;
  color: $text-secondary;
  background: transparent;
  outline: none;
  padding: 4px 0;
  box-sizing: border-box;
  font-family: inherit;

  &:focus {
    border-bottom-color: $accent;
  }

  &::placeholder {
    color: $text-tertiary;
  }
}

// Interaction cards
.node-interactions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.node-interaction-card {
  padding: 12px;
  border-radius: 8px;
  background: $bg-sidebar;
}

.node-interaction-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.node-ix-element {
  flex: 1;
  border: none;
  border-bottom: 1px solid transparent;
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;
  background: transparent;
  outline: none;
  padding: 2px 0;
  font-family: inherit;

  &:focus {
    border-bottom-color: $accent;
  }

  &::placeholder {
    color: $text-tertiary;
  }
}

.node-ix-trigger {
  padding: 4px 8px;
  border: 1px solid $border-color;
  border-radius: 5px;
  font-size: 11px;
  color: $text-secondary;
  background: $bg-page;
  outline: none;
  font-family: inherit;
}

.node-ix-desc {
  width: 100%;
  border: none;
  font-size: 12px;
  color: $text-primary;
  background: transparent;
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;

  &::placeholder {
    color: $text-tertiary;
  }
}
</style>
