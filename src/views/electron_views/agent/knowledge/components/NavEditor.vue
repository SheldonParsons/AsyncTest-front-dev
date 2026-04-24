<template>
  <div class="nav-editor">
    <header class="ne-header">
      <div class="ne-title-row">
        <span class="ne-type-badge">导航 · {{ subtypeLabel }}</span>
        <input
          v-model="form.name"
          class="ne-name-input"
          placeholder="节点名称"
          @input="markDirty"
        />
      </div>
      <div class="ne-meta-row">
        <label class="ne-meta">
          <span class="ne-meta-label">导航类型</span>
          <AppSelect
            v-model="form.subtype"
            :options="subtypeOptions"
            @change="markDirty"
          />
        </label>
        <span class="ne-meta ne-meta--readonly">
          <span class="ne-meta-label">所属树</span>
          <span class="ne-meta-value">{{ form.tree === 'asset' ? '资产树' : '业务树' }}</span>
        </span>
        <button
          class="ne-save"
          :disabled="!dirty || saving"
          @click="save"
        >{{ saving ? '保存中…' : (dirty ? '保存' : '已保存') }}</button>
      </div>
    </header>

    <section class="ne-body">
      <div class="ne-section">
        <label class="ne-label">导航说明</label>
        <textarea
          v-model="form.description"
          class="ne-textarea"
          placeholder="描述这个导航的形态、显示位置、激活规则。例如：左侧主菜单，二级展开，激活项高亮。"
          rows="6"
          @input="markDirty"
        />
        <p class="ne-hint">
          nav 节点不承载页面 UI 块，只描述导航的"形态"。具体的菜单项、Tab 项、卡片项请作为子节点添加。
        </p>
      </div>

      <div class="ne-section">
        <label class="ne-label">子节点（导航项）</label>
        <div v-if="children.length === 0" class="ne-empty">
          <p>暂无子节点</p>
          <p class="ne-empty-sub">在左侧侧栏点击 "+" 给当前节点添加子节点，每个子节点对应一个菜单项 / Tab / 卡片。</p>
        </div>
        <ul v-else class="ne-children">
          <li v-for="c in children" :key="c.id" class="ne-child">
            <span class="ne-child-name">{{ c.name }}</span>
            <span class="ne-child-type">{{ typeLabel(c.type) }}</span>
          </li>
        </ul>
      </div>

      <div class="ne-section ne-summary">
        <label class="ne-label">Summary（自动生成）</label>
        <pre v-if="props.node.summary" class="ne-summary-pre">{{ props.node.summary }}</pre>
        <p v-else class="ne-empty-sub">尚未生成 summary。在 Phase 6 / Outline 编译阶段会自动生成目录索引式 summary。</p>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch } from 'vue'
import type { KBNode, KBNavSubtype, KBTreeKind } from '@/types/knowledge'
import { updateNode } from '../api'
import AppSelect from '@/components/common/select/AppSelect.vue'

const props = defineProps<{
  node: KBNode
  kbId: number
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'dirty-changed', dirty: boolean): void
  (e: 'summary-updated'): void
}>()

const NAV_SUBTYPES: { key: KBNavSubtype; label: string }[] = [
  { key: 'menu', label: '菜单' },
  { key: 'tab', label: '标签页' },
  { key: 'card', label: '卡片导航' },
  { key: 'drawer', label: '抽屉' },
  { key: 'section', label: '区段' },
  { key: 'custom', label: '自定义' },
  { key: 'category', label: '分类（资产树）' },
]

const form = reactive({
  name: props.node.name,
  description: props.node.description || '',
  subtype: (props.node.subtype || 'section') as KBNavSubtype,
  tree: (props.node.tree || 'business') as KBTreeKind,
})

const dirty = ref(false)
const saving = ref(false)

const subtypeLabel = computed(() =>
  NAV_SUBTYPES.find(s => s.key === form.subtype)?.label || form.subtype
)

const availableSubtypes = computed(() =>
  form.tree === 'asset'
    ? NAV_SUBTYPES.filter(s => s.key === 'category')
    : NAV_SUBTYPES.filter(s => s.key !== 'category')
)

