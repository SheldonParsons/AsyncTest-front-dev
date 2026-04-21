<template>
  <div class="csel-wrap" :class="{ 'csel-wrap--open': open, 'csel-wrap--disabled': disabled }">
    <button
      ref="triggerRef"
      class="csel-trigger"
      :class="{ 'csel-trigger--sm': size === 'sm' }"
      :disabled="disabled"
      @click="toggle"
    >
      <span
        v-if="selectedOption?.color"
        class="csel-color"
        :style="{ background: selectedOption.color }"
      ></span>
      <span class="csel-label" :class="{ 'csel-label--placeholder': !selectedOption }">
        {{ selectedOption?.label ?? placeholder }}
      </span>
      <svg
        class="csel-chevron"
        :class="{ 'csel-chevron--open': open }"
        width="10" height="6" viewBox="0 0 10 6" fill="none"
      >
        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="open" class="csel-backdrop" @click="open = false"></div>
      <div v-if="open" class="csel-menu" :style="menuStyle">
        <button
          v-for="opt in options"
          :key="String(opt.value)"
          class="csel-option"
          :class="{ 'csel-option--active': opt.value === modelValue }"
          @click="select(opt)"
        >
          <span
            v-if="opt.color"
            class="csel-color csel-color--lg"
            :style="{ background: opt.color }"
          ></span>
          <span class="csel-option-label">{{ opt.label }}</span>
          <svg v-if="opt.value === modelValue" class="csel-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'

export interface SelectOption {
  value: any
  label: string
  color?: string
}

const props = withDefaults(defineProps<{
  options: SelectOption[]
  modelValue?: any
  placeholder?: string
  disabled?: boolean
  size?: 'default' | 'sm'
}>(), {
  placeholder: '请选择',
  disabled: false,
  size: 'default',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any): void
}>()

const open = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

const selectedOption = computed(() =>
  props.options.find(o => o.value === props.modelValue) ?? null
)

function toggle() {
  if (props.disabled) return
  if (!open.value) {
    const rect = triggerRef.value?.getBoundingClientRect()
    if (rect) {
      menuStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        minWidth: `${rect.width}px`,
      }
    }
  }
  open.value = !open.value
}

function select(opt: SelectOption) {
  open.value = false
  if (opt.value === props.modelValue) return
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
}
</script>

<style lang="scss" scoped>
$border-color: rgba(0, 0, 0, 0.1);
$bg-hover: #eaeaec;
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.55);
$text-tertiary: rgba(0, 0, 0, 0.35);
$bg-sidebar: #f5f5f7;

.csel-wrap {
  position: relative;
  display: block;

  &--disabled { opacity: 0.5; pointer-events: none; }
}

.csel-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border: 1px solid $border-color;
  border-radius: 8px;
  background: $bg-sidebar;
  font-size: 13px;
  color: $text-primary;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: -0.12px;
  transition: border-color 0.15s, background 0.15s;
  text-align: left;
  box-sizing: border-box;

  &:hover:not(:disabled) {
    border-color: rgba(0, 0, 0, 0.22);
    background: #fff;
  }

  .csel-wrap--open & {
    border-color: rgba(0, 0, 0, 0.3);
    background: #fff;
  }

  &--sm {
    padding: 5px 8px;
    font-size: 12px;
  }
}

.csel-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &--lg {
    width: 10px;
    height: 10px;
  }
}

.csel-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &--placeholder { color: $text-tertiary; }
}

.csel-chevron {
  flex-shrink: 0;
  color: $text-tertiary;
  transition: transform 0.15s;

  &--open { transform: rotate(180deg); }
}

.csel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
}

.csel-menu {
  z-index: 9001;
  background: #fff;
  border: 1px solid $border-color;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  max-height: 320px;
  overflow-y: auto;
}

.csel-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  font-size: 13px;
  color: $text-primary;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  letter-spacing: -0.1px;
  transition: background 0.1s;
  width: 100%;

  &:hover { background: $bg-hover; }
  &--active { font-weight: 500; }

  .csel-option-label { flex: 1; }
}

.csel-check {
  flex-shrink: 0;
  color: #1d1d1f;
}
</style>
