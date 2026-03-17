<template>
  <div ref="rootRef" class="save-actions-menu">
    <button
      class="save-actions-trigger"
      :class="{ 'is-open': open }"
      :disabled="disabled"
      type="button"
      aria-label="更多保存操作"
      @click.stop="toggleMenu"
    >
      <el-icon class="save-actions-trigger-icon"><ArrowDown /></el-icon>
    </button>

    <transition name="save-actions-fade">
      <div v-if="open" class="save-actions-dropdown">
        <ul class="save-actions-list">
          <li class="save-actions-item" @click="handleAction('save')">
            <span class="save-actions-label">保存</span>
            <span class="save-actions-hint">⌘S</span>
          </li>
          <div class="save-actions-divider" />
          <li class="save-actions-item" @click="handleAction('saveAs')">
            <span class="save-actions-label">另存为</span>
            <span class="save-actions-hint">⇧⌘S</span>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (event: 'save'): void;
  (event: 'saveAs'): void;
}>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

function closeMenu() {
  open.value = false;
}

function toggleMenu() {
  if (props.disabled) return;
  open.value = !open.value;
}

function handleAction(action: 'save' | 'saveAs') {
  closeMenu();
  emit(action);
}

function handlePointerDown(event: Event) {
  const root = rootRef.value;
  const target = event.target as Node | null;
  if (!root || !target || root.contains(target)) return;
  closeMenu();
}

onMounted(() => {
  window.addEventListener('pointerdown', handlePointerDown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown, true);
});
</script>

<style scoped lang="scss">
.save-actions-menu {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.save-actions-trigger {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #7b8794;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.22s ease,
    box-shadow 0.22s ease;
}

.save-actions-trigger:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.38);
  color: #111827;
  transform: translateY(-1px);
  box-shadow: inset 0 0 0 1px rgba(144, 164, 168, 0.35);
}

.save-actions-trigger.is-open {
  background: rgba(255, 255, 255, 0.42);
  color: #111827;
  box-shadow: inset 0 0 0 1px rgba(144, 164, 168, 0.45);
}

.save-actions-trigger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.save-actions-trigger-icon {
  font-size: 12px;
  transition: transform 0.22s ease;
}

.save-actions-trigger.is-open .save-actions-trigger-icon {
  transform: rotate(180deg);
}

.save-actions-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 176px;
  z-index: 20;
  transform-origin: top left;
}

.save-actions-list {
  list-style: none;
  padding: 4px;
  margin: 0;
  background: rgba(255, 255, 255, 0.26);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(144, 164, 168, 0.75);
  border-radius: 8px;
  box-shadow:
    0 10px 30px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.38);
}

.save-actions-item {
  width: 100%;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  color: #111827;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  transition:
    background-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.save-actions-item:hover {
  background-color: #111111;
  color: #ffffff;
  transform: translateX(1px);
}

.save-actions-label {
  display: flex;
  align-items: center;
  line-height: 1;
}

.save-actions-hint {
  color: rgba(17, 24, 39, 0.48);
  font-size: 11px;
  line-height: 1;
  transition: color 0.16s ease;
}

.save-actions-item:hover .save-actions-hint {
  color: rgba(255, 255, 255, 0.72);
}

.save-actions-divider {
  height: 1px;
  margin: 4px 0;
  background: rgba(17, 24, 39, 0.14);
}

.save-actions-fade-enter-active,
.save-actions-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.2, 0.9, 0.2, 1);
}

.save-actions-fade-enter-from,
.save-actions-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.94);
}

.save-actions-fade-enter-to,
.save-actions-fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
