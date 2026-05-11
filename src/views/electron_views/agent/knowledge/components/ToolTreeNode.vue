<template>
  <div class="tool-tree-node">
    <div
      :class="['tool-tree-node-row', `tool-tree-node-row--${node.node_type}`, {
        'tool-tree-node-row--selected': selectedId === node.id,
      }]"
      :style="{ paddingLeft: `${depth * 20 + 12}px` }"
      @click="$emit('select', node.id)"
    >
      <button
        v-if="hasChildren"
        class="tool-tree-node-toggle"
        @click.stop="expanded = !expanded"
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
          :class="{ 'tool-tree-node-chevron--open': expanded }"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <span v-else class="tool-tree-node-dot" />

      <span :class="['tool-tree-node-icon', `tool-tree-node-icon--${node.node_type}`]" v-html="typeIcon" />
      <span class="tool-tree-node-name">{{ node.name }}</span>

      <span v-if="node.node_type === 'folder'" class="tool-tree-node-badge">目录</span>
      <span v-else class="tool-tree-node-badge tool-tree-node-badge--tool">Python</span>
      <span v-if="node.node_type === 'tool' && node.tool?.enabled === false" class="tool-tree-node-badge tool-tree-node-badge--disabled">禁用</span>
      <span v-if="node.summary_stale" class="tool-tree-node-badge tool-tree-node-badge--warn">陈旧</span>

      <div class="tool-tree-node-actions">
        <button
          v-if="node.node_type === 'folder'"
          class="tool-tree-node-action"
          title="添加目录"
          @click.stop="$emit('add-folder', node.id)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/>
          </svg>
        </button>
        <button
          v-if="node.node_type === 'folder'"
          class="tool-tree-node-action"
          title="添加 Tools"
          @click.stop="$emit('add-tool', node.id)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 9h8"/><path d="M8 13h6"/><path d="M10 3h4"/><rect x="5" y="5" width="14" height="16" rx="2"/>
            <line x1="17" y1="14" x2="17" y2="20"/><line x1="14" y1="17" x2="20" y2="17"/>
          </svg>
        </button>
        <button
          class="tool-tree-node-action tool-tree-node-action--danger"
          title="删除"
          @click.stop="$emit('delete', node.id)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="expanded && node.children?.length" class="tool-tree-node-children">
      <ToolTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        @select="$emit('select', $event)"
        @add-folder="$emit('add-folder', $event)"
        @add-tool="$emit('add-tool', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { KBToolTreeNode } from '@/types/knowledge'

const props = defineProps<{
  node: KBToolTreeNode
  depth: number
  selectedId: string | null
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'add-folder', parentId: string): void
  (e: 'add-tool', parentId: string): void
  (e: 'delete', id: string): void
}>()

const expanded = ref(true)
const hasChildren = computed(() => !!(props.node.children && props.node.children.length > 0))

const TYPE_ICONS: Record<string, string> = {
  folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  tool: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9h8"/><path d="M8 13h6"/><path d="M10 3h4"/><rect x="5" y="5" width="14" height="16" rx="2"/></svg>',
}

const typeIcon = computed(() => TYPE_ICONS[props.node.node_type] || TYPE_ICONS.tool)
</script>

<style lang="scss" scoped>
$bg-hover: #eaeaec;
$bg-active: #e3e3e6;
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.55);
$text-tertiary: rgba(0, 0, 0, 0.35);

.tool-tree-node-row {
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

    .tool-tree-node-actions {
      display: flex;
    }
  }

  &--selected {
    background: $bg-active;
  }
}

.tool-tree-node-toggle {
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

  .tool-tree-node-chevron--open {
    transform: rotate(90deg);
  }
}

.tool-tree-node-dot {
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

.tool-tree-node-icon {
  display: flex;
  align-items: center;
  color: $text-primary;
  flex-shrink: 0;

  &--tool {
    color: #0f766e;
  }
}

.tool-tree-node-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $text-primary;
  font-size: 13px;
  font-weight: 500;
}

.tool-tree-node-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(71, 85, 105, 0.1);
  color: #475569;
  font-weight: 500;
  flex-shrink: 0;
  letter-spacing: 0.2px;

  &--tool {
    background: rgba(15, 118, 110, 0.1);
    color: #0f766e;
  }

  &--disabled,
  &--warn {
    background: rgba(251, 191, 36, 0.18);
    color: #92400e;
  }
}

.tool-tree-node-actions {
  display: none;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

.tool-tree-node-action {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  border-radius: 5px;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
    color: $text-primary;
  }

  &--danger:hover {
    color: #ff3b30;
    background: rgba(255, 59, 48, 0.1);
  }
}
</style>
