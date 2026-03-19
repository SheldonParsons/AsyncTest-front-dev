<template>
  <div
    ref="rootRef"
    class="save-actions-menu"
    @pointerenter="activeSubmenu = null"
  >
    <button
      class="save-actions-trigger"
      :class="{ 'is-open': open }"
      type="button"
      aria-label="更多文件操作"
      @click.stop="toggleMenu"
    >
      <el-icon class="save-actions-trigger-icon"><ArrowDown /></el-icon>
    </button>

    <Teleport to="body">
      <transition name="save-actions-fade">
        <div
          v-if="open"
          class="save-actions-dropdown"
          :style="dropdownStyle"
        >
        <ul class="save-actions-list">
          <li
            class="save-actions-item"
            :class="{ 'is-disabled': !canSave }"
            @click="handleAction('save')"
          >
            <span class="save-actions-label">保存</span>
            <span class="save-actions-hint">⌘S</span>
          </li>
          <li
            class="save-actions-item"
            :class="{ 'is-disabled': !canSaveAs }"
            @click="handleAction('saveAs')"
          >
            <span class="save-actions-label">另存为</span>
            <span class="save-actions-hint">⇧⌘S</span>
          </li>

          <li
            v-if="canOpenFolder"
            class="save-actions-item"
            @click="handleAction('openFolder')"
          >
            <span class="save-actions-label">打开文件目录</span>
          </li>

          <li
            class="save-actions-item save-actions-item--submenu"
            :class="{ 'is-disabled': !canExportXmind }"
            @mouseenter="handleExportEnter"
          >
            <span class="save-actions-label">导出</span>
            <el-icon class="save-actions-submenu-icon"><ArrowRight /></el-icon>

            <transition name="save-actions-submenu-fade">
              <div
                v-if="activeSubmenu === 'export'"
                class="save-actions-submenu"
                @mouseenter="activeSubmenu = 'export'"
                @mouseleave="activeSubmenu = null"
              >
                <ul class="save-actions-submenu-list">
                  <li
                    class="save-actions-submenu-item"
                    @click.stop="handleAction('exportXmind')"
                  >
                    Xmind
                  </li>
                </ul>
              </div>
            </transition>
          </li>

          <div class="save-actions-divider" />

          <li class="save-actions-item" @click="handleAction('quickNew')">
            <span class="save-actions-label">快速新建</span>
          </li>

          <li class="save-actions-item" @click="handleAction('openLocal')">
            <span class="save-actions-label">打开本地文件</span>
          </li>

          <li
            class="save-actions-item save-actions-item--submenu"
            :class="{ 'is-disabled': !recentPaths.length }"
            @mouseenter="handleRecentEnter"
          >
            <span class="save-actions-label">最近打开</span>
            <el-icon class="save-actions-submenu-icon"><ArrowRight /></el-icon>

            <transition name="save-actions-submenu-fade">
              <div
                v-if="activeSubmenu === 'recent'"
                class="save-actions-submenu"
                @mouseenter="activeSubmenu = 'recent'"
                @mouseleave="activeSubmenu = null"
              >
                <ul class="save-actions-submenu-list">
                   <li
                     v-for="path in recentPaths"
                     :key="path"
                     class="save-actions-submenu-item"
                     :title="path"
                     @click.stop="handleRecentClick(path)"
                   >
                    {{ getRecentLabel(path) }}
                   </li>
                  <li v-if="!recentPaths.length" class="save-actions-submenu-empty">
                    暂无最近文件
                  </li>
                </ul>
              </div>
            </transition>
          </li>
        </ul>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const props = withDefaults(defineProps<{
  canSave?: boolean;
  canSaveAs?: boolean;
  canOpenFolder?: boolean;
  canExportXmind?: boolean;
  recentPaths?: string[];
}>(), {
  canSave: true,
  canSaveAs: true,
  canOpenFolder: false,
  canExportXmind: true,
  recentPaths: () => [],
});

const emit = defineEmits<{
  (event: 'save'): void;
  (event: 'saveAs'): void;
  (event: 'openFolder'): void;
  (event: 'quickNew'): void;
  (event: 'openLocal'): void;
  (event: 'exportXmind'): void;
  (event: 'openRecent', filePath: string): void;
  (event: 'menuOpen'): void;
}>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const activeSubmenu = ref<'recent' | 'export' | null>(null);
const dropdownPosition = ref({ top: 0, left: 0 });

const dropdownStyle = computed(() => ({
  top: `${dropdownPosition.value.top}px`,
  left: `${dropdownPosition.value.left}px`,
}));

function closeMenu() {
  open.value = false;
  activeSubmenu.value = null;
}

function updateDropdownPosition() {
  const root = rootRef.value;
  if (!root) return;
  const rect = root.getBoundingClientRect();
  dropdownPosition.value = {
    top: rect.bottom + 10,
    left: rect.left,
  };
}

async function toggleMenu() {
  open.value = !open.value;
  activeSubmenu.value = null;
  if (open.value) {
    emit('menuOpen');
    await nextTick();
    updateDropdownPosition();
  }
}

function handleAction(action: 'save' | 'saveAs' | 'openFolder' | 'quickNew' | 'openLocal' | 'exportXmind') {
  if ((action === 'save' && !props.canSave) || (action === 'saveAs' && !props.canSaveAs)) return;
  if (action === 'openFolder' && !props.canOpenFolder) return;
  if (action === 'exportXmind' && !props.canExportXmind) return;
  closeMenu();
  emit(action);
}

