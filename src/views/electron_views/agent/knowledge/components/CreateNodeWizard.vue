<template>
  <Teleport to="body">
    <div v-if="visible" class="kbw-mask" @click.self="cancel">
      <div class="kbw-dialog">
        <header class="kbw-header">
          <h2 class="kbw-title">{{ titleText }}</h2>
          <p class="kbw-sub">{{ subText }}</p>
        </header>

        <!-- Step 1: choose type -->
        <section v-if="step === 1" class="kbw-body kbw-types">
          <button
            v-for="t in availableTypes"
            :key="t.key"
            :class="['kbw-type', { 'kbw-type--active': form.type === t.key }]"
            @click="pickType(t.key)"
          >
            <div class="kbw-type-ico" v-html="t.icon" />
            <div class="kbw-type-meta">
              <div class="kbw-type-name">{{ t.label }}</div>
              <div class="kbw-type-desc">{{ t.desc }}</div>
            </div>
          </button>
        </section>

        <!-- Step 2: details -->
        <section v-else class="kbw-body kbw-details">
          <div class="kbw-field">
            <label class="kbw-label">名称</label>
            <input
              ref="nameInputRef"
              v-model="form.name"
              class="kbw-input"
              placeholder="输入节点名称"
              @keydown.enter="confirm"
            />
          </div>

          <div v-if="form.type === 'nav'" class="kbw-field">
            <label class="kbw-label">导航类型</label>
            <div class="kbw-chips">
              <button
                v-for="s in availableSubtypes"
                :key="s.key"
                :class="['kbw-chip', { 'kbw-chip--active': form.subtype === s.key }]"
                @click="form.subtype = s.key"
              >{{ s.label }}</button>
            </div>
            <p class="kbw-hint">{{ subtypeHint }}</p>
          </div>

          <div v-if="form.type === 'rule'" class="kbw-field kbw-row">
            <label class="kbw-checkbox">
              <input type="checkbox" v-model="form.expected_inbound" />
              <span>该规则期望被引用（关闭后将不再触发"无入度"提醒）</span>
            </label>
          </div>

          <div v-if="parentName" class="kbw-field">
            <label class="kbw-label">父节点</label>
            <div class="kbw-parent">{{ parentName }}</div>
          </div>
        </section>

        <footer class="kbw-footer">
          <button class="kbw-btn kbw-btn--ghost" @click="cancel">取消</button>
          <button v-if="step === 2" class="kbw-btn kbw-btn--ghost" @click="step = 1">上一步</button>
          <button
            class="kbw-btn kbw-btn--primary"
            :disabled="!canConfirm"
            @click="confirm"
          >{{ step === 1 ? '下一步' : '创建' }}</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, nextTick, watch } from 'vue'
import type { KBNodeType, KBNavSubtype, KBTreeKind } from '@/types/knowledge'

export interface CreateNodeWizardResult {
  name: string
  type: KBNodeType
  subtype: KBNavSubtype | null
  tree: KBTreeKind
  expected_inbound: boolean
}

const visible = ref(false)
const step = ref<1 | 2>(1)
const nameInputRef = ref<HTMLInputElement | null>(null)
const parentName = ref<string>('')
const parentTree = ref<KBTreeKind | null>(null)
const resolveFn = ref<((v: CreateNodeWizardResult | null) => void) | null>(null)

// Remember last picked type per tree, so reopening starts on the previous selection.
const lastTypeByTree: Record<KBTreeKind, KBNodeType | null> = {
  business: null,
  asset: null,
}

const form = reactive({
  type: 'page' as KBNodeType,
  subtype: null as KBNavSubtype | null,
  tree: 'business' as KBTreeKind,
  expected_inbound: true,
  name: '',
})

const TYPES: { key: KBNodeType; label: string; desc: string; icon: string }[] = [
  { key: 'module', label: '模块', desc: '业务大类，组织一组页面', icon: svgFolder() },
  { key: 'page', label: '页面', desc: '具体页面，包含 UI 块', icon: svgPage() },
  { key: 'nav', label: '导航', desc: '菜单/标签/卡片等导航形态', icon: svgNav() },
  { key: 'rule', label: '规则', desc: '可被引用的纯文字规则', icon: svgRule() },
  { key: 'shared', label: '共享', desc: '复用片段（按钮/字段集合）', icon: svgShared() },
]

