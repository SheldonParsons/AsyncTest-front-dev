<template>
  <ComboboxRoot
    :model-value="modelValue"
    :open="open"
    :disabled="disabled"
    open-on-click
    class="report-select-root"
    @update:model-value="selectOption"
    @update:open="onOpen"
  >
    <ComboboxAnchor
      class="report-select-anchor"
      :class="{ 'is-disabled': disabled, 'has-value': !!modelValue }"
    >
      <ComboboxInput
        v-bind="$attrs"
        v-model="inputText"
        :display-value="displayValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="report-select-input"
      />
      <span v-if="loading" class="report-select-spinner" aria-hidden="true" />
      <ComboboxTrigger
        class="report-select-trigger"
        :disabled="disabled"
        :aria-label="`展开${triggerLabel || placeholder}`"
        ><ChevronDown :size="15"
      /></ComboboxTrigger>
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent
        class="report-select-content"
        position="popper"
        :side-offset="6"
        :collision-padding="12"
      >
        <ComboboxViewport class="report-select-viewport">
          <ComboboxEmpty class="report-select-empty">
            <span
              v-if="loading"
              class="report-select-spinner"
              aria-hidden="true"
            />
            <span v-else class="report-select-empty-mark" aria-hidden="true" />
            {{
              loading
                ? "正在加载…"
                : options.length
                  ? "没有匹配项，换个关键词试试"
                  : emptyText || "暂无可选项"
            }}
          </ComboboxEmpty>
          <ComboboxItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :text-value="option.label"
            class="report-select-item"
          >
            <span class="report-select-item-text">{{ option.label }}</span>
            <ComboboxItemIndicator class="report-select-item-indicator">
              <Check :size="14" />
            </ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxPortal,
  ComboboxContent,
  ComboboxViewport,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxItemIndicator,
} from "reka-ui";
import { Check, ChevronDown } from "@/components/icons/lucide";
import type { ReportSelectOption } from "../types";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  modelValue: string;
  options: ReportSelectOption[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  triggerLabel?: string;
  /** 已满足上级条件但确实没有数据时显示的文案。 */
  emptyText?: string;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [value: string];
  open: [];
}>();
const open = ref(false);
const inputText = ref("");
const selectedLabel = computed(() => displayValue(props.modelValue));

// 旧草稿先恢复 ID，禅道选项稍后返回。Reka 不会因 options 改变重算
// 输入框文字，因此显式同步显示值；搜索过程中不覆盖用户正在输入的内容。
watch(
  [() => props.modelValue, selectedLabel],
  ([value], previous) => {
    if (!open.value || value !== previous?.[0]) {
      inputText.value = selectedLabel.value;
    }
  },
  { immediate: true },
);
function displayValue(value: unknown) {
  return (
    props.options.find((option) => option.value === value)?.label ||
    (value ? "已保存的选择，等待加载" : "")
  );
}
function selectOption(value: unknown) {
  if (typeof value !== "string" || value === props.modelValue) return;
  emit("update:modelValue", value);
  emit("change", value);
}
function onOpen(value: boolean) {
  open.value = value;
  if (value) emit("open");
  else inputText.value = selectedLabel.value;
}
</script>

<style lang="scss">
/* ComboboxRoot 没有自己的盒子，若不显式撑满，它会按内容宽度收缩，
   导致下拉框比同列的输入框窄、长文案被截断。 */
.report-select-root {
  display: block;
  width: 100%;
  min-width: 0;
}
/* 锚点与 ReportField 的 input 共用同一套高度 / 边框 / 圆角 / 聚焦环，
   因此下拉与文本框混排在同一列时，上下边缘必然重合。 */
.report-select-anchor {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 40px;
  background: #ffffff;
  border: 1px solid #dcdcdc;
  border-radius: 8px;
  transition:
    border-color 0.16s ease,
    box-shadow 0.2s ease,
    background 0.16s ease;
}
/* 与 ReportField 的输入框同规则：hover 与 focus 各只画一条边界，
   都贴在框上，不外扩。 */
.report-select-anchor:hover:not(.is-disabled):not(:focus-within) {
  border-color: #b4b4b4;
}
.report-select-anchor:focus-within,
.report-select-anchor:has(.report-select-trigger[data-state="open"]) {
  border-color: #171717;
  box-shadow: inset 0 0 0 0.5px #171717;
}
.report-select-anchor.is-disabled {
  background: #f6f6f6;
  border-color: #e6e6e6;
}
.report-select-anchor.is-disabled .report-select-input {
  color: #a0a0a0;
}
.report-select-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  padding: 0 12px !important;
  font-family: inherit;
  font-size: 13px;
  color: #171717;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: none;
}
.report-select-input::placeholder {
  color: #adadad;
}
.report-select-spinner {
  flex-shrink: 0;
  width: 13px;
  height: 13px;
  margin-right: 2px;
  border: 1.5px solid #dcdcdc;
  border-top-color: #6b6b6b;
  border-radius: 50%;
  animation: report-select-spin 0.7s linear infinite;
}
.report-select-trigger {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 32px;
  height: 100%;
  color: #8a8a8a;
  background: none;
  border: 0;
  cursor: pointer;
  transition:
    color 0.16s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.report-select-anchor:hover:not(.is-disabled) .report-select-trigger {
  color: #171717;
}
.report-select-anchor:has(.report-select-trigger[data-state="open"]) .report-select-trigger {
  color: #171717;
  transform: rotate(180deg);
}
.report-select-content {
  z-index: 12000;
  width: var(--reka-combobox-trigger-width);
  max-height: min(300px, var(--reka-combobox-content-available-height));
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e6e6e6;
  border-radius: 10px;
  box-shadow:
    0 1px 2px rgb(16 16 16 / 4%),
    0 10px 32px rgb(16 16 16 / 12%);
  font-family: inherit;
  transform-origin: var(--reka-combobox-content-transform-origin);
}
.report-select-content[data-state="open"] {
  animation: report-select-in 0.17s cubic-bezier(0.22, 1, 0.36, 1);
}
.report-select-content[data-state="closed"] {
  animation: report-select-out 0.12s ease-in forwards;
}
@keyframes report-select-in {
  from {
    opacity: 0;
    transform: scale(0.97) translateY(-3px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
@keyframes report-select-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .report-select-content[data-state="open"],
  .report-select-content[data-state="closed"] {
    animation: none;
  }
}
.report-select-viewport {
  padding: 5px;
  max-height: inherit;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 transparent;
}
.report-select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.45;
  color: #3d3d3d;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
  transition: background 0.12s ease;
}
.report-select-item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.report-select-item[data-highlighted] {
  background: #f4f4f4;
  color: #171717;
}
.report-select-item[data-state="checked"] {
  color: #171717;
  font-weight: 600;
}
.report-select-item-indicator {
  flex-shrink: 0;
  color: #171717;
}
.report-select-item-indicator:empty {
  display: none;
}
.report-select-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 10px;
  color: #969696;
  font-size: 12px;
  line-height: 1.5;
}
.report-select-empty-mark {
  flex-shrink: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #cfcfcf;
}
@keyframes report-select-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
