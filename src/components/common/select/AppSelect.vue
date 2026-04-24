<template>
  <div ref="rootRef" class="app-select" :class="{ 'is-disabled': disabled }">
    <button
      class="app-select-trigger"
      :class="{ 'is-open': open, 'is-disabled': disabled }"
      type="button"
      :disabled="disabled"
      @click.stop="toggleMenu"
    >
      <span class="app-select-value" :class="{ 'is-placeholder': !currentLabel }">
        {{ currentLabel || placeholder }}
      </span>
      <el-icon class="app-select-caret"><ArrowDown /></el-icon>
    </button>

    <Teleport to="body">
      <transition name="app-select-fade">
        <div
          v-if="open"
          class="app-select-dropdown"
          :style="dropdownStyle"
          @click.stop
        >
          <ul class="app-select-list">
            <li
              v-for="opt in options"
              :key="String(opt.value)"
              class="app-select-item"
              :class="{
                'is-active': isActive(opt.value),
                'is-disabled': opt.disabled,
              }"
              @click="pick(opt)"
            >
              <span class="app-select-item-label">{{ opt.label }}</span>
              <span v-if="opt.hint" class="app-select-item-hint">{{ opt.hint }}</span>
            </li>
            <li v-if="!options.length" class="app-select-empty">暂无可选项</li>
          </ul>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface AppSelectOption {
  value: string | number
  label: string
  hint?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string | number | null | undefined
  options: AppSelectOption[]
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: '请选择',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | number): void
  (e: 'change', v: string | number): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)
const dropdownPosition = ref({ top: 0, left: 0, width: 0 })

const currentLabel = computed(() =>
  props.options.find(o => o.value === props.modelValue)?.label || ''
)

const dropdownStyle = computed(() => ({
  top: `${dropdownPosition.value.top}px`,
  left: `${dropdownPosition.value.left}px`,
  minWidth: `${dropdownPosition.value.width}px`,
}))

function isActive(v: string | number) {
  return v === props.modelValue
}

function updatePosition() {
  const root = rootRef.value
  if (!root) return
  const rect = root.getBoundingClientRect()
  dropdownPosition.value = {
    top: rect.bottom + 6,
    left: rect.left,
    width: rect.width,
  }
}

async function toggleMenu() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    await nextTick()
    updatePosition()
  }
}

function closeMenu() { open.value = false }

function pick(opt: AppSelectOption) {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  closeMenu()
}

function handlePointerDown(e: Event) {
  const target = e.target as Node | null
  const root = rootRef.value
  if (!target) return
  const insideTrigger = root?.contains(target)
  const insideDropdown = !!document.querySelector('.app-select-dropdown')?.contains(target)
  if (insideTrigger || insideDropdown) return
  closeMenu()
}

function handleViewportChange() {
  if (!open.value) return
  updatePosition()
}

onMounted(() => {
  window.addEventListener('pointerdown', handlePointerDown, true)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown, true)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})

watch(() => props.disabled, (d) => { if (d) closeMenu() })
</script>

<style scoped lang="scss">
.app-select {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif;
  &.is-disabled { opacity: 0.55; cursor: not-allowed; }
}

.app-select-trigger {
  height: 30px;
  min-width: 120px;
  padding: 0 10px 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(246, 248, 251, 0.58)),
    rgba(255, 255, 255, 0.5);
  font-size: 13px;
  color: #18212f;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.2s ease;
}

.app-select-trigger:hover:not(.is-disabled) {
  border-color: rgba(148, 163, 184, 0.55);
  box-shadow:
    inset 0 0 0 1px rgba(148, 163, 184, 0.2),
    0 4px 14px rgba(15, 23, 42, 0.08);
}

.app-select-trigger.is-open {
  border-color: rgba(15, 23, 42, 0.45);
  box-shadow:
    inset 0 0 0 1px rgba(148, 163, 184, 0.4),
    0 6px 18px rgba(15, 23, 42, 0.1);
}

.app-select-trigger.is-disabled { cursor: not-allowed; }

.app-select-value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
.app-select-value.is-placeholder { color: rgba(71, 85, 105, 0.62); }

.app-select-caret {
  font-size: 11px;
  color: rgba(70, 78, 92, 0.76);
  transition: transform 0.22s ease;
}
.app-select-trigger.is-open .app-select-caret { transform: rotate(180deg); }
</style>

<style lang="scss">
.app-select-dropdown {
  position: fixed;
  z-index: 2400;
  max-width: min(360px, calc(100vw - 24px));
  transform-origin: top left;
}

.app-select-list {
  list-style: none;
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
  max-height: 320px;
  overflow-y: auto;
}

.app-select-item {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #18212f;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.app-select-item:hover:not(.is-disabled) {
  background: rgba(15, 23, 42, 0.88);
  color: #f8fafc;
  transform: translateX(1px);
}

.app-select-item.is-active {
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
  font-weight: 600;
}
.app-select-item.is-active:hover:not(.is-disabled) {
  background: rgba(15, 23, 42, 0.88);
  color: #f8fafc;
}

.app-select-item.is-disabled { opacity: 0.42; cursor: default; }

.app-select-item-hint {
  flex: 0 0 auto;
  color: rgba(71, 85, 105, 0.62);
  font-size: 11px;
}
.app-select-item:hover:not(.is-disabled) .app-select-item-hint {
  color: rgba(255, 255, 255, 0.72);
}

.app-select-empty {
  min-height: 34px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  font-size: 12px;
  color: rgba(71, 85, 105, 0.72);
}

.app-select-fade-enter-active,
.app-select-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.2s cubic-bezier(0.2, 0.84, 0.24, 1);
}
.app-select-fade-enter-from,
.app-select-fade-leave-to { opacity: 0; transform: translateY(-6px) scale(0.96); }
.app-select-fade-enter-to,
.app-select-fade-leave-from { opacity: 1; transform: translateY(0) scale(1); }
</style>
