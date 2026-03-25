<template>
  <div ref="rootRef" class="generator-search-export-dropdown" :class="{ 'is-open': open }">
    <button class="generator-search-export-trigger" type="button" :disabled="disabled" @click="toggleOpen" @mousedown="$emit('open')">
      <span v-if="triggerLabel" class="generator-search-export-trigger-label">{{ triggerLabel }}</span>
      <span class="generator-search-export-trigger-value">{{ currentLabel }}</span>
      <span class="generator-search-export-trigger-caret" aria-hidden="true"></span>
    </button>

    <transition name="generator-search-export-menu">
      <div v-if="open" class="generator-search-export-menu" @click.stop>
        <button
          v-for="option in options"
          :key="option.value"
          class="generator-search-export-option"
          :class="{ 'is-active': modelValue === option.value }"
          type="button"
          @click.stop="selectOption(option.value)"
        >
          <span class="generator-search-export-option-title">{{ option.label }}</span>
          <span class="generator-search-export-option-check" aria-hidden="true">{{ modelValue === option.value ? "✓" : "" }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { ReportSelectOption } from "../types";

const props = defineProps<{
  modelValue: string;
  options: ReportSelectOption[];
  placeholder: string;
  disabled?: boolean;
  triggerLabel?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [value: string];
  open: [];
}>();

const rootRef = ref<HTMLElement | null>(null);
const open = ref(false);

const currentLabel = computed(() => {
  const matched = props.options.find((option) => option.value === props.modelValue);
  return matched?.label ?? props.placeholder;
});

function closeDropdown() {
  open.value = false;
}

function toggleOpen() {
  if (props.disabled) return;
  open.value = !open.value;
}

function selectOption(value: string) {
  emit("update:modelValue", value);
  emit("change", value);
  open.value = false;
}

function handleDocumentPointerDown(event: Event) {
  const target = event.target as Node | null;
  if (!rootRef.value || !target || rootRef.value.contains(target)) return;
  closeDropdown();
}

onMounted(() => {
  document.addEventListener("mousedown", handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleDocumentPointerDown);
});
</script>

<style scoped lang="scss">
.generator-search-export-dropdown {
  position: relative;
  width: 100%;
}

.generator-search-export-trigger {
  width: 100%;
  min-height: 38px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.generator-search-export-trigger:hover:not(:disabled) {
  border-color: rgba(14, 116, 144, 0.28);
  background: rgba(248, 250, 252, 0.98);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
}

.generator-search-export-trigger:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.generator-search-export-trigger-label {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.generator-search-export-trigger-value {
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.generator-search-export-trigger-caret {
  position: relative;
  margin-left: auto;
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  overflow: visible;
}

.generator-search-export-trigger-caret::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 1px;
  width: 7px;
  height: 7px;
  box-sizing: border-box;
  border-right: 1.5px solid rgba(15, 23, 42, 0.72);
  border-bottom: 1.5px solid rgba(15, 23, 42, 0.72);
  transform: rotate(45deg);
  transform-origin: center;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.generator-search-export-dropdown.is-open .generator-search-export-trigger-caret::before {
  transform: rotate(-135deg);
}

.generator-search-export-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 12;
  padding: 5px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.12);
  max-height: 240px;
  overflow: auto;
}

.generator-search-export-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #0f172a;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.generator-search-export-option:hover {
  background: rgba(241, 245, 249, 0.95);
}

.generator-search-export-option.is-active {
  background: rgba(226, 232, 240, 0.95);
}

.generator-search-export-option-title {
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.generator-search-export-option-check {
  min-width: 12px;
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
}

.generator-search-export-menu-enter-active,
.generator-search-export-menu-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.generator-search-export-menu-enter-from,
.generator-search-export-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
