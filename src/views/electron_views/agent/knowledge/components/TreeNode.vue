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
      <!-- Expand toggle -->
      <button
        v-if="isDirectory"
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
        <svg v-if="isDirectory" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </span>

      <!-- Name -->
      <span class="tree-node-name">{{ node.name }}</span>

      <!-- Context actions (on hover) -->
      <div class="tree-node-actions">
        <button v-if="isDirectory" class="tree-node-action" @click.stop="$emit('add-child', node.id)" title="添加子节点">
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
  (e: 'delete', id: string): void
}>()

const expanded = ref(true)
const showContext = ref(false)
const isDirectory = computed(() => props.node.type === 'directory' || (props.node.children && props.node.children.length > 0))
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
