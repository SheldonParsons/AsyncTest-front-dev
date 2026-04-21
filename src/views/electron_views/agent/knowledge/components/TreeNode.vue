<template>
  <div class="tree-node">
    <div
      :class="['tree-node-row', {
        'tree-node-row--selected': selectedId === node.id,
        'tree-node-row--directory': isDirectory,
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

      <!-- Icon -->
      <span class="tree-node-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 7v14"/>
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>
        </svg>
      </span>

      <!-- Name -->
      <span class="tree-node-name">{{ node.name }}</span>

      <!-- Context actions (on hover) -->
      <div class="tree-node-actions">
        <button class="tree-node-action" @click.stop="$emit('rename', node.id)" title="重命名">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button v-if="isDirectory" class="tree-node-action" @click.stop="$emit('add-child', node.id)" title="添加知识">
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
    <div v-if="isDirectory && expanded && node.children?.length" class="tree-node-children">
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
const isDirectory = computed(() => props.node.type === 'directory' || hasChildren.value)
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
      opacity: 1;
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
  color: $text-secondary;
  flex-shrink: 0;
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
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s;
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