const NAV_SUBTYPES_BUSINESS: { key: KBNavSubtype; label: string }[] = [
  { key: 'menu', label: '菜单' },
  { key: 'tab', label: '标签页' },
  { key: 'card', label: '卡片导航' },
  { key: 'drawer', label: '抽屉' },
  { key: 'section', label: '区段' },
  { key: 'custom', label: '自定义' },
]
const NAV_SUBTYPES_ASSET: { key: KBNavSubtype; label: string }[] = [
  { key: 'category', label: '分类' },
]

const availableTypes = computed(() => {
  // Asset-tree parent: rule / shared / nav (asset-tree nav is classification only).
  if (parentTree.value === 'asset') {
    return TYPES.filter(t => t.key === 'rule' || t.key === 'shared' || t.key === 'nav')
  }
  // Business-tree parent: page / module / nav. rule & shared belong on the asset tree.
  return TYPES.filter(t => t.key === 'page' || t.key === 'module' || t.key === 'nav')
})

const availableSubtypes = computed(() => {
  return form.tree === 'asset' ? NAV_SUBTYPES_ASSET : NAV_SUBTYPES_BUSINESS
})

const titleText = computed(() => step.value === 1 ? '新建节点' : '填写节点信息')
const subText = computed(() =>
  step.value === 1
    ? '先选择节点类型，决定它在知识库中扮演的角色'
    : '为节点起一个语义清晰的名称'
)

const subtypeHint = computed(() => {
  switch (form.subtype) {
    case 'menu': return '左侧菜单。一个 module 下通常仅一个 menu，子节点为菜单项。'
    case 'tab': return '页面内 Tab 切换，每个 Tab 对应一个子页面/区域。'
    case 'card': return '卡片式导航，常见于 Dashboard。'
    case 'drawer': return '抽屉式弹层，从屏幕侧边滑出。'
    case 'section': return '通用区段，用于分组无明确导航控件的子节点。'
    case 'custom': return '自定义导航形态，请在节点描述中说明交互方式。'
    case 'category': return '资产树分类节点。仅作为人类索引/归类，不会被作为引用目标。'
    default: return '选择一个 nav subtype，可加速元数据查询。'
  }
})

const canConfirm = computed(() => {
  if (step.value === 1) return !!form.type
  if (!form.name.trim()) return false
  if (form.type === 'nav' && !form.subtype) return false
  return true
})

watch(() => form.type, (t) => {
  // Strict tree binding for typed nodes; nav inherits parent tree (no UI override).
  if (t === 'rule' || t === 'shared') form.tree = 'asset'
  else if (t === 'page' || t === 'module') form.tree = 'business'
  else if (t === 'nav') form.tree = parentTree.value || 'business'

  if (t !== 'nav') {
    form.subtype = null
  } else {
    syncNavSubtype()
  }
})

function syncNavSubtype() {
  const allowed = availableSubtypes.value.map(s => s.key)
  if (!form.subtype || !allowed.includes(form.subtype)) {
    form.subtype = allowed[0] || null
  }
}

function pickType(t: KBNodeType) {
  form.type = t
  const tree = parentTree.value || 'business'
  lastTypeByTree[tree] = t
}

function svgFolder() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
}
function svgPage() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 3 14 9 20 9"/></svg>'
}
function svgNav() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="14" y2="18"/></svg>'
}
function svgRule() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12a4 4 0 0 1 0 8H4z"/><path d="M4 12h16a4 4 0 0 1 0 8H4z"/></svg>'
}
function svgShared() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><line x1="8" y1="8" x2="11" y2="16"/><line x1="16" y1="8" x2="13" y2="16"/></svg>'
}

export interface OpenOptions {
  parentName?: string
  parentTree?: KBTreeKind | null
  defaultType?: KBNodeType
  defaultTree?: KBTreeKind
}

function open(opts: OpenOptions = {}): Promise<CreateNodeWizardResult | null> {
  parentName.value = opts.parentName || ''
  parentTree.value = opts.parentTree || null
  // Default type: explicit option > last picked for this tree (if still allowed) > first available.
  const allowed = (parentTree.value === 'asset'
    ? (['rule', 'shared', 'nav'] as KBNodeType[])
    : (['page', 'module', 'nav'] as KBNodeType[]))
  const treeKey: KBTreeKind = parentTree.value || 'business'
  const remembered = lastTypeByTree[treeKey]
  const fallback: KBNodeType =
    (opts.defaultType && allowed.includes(opts.defaultType) && opts.defaultType) ||
    (remembered && allowed.includes(remembered) ? remembered : allowed[0])
  form.type = fallback
  form.subtype = null
  form.tree = opts.defaultTree || (opts.parentTree || 'business')
  form.expected_inbound = true
  form.name = ''
  step.value = 1
  visible.value = true
  return new Promise((resolve) => { resolveFn.value = resolve })
}

