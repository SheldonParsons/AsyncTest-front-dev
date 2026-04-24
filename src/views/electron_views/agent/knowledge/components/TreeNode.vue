<template>
  <div class="tree-node">
    <div
      :class="['tree-node-row', `tree-node-row--${node.type}`, {
        'tree-node-row--selected': selectedId === node.id,
      }]"
      :style="{ paddingLeft: `${depth * 20 + 12}px` }"
      @click="$emit('select', node.id)"
      @contextmenu.prevent="showContext = !showContext"
    >
      <!-- Expand toggle: only show chevron when node has actual children -->
      <button
        v-if="hasChildren"
        class="tree-node-toggle"
        @click.stop="expanded = !expanded"
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
          :class="{ 'tree-node-chevron--open': expanded }"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <span v-else class="tree-node-dot" />

      <!-- Icon: type-aware -->
      <span :class="['tree-node-icon', `tree-node-icon--${node.type}`]" v-html="typeIcon" />

      <!-- Name -->
      <span class="tree-node-name">{{ node.name }}</span>

      <!-- Type badge: nav subtype 中文 / module 标识 / rule / shared -->
      <span v-if="node.type === 'nav' && node.subtype" class="tree-node-badge">{{ navSubtypeLabel }}</span>
      <span v-else-if="node.type === 'module'" class="tree-node-badge tree-node-badge--module">模块</span>
      <span v-else-if="node.type === 'rule'" class="tree-node-badge tree-node-badge--rule">规则</span>
      <span v-else-if="node.type === 'shared'" class="tree-node-badge tree-node-badge--shared">共享</span>
      <!-- Rule no-inbound warn -->
      <span
        v-if="node.type === 'rule' && node.expected_inbound !== false && stale"
        class="tree-node-badge tree-node-badge--warn"
        title="期望被引用但当前无入度"
      >!</span>

      <!-- Context actions (on hover) -->
      <div class="tree-node-actions">
        <button class="tree-node-action" @click.stop="$emit('rename', node.id)" title="重命名">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button v-if="canHaveChildren" class="tree-node-action" @click.stop="$emit('add-child', node.id)" title="添加子节点">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button class="tree-node-action tree-node-action--danger" @click.stop="$emit('delete', node.id)" title="删除">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Children -->
    <div v-if="canHaveChildren && expanded && node.children?.length" class="tree-node-children">
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        @select="$emit('select', $event)"
        @add-child="$emit('add-child', $event)"
        @rename="$emit('rename', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import type { KBNode } from '@/types/knowledge'

const props = defineProps<{
  node: KBNode
  depth: number
  selectedId: string | null
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'add-child', parentId: string): void
  (e: 'rename', id: string): void
  (e: 'delete', id: string): void
}>()

const expanded = ref(true)
const showContext = ref(false)
const hasChildren = computed(() => !!(props.node.children && props.node.children.length > 0))

// Phase 4.7 — only `rule` is leaf-only. All other types may have children.
const canHaveChildren = computed(() => props.node.type !== 'rule')

// Phase 4.7 — rule "stale" indicator: expected to be referenced but currently
// has no inbound. Backend computes inbound count; until that lands, we proxy
// using sort_order < 0 sentinel (TODO: replace with real inbound_count field).
const stale = computed(() => false)

const TYPE_ICONS: Record<string, string> = {
  module:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  page:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 3 14 9 20 9"/></svg>',
  nav:       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="14" y2="18"/></svg>',
  rule:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12a4 4 0 0 1 0 8H4z"/><path d="M4 12h16a4 4 0 0 1 0 8H4z"/></svg>',
  shared:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><line x1="8" y1="8" x2="11" y2="16"/><line x1="16" y1="8" x2="13" y2="16"/></svg>',
  directory: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
}
const typeIcon = computed(() => TYPE_ICONS[props.node.type] || TYPE_ICONS.page)

const NAV_SUBTYPE_LABELS: Record<string, string> = {
  menu: '菜单',
  tab: '标签页',
  card: '卡片',
  drawer: '抽屉',
  section: '区段',
  custom: '自定义',
  category: '分类',
}
const navSubtypeLabel = computed(() =>
  props.node.subtype ? (NAV_SUBTYPE_LABELS[props.node.subtype] || props.node.subtype) : ''
)
</script>

<style lang="scss" scoped>
$bg-hover: #eaeaec;
$bg-active: #e3e3e6;
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.55);
$text-tertiary: rgba(0, 0, 0, 0.35);

.tree-node-row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding-right: 8px;
  border-radius: 8px;
  margin: 1px 4px;
  cursor: pointer;
  transition: background 0.12s;
  position: relative;

  &:hover {
    background: $bg-hover;

    .tree-node-actions {
      display: flex;
    }
  }

  &--selected {
    background: $bg-active;
  }
}

.tree-node-toggle {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: $text-tertiary;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;

  svg {
    transition: transform 0.15s;
  }

  .tree-node-chevron--open {
    transform: rotate(90deg);
  }
}

.tree-node-dot {
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &::after {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.15);
  }
}

.tree-node-icon {
  display: flex;
  align-items: center;
  color: $text-primary;
  flex-shrink: 0;
}

.tree-node-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
  font-weight: 500;
  flex-shrink: 0;
  letter-spacing: 0.2px;

  &--module {
    background: rgba(108, 99, 255, 0.12);
    color: #6c63ff;
  }

  &--rule {
    background: rgba(217, 119, 6, 0.12);
    color: #d97706;
  }

  &--shared {
    background: rgba(5, 150, 105, 0.12);
    color: #059669;
  }

  &--warn {
    background: rgba(255, 149, 0, 0.16);
    color: #d97706;
    font-weight: 700;
    padding: 1px 6px;
  }
}

.tree-node-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.12px;
}

.tree-node-actions {
  display: none;
  gap: 2px;
  flex-shrink: 0;
}

.tree-node-action {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  padding: 0;
  transition: background 0.1s, color 0.1s;

  &:hover {
    background: rgba(0, 0, 0, 0.07);
    color: $text-primary;
  }

  &--danger:hover {
    color: #ff3b30;
    background: rgba(255, 59, 48, 0.08);
  }
}
</style>