function handleExportEnter() {
  if (!props.canExportXmind) {
    activeSubmenu.value = null;
    return;
  }
  activeSubmenu.value = 'export';
}

function handleRecentEnter() {
  if (!props.recentPaths.length) {
    activeSubmenu.value = null;
    return;
  }
  activeSubmenu.value = 'recent';
}

function handleRecentClick(filePath: string) {
  closeMenu();
  emit('openRecent', filePath);
}

function getRecentLabel(filePath: string) {
  const normalized = String(filePath ?? '').split(/[\\/]/).filter(Boolean);
  return normalized[normalized.length - 1] || filePath;
}

function handlePointerDown(event: Event) {
  const root = rootRef.value;
  const target = event.target as Node | null;
  if (!root || !target) return;
  const insideTrigger = root.contains(target);
  const insideDropdown = target instanceof Node && !!document.querySelector('.save-actions-dropdown')?.contains(target);
  if (insideTrigger || insideDropdown) return;
  closeMenu();
}

function handleViewportChange() {
  if (!open.value) return;
  updateDropdownPosition();
}

onMounted(() => {
  window.addEventListener('pointerdown', handlePointerDown, true);
  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('scroll', handleViewportChange, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown, true);
  window.removeEventListener('resize', handleViewportChange);
  window.removeEventListener('scroll', handleViewportChange, true);
});
</script>

<style scoped lang="scss">
.save-actions-menu {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.save-actions-trigger {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(70, 78, 92, 0.76);
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.save-actions-trigger:hover {
  background: rgba(255, 255, 255, 0.52);
  color: #111827;
  transform: translateY(-1px);
  box-shadow:
    inset 0 0 0 1px rgba(148, 163, 184, 0.32),
    0 4px 14px rgba(15, 23, 42, 0.08);
}

.save-actions-trigger.is-open {
  background: rgba(255, 255, 255, 0.62);
  color: #0f172a;
  box-shadow:
    inset 0 0 0 1px rgba(148, 163, 184, 0.4),
    0 6px 18px rgba(15, 23, 42, 0.1);
}

.save-actions-trigger-icon {
  font-size: 12px;
  transition: transform 0.22s ease;
}

.save-actions-trigger.is-open .save-actions-trigger-icon {
  transform: rotate(180deg);
}

.save-actions-dropdown {
  position: fixed;
  width: max-content;
  min-width: 0;
  max-width: min(320px, calc(100vw - 24px));
  z-index: 2400;
  transform-origin: top left;
}

.save-actions-list,
.save-actions-submenu-list {
  list-style: none;
  width: max-content;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  padding: 6px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(246, 248, 251, 0.58)),
    rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 12px;
  box-shadow:
    0 18px 48px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.save-actions-item,
.save-actions-submenu-item,
.save-actions-submenu-empty {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  box-sizing: border-box;
}

.save-actions-item {
  position: relative;
  cursor: pointer;
  color: #18212f;
  transition:
    background-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.save-actions-item:hover:not(.is-disabled) {
  background: rgba(15, 23, 42, 0.88);
  color: #f8fafc;
  transform: translateX(1px);
}

.save-actions-item.is-disabled {
  opacity: 0.42;
  cursor: default;
}

.save-actions-label {
  min-width: 0;
  line-height: 1;
}

.save-actions-hint,
.save-actions-submenu-icon {
  flex: 0 0 auto;
  color: rgba(71, 85, 105, 0.62);
  font-size: 11px;
  transition: color 0.16s ease;
}

.save-actions-item:hover:not(.is-disabled) .save-actions-hint,
.save-actions-item:hover:not(.is-disabled) .save-actions-submenu-icon {
  color: rgba(255, 255, 255, 0.72);
}

.save-actions-divider {
  height: 1px;
  margin: 6px 4px;
  background: linear-gradient(90deg, transparent, rgba(100, 116, 139, 0.28), transparent);
}

.save-actions-item--submenu {
  padding-right: 10px;
}

.save-actions-submenu {
  position: absolute;
  top: -6px;
  left: calc(100% + 8px);
  width: max-content;
  max-width: min(560px, 58vw);
  z-index: 25;
}

.save-actions-submenu-list {
  width: max-content;
  min-width: 0;
  max-width: min(560px, 58vw);
  max-height: 320px;
  overflow: auto;
  background: #f8fafc;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.save-actions-submenu-item {
  justify-content: flex-start;
  cursor: pointer;
  color: #18212f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    background-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.save-actions-submenu-item:hover {
  background: rgba(15, 23, 42, 0.88);
  color: #f8fafc;
  transform: translateX(1px);
}

.save-actions-submenu-empty {
  color: rgba(71, 85, 105, 0.72);
}

.save-actions-fade-enter-active,
.save-actions-fade-leave-active,
.save-actions-submenu-fade-enter-active,
.save-actions-submenu-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.2s cubic-bezier(0.2, 0.84, 0.24, 1);
}

.save-actions-fade-enter-from,
.save-actions-fade-leave-to,
.save-actions-submenu-fade-enter-from,
.save-actions-submenu-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.save-actions-fade-enter-to,
.save-actions-fade-leave-from,
.save-actions-submenu-fade-enter-to,
.save-actions-submenu-fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