function cancel() {
  visible.value = false
  resolveFn.value?.(null)
  resolveFn.value = null
}

function confirm() {
  if (!canConfirm.value) return
  if (step.value === 1) {
    step.value = 2
    nextTick(() => nameInputRef.value?.focus())
    return
  }
  visible.value = false
  resolveFn.value?.({
    name: form.name.trim(),
    type: form.type,
    subtype: form.type === 'nav' ? form.subtype : null,
    tree: form.tree,
    expected_inbound: form.expected_inbound,
  })
  resolveFn.value = null
}

defineExpose({ open })
</script>

<style lang="scss" scoped>
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.55);
$border: rgba(0, 0, 0, 0.08);

.kbw-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.32);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
  backdrop-filter: blur(6px);
}
.kbw-dialog {
  width: 520px; max-width: calc(100vw - 32px);
  background: #fff; border-radius: 14px; padding: 22px 22px 16px;
  box-shadow: 0 12px 60px rgba(0, 0, 0, 0.18);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', sans-serif;
  display: flex; flex-direction: column; gap: 16px;
  max-height: calc(100vh - 80px);
}
.kbw-header { display: flex; flex-direction: column; gap: 4px; }
.kbw-title { margin: 0; font-size: 17px; font-weight: 600; color: $text-primary; letter-spacing: -0.3px; }
.kbw-sub { margin: 0; font-size: 12.5px; color: $text-secondary; }

.kbw-body { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-right: 4px; }
.kbw-types { gap: 8px; }
.kbw-type {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 10px; border: 1px solid $border;
  background: #fafafa; cursor: pointer; transition: all 0.15s; text-align: left;
  &:hover:not(.kbw-type--active) { background: #f0f0f2; border-color: rgba(0,0,0,0.16); }
  &--active, &--active:hover {
    background: #1d1d1f; border-color: #1d1d1f; color: #fff;
    .kbw-type-desc { color: rgba(255,255,255,0.65); }
    .kbw-type-ico { color: #fff; }
  }
}
.kbw-type-ico { color: $text-secondary; flex-shrink: 0; }
.kbw-type-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.kbw-type-name { font-size: 13.5px; font-weight: 600; }
.kbw-type-desc { font-size: 12px; color: $text-secondary; }

.kbw-details { gap: 14px; }
.kbw-field { display: flex; flex-direction: column; gap: 6px; }
.kbw-row { flex-direction: row; align-items: center; }
.kbw-label { font-size: 12px; font-weight: 600; color: $text-secondary; letter-spacing: 0.2px; text-transform: uppercase; }
.kbw-input {
  height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid $border;
  font-size: 13.5px; outline: none; transition: border-color 0.15s, box-shadow 0.15s;
  &:focus { border-color: #1d1d1f; box-shadow: 0 0 0 3px rgba(29,29,31,0.08); }
}
.kbw-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.kbw-chip {
  padding: 5px 10px; border-radius: 999px; border: 1px solid $border;
  background: #fafafa; font-size: 12px; cursor: pointer; transition: all 0.15s;
  &:hover:not(.kbw-chip--active) { background: #f0f0f2; }
  &--active, &--active:hover { background: #1d1d1f; border-color: #1d1d1f; color: #fff; }
}
.kbw-hint { margin: 0; font-size: 11.5px; color: $text-secondary; line-height: 1.45; }
.kbw-checkbox {
  display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: $text-primary; cursor: pointer;
  input { accent-color: #1d1d1f; }
}
.kbw-parent {
  padding: 8px 10px; border-radius: 8px; background: #f5f5f7; font-size: 12.5px; color: $text-primary;
}

.kbw-footer { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; border-top: 1px solid $border; padding-top: 12px; }
.kbw-btn {
  height: 32px; padding: 0 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 12.5px;
  font-weight: 500; transition: opacity 0.15s, background 0.15s;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
.kbw-btn--ghost { background: transparent; color: $text-secondary; &:hover:not(:disabled) { background: #f0f0f2; color: $text-primary; } }
.kbw-btn--primary { background: #1d1d1f; color: #fff; &:hover:not(:disabled) { opacity: 0.9; } }
</style>
