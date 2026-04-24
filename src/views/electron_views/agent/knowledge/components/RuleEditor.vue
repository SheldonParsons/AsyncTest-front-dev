<template>
  <div class="rule-editor">
    <header class="re-header">
      <div class="re-title-row">
        <span :class="['re-type-badge', `re-type-badge--${props.node.type}`]">
          {{ props.node.type === 'rule' ? '规则' : '共享' }}
        </span>
        <input
          v-model="form.name"
          class="re-name-input"
          placeholder="节点名称"
          @input="markDirty"
        />
      </div>
      <div class="re-meta-row">
        <span class="re-tree-tag">资产树</span>
        <label v-if="props.node.type === 'rule'" class="re-checkbox">
          <input type="checkbox" v-model="form.expected_inbound" @change="markDirty" />
          <span>期望被引用</span>
        </label>
        <span v-if="!form.expected_inbound && props.node.type === 'rule'" class="re-warn-tag">
          已关闭入度提醒
        </span>
        <button
          class="re-save"
          :disabled="!dirty || saving"
          @click="save"
        >{{ saving ? '保存中…' : (dirty ? '保存' : '已保存') }}</button>
      </div>
    </header>

    <section class="re-body">
      <label class="re-label">规则内容（Markdown）</label>
      <textarea
        v-model="form.description"
        class="re-textarea"
        :placeholder="placeholderText"
        @input="markDirty"
      />
      <p class="re-hint">{{ hintText }}</p>

      <div v-if="props.node.summary" class="re-summary">
        <label class="re-label">Summary（自动生成）</label>
        <pre class="re-summary-pre">{{ props.node.summary }}</pre>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch } from 'vue'
import type { KBNode } from '@/types/knowledge'
import { updateNode } from '../api'

const props = defineProps<{
  node: KBNode
  kbId: number
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'dirty-changed', dirty: boolean): void
  (e: 'summary-updated'): void
}>()

const form = reactive({
  name: props.node.name,
  description: props.node.description || '',
  expected_inbound: props.node.expected_inbound !== false,
})

const dirty = ref(false)
const saving = ref(false)

const placeholderText = computed(() => {
  if (props.node.type === 'rule') {
    return `# ${props.node.name}\n\n约束：\n- ...\n\n示例：\n- 合法：...\n- 非法：...`
  }
  return `# ${props.node.name}\n\n描述这个共享片段的用途、字段构成、复用场景。`
})

const hintText = computed(() => {
  if (props.node.type === 'rule') {
    return '规则节点是纯文字的可引用单元。其他节点可通过引用机制使用本规则。建议格式：约束 → 示例 → 反例。'
  }
  return '共享节点用于组合可复用的片段（如公共字段集合、按钮组）。在 Phase 6 / Outline 编译阶段会作为引用目标参与展开。'
})

function markDirty() {
  if (!dirty.value) {
    dirty.value = true
    emit('dirty-changed', true)
  }
}

watch(() => props.node.id, () => {
  form.name = props.node.name
  form.description = props.node.description || ''
  form.expected_inbound = props.node.expected_inbound !== false
  dirty.value = false
  emit('dirty-changed', false)
})

async function save() {
  if (!dirty.value || saving.value) return
  saving.value = true
  try {
    await updateNode(props.kbId, props.node.id, {
      name: form.name.trim() || props.node.name,
      description: form.description,
      expected_inbound: form.expected_inbound,
    })
    dirty.value = false
    emit('dirty-changed', false)
    emit('saved')
    window.$toast?.({ title: '已保存', type: 'success' })
  } catch (e: any) {
    window.$toast?.({ title: e.message || '保存失败', type: 'error' })
  } finally {
    saving.value = false
  }
}

defineExpose({ save })
</script>

<style lang="scss" scoped>
$border: rgba(0, 0, 0, 0.08);
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.55);

.rule-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif;
  overflow: hidden;
}

.re-header {
  padding: 16px 24px 12px;
  border-bottom: 1px solid $border;
  display: flex; flex-direction: column; gap: 10px;
  background: #fafafa;
}

.re-title-row { display: flex; align-items: center; gap: 12px; }
.re-type-badge {
  padding: 3px 8px; border-radius: 6px;
  font-size: 11px; font-weight: 600; flex-shrink: 0;
  &--rule { background: rgba(255, 149, 0, 0.12); color: #d97706; }
  &--shared { background: rgba(52, 199, 89, 0.12); color: #059669; }
}
.re-name-input {
  flex: 1; min-width: 0;
  font-size: 18px; font-weight: 600; color: $text-primary;
  border: none; background: transparent; outline: none;
  padding: 4px 0;
  &:focus { border-bottom: 1px solid $text-primary; }
}

.re-meta-row { display: flex; align-items: center; gap: 12px; font-size: 12px; }
.re-tree-tag {
  padding: 3px 8px; border-radius: 6px;
  background: rgba(0, 0, 0, 0.05); color: $text-secondary;
  font-size: 11px; font-weight: 500;
}
.re-checkbox {
  display: flex; align-items: center; gap: 6px; cursor: pointer; color: $text-primary;
  input { accent-color: #1d1d1f; }
}
.re-warn-tag {
  padding: 3px 8px; border-radius: 6px;
  background: rgba(255, 149, 0, 0.12); color: #d97706;
  font-size: 11px; font-weight: 500;
}
.re-save {
  margin-left: auto;
  padding: 6px 14px; border-radius: 8px; border: none;
  background: $text-primary; color: #fff; font-size: 12.5px; cursor: pointer;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.re-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; }
.re-label {
  font-size: 11.5px; font-weight: 600; color: $text-secondary;
  letter-spacing: 0.4px; text-transform: uppercase;
}
.re-textarea {
  flex: 1; min-height: 320px;
  border: 1px solid $border; border-radius: 8px; padding: 12px 14px;
  font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 13px;
  line-height: 1.6; outline: none; resize: vertical;
  &:focus { border-color: $text-primary; box-shadow: 0 0 0 3px rgba(29,29,31,0.06); }
}
.re-hint { margin: 0; font-size: 11.5px; color: $text-secondary; line-height: 1.55; }
.re-summary { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.re-summary-pre {
  margin: 0; padding: 12px 14px; background: #f5f5f7; border-radius: 8px;
  font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px;
  color: $text-primary; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
}
</style>