const subtypeOptions = computed(() =>
  availableSubtypes.value.map(s => ({ value: s.key, label: s.label }))
)

const children = computed(() => props.node.children || [])

function typeLabel(t: string) {
  return ({ page: '页面', module: '模块', nav: '导航', rule: '规则', shared: '共享' } as Record<string, string>)[t] || t
}

function markDirty() {
  if (!dirty.value) {
    dirty.value = true
    emit('dirty-changed', true)
  }
}

watch(() => props.node.id, () => {
  // Switching nodes — reset form from incoming props.
  form.name = props.node.name
  form.description = props.node.description || ''
  form.subtype = (props.node.subtype || 'section') as KBNavSubtype
  form.tree = (props.node.tree || 'business') as KBTreeKind
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
      subtype: form.subtype,
      tree: form.tree,
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

.nav-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif;
  overflow: hidden;
}

.ne-header {
  padding: 16px 24px 12px;
  border-bottom: 1px solid $border;
  display: flex; flex-direction: column; gap: 10px;
  background: #fafafa;
}

.ne-title-row { display: flex; align-items: center; gap: 12px; }
.ne-type-badge {
  padding: 3px 8px; border-radius: 6px;
  background: rgba(108, 99, 255, 0.1); color: #6c63ff;
  font-size: 11px; font-weight: 600; flex-shrink: 0;
}
.ne-name-input {
  flex: 1; min-width: 0;
  font-size: 18px; font-weight: 600; color: $text-primary;
  border: none; background: transparent; outline: none;
  padding: 4px 0;
  &:focus { border-bottom: 1px solid $text-primary; }
}

.ne-meta-row { display: flex; align-items: center; gap: 12px; }
.ne-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.ne-meta-label { color: $text-secondary; font-weight: 500; }
.ne-meta--readonly .ne-meta-value {
  padding: 4px 8px; border-radius: 6px; background: #f0f0f2;
  color: $text-primary; font-size: 12px;
}
.ne-select {
  padding: 4px 8px; border: 1px solid $border; border-radius: 6px;
  font-size: 12px; outline: none; background: #fff; cursor: pointer;
  &:focus { border-color: $text-primary; }
}
.ne-save {
  margin-left: auto;
  padding: 6px 14px; border-radius: 8px; border: none;
  background: $text-primary; color: #fff; font-size: 12.5px; cursor: pointer;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.ne-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 24px; }
.ne-section { display: flex; flex-direction: column; gap: 8px; }
.ne-label {
  font-size: 11.5px; font-weight: 600; color: $text-secondary;
  letter-spacing: 0.4px; text-transform: uppercase;
}
.ne-textarea {
  border: 1px solid $border; border-radius: 8px; padding: 10px 12px;
  font-size: 13px; resize: vertical; line-height: 1.55; outline: none;
  font-family: inherit;
  &:focus { border-color: $text-primary; box-shadow: 0 0 0 3px rgba(29,29,31,0.06); }
}
.ne-hint { margin: 0; font-size: 11.5px; color: $text-secondary; line-height: 1.55; }

.ne-empty { padding: 24px; border: 1px dashed $border; border-radius: 10px; text-align: center; }
.ne-empty p { margin: 0; color: $text-secondary; font-size: 12.5px; }
.ne-empty p + .ne-empty-sub { margin-top: 6px; font-size: 11.5px; }
.ne-empty-sub { color: $text-secondary; font-size: 11.5px; line-height: 1.5; }

.ne-children { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.ne-child {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: #f5f5f7; border-radius: 8px; font-size: 13px;
}
.ne-child-name { flex: 1; color: $text-primary; }
.ne-child-type {
  font-size: 11px; color: $text-secondary;
  padding: 2px 6px; border-radius: 4px; background: rgba(0, 0, 0, 0.05);
}

.ne-summary-pre {
  margin: 0; padding: 12px 14px; background: #f5f5f7; border-radius: 8px;
  font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px;
  color: $text-primary; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
}
</style>
