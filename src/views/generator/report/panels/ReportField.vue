<template>
  <div
    class="report-field"
    :class="{ 'is-invalid': error, 'is-filled': filled, 'is-disabled': disabled }"
    :data-field="name"
    @focusout="context?.touch(name)"
  >
    <label class="report-field-label" :for="fieldProps.id">
      <span class="report-field-label-text">{{ label }}</span>
      <span v-if="required" class="report-field-required" aria-hidden="true" />
      <span v-if="optionalBadge" class="report-field-optional">选填</span>
    </label>
    <div class="report-field-control">
      <slot v-bind="fieldProps">
        <component
          :is="multiline ? 'textarea' : 'input'"
          v-bind="fieldProps"
          :type="type"
          :value="modelValue"
          :disabled="disabled"
          :placeholder="placeholder"
          :rows="multiline ? 3 : undefined"
          :min="type === 'number' ? 1 : undefined"
          @input="update"
          @focus="emit('focus')"
          @blur="emit('blur')"
        />
      </slot>
    </div>
    <div class="report-field-msg" aria-live="polite">
      <Transition name="field-msg" mode="out-in">
        <p v-if="error" :key="'error'" class="field-error">
          <CircleAlert :size="12" aria-hidden="true" />{{ error.message }}
        </p>
        <p v-else-if="hint" :key="'hint'" class="field-hint">{{ hint }}</p>
        <p v-else :key="'empty'" class="field-hint is-empty" aria-hidden="true">
          &nbsp;
        </p>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { CircleAlert } from "@/components/icons/lucide";
import { reportFormContext } from "../formContext";

const props = withDefaults(
  defineProps<{
    name: string;
    label: string;
    modelValue?: string | number;
    placeholder?: string;
    hint?: string;
    type?: string;
    disabled?: boolean;
    required?: boolean;
    multiline?: boolean;
    optionalBadge?: boolean;
  }>(),
  { type: "text", required: true, optionalBadge: false },
);
const emit = defineEmits<{
  "update:modelValue": [value: string | number];
  focus: [];
  blur: [];
}>();
const context = inject(reportFormContext, undefined);
const error = computed(() => context?.issue(props.name));
const filled = computed(
  () => String(props.modelValue ?? "").length > 0 && !props.disabled,
);
const fieldProps = computed(() => ({
  id: `report-field-${props.name}`,
  "aria-invalid": !!error.value,
  "aria-describedby":
    error.value || props.hint ? `report-field-${props.name}-help` : undefined,
  "aria-required": props.required,
}));
function update(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit(
    "update:modelValue",
    props.type === "number" && value !== "" ? Number(value) : value,
  );
}
</script>

<style lang="scss">
/* 字段是全页面最高的复用单元：标签 / 控件 / 信息 三段高度固定，
   任何一格出现错误都不会改变自身高度，网格因此永远对齐。 */
.report-field {
  --field-label-h: 18px;
  --field-gap: 7px;
  --field-msg-h: 18px;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: opacity 0.2s ease;
}
.report-field-label {
  display: flex;
  align-items: center;
  gap: 5px;
  height: var(--field-label-h);
  margin-bottom: var(--field-gap);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #3f3f3f;
  user-select: none;
  transition: color 0.16s ease;
}
.report-field-label-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.report-field-required {
  flex-shrink: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #1a1a1a;
  transform: translateY(1px);
  transition: background 0.16s ease;
}
.report-field-optional {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 500;
  color: #a3a3a3;
  letter-spacing: 0;
}
.report-field-control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 40px;
}
.report-field-control > input,
.report-field-control > textarea {
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: #171717;
  background: #ffffff;
  border: 1px solid #dcdcdc;
  border-radius: 8px;
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.2s ease,
    background 0.16s ease;
}
.report-field-control > textarea {
  padding: 9px 12px;
  min-height: 76px;
  max-height: 200px;
  resize: vertical;
  line-height: 1.65;
}
.report-field-control > input::placeholder,
.report-field-control > textarea::placeholder {
  color: #adadad;
}
/* 三个状态各自只有一条边界，且都贴在框上，不向外扩：
   常态 = 浅灰边；hover = 加深一档；focus = 近黑边 + 很淡的内收底色。
   不再用外扩阴影环——它和边框形成「两层框」，并会压到相邻元素。 */
.report-field-control > input:hover:not(:disabled):not(:focus),
.report-field-control > textarea:hover:not(:disabled):not(:focus) {
  border-color: #b4b4b4;
}
.report-field-control > input:focus,
.report-field-control > textarea:focus {
  border-color: #171717;
  box-shadow: inset 0 0 0 0.5px #171717;
}
.report-field-control > input:disabled,
.report-field-control > textarea:disabled {
  background: #f6f6f6;
  border-color: #e6e6e6;
  color: #a0a0a0;
  cursor: not-allowed;
}
.report-field-msg {
  display: flex;
  align-items: flex-start;
  min-height: var(--field-msg-h);
  padding-top: 5px;
}
.report-field-msg p {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  animation: none;
}
.field-hint {
  color: #969696;
}
.field-hint.is-empty {
  visibility: hidden;
}
.field-error {
  color: #b42318;
  font-weight: 500;
}
.field-error svg {
  flex-shrink: 0;
  margin-top: 1px;
}
/* 错误态：标签与提示变砖红、边框变淡红。不再在字段外侧画竖线——
   它位于 left:-11px，会压到左边相邻的字段或容器边缘。 */
.report-field.is-invalid .report-field-label {
  color: #8f1d12;
}
.report-field.is-invalid .report-field-required {
  background: #b42318;
}
/* 加 !important 是刻意的：hover 规则带了两个 :not()，特异性天然更高，
   会让「出错且鼠标悬停」的输入框退回灰色边框，看起来好像校验消失了。 */
.report-field.is-invalid .report-field-control > input,
.report-field.is-invalid .report-field-control > textarea {
  border-color: #e0b4b0 !important;
  background: #fffbfa;
}
.report-field.is-invalid .report-field-control > input:focus,
.report-field.is-invalid .report-field-control > textarea:focus {
  border-color: #b42318 !important;
  box-shadow: inset 0 0 0 0.5px #b42318;
}
.report-field.is-disabled .report-field-label {
  color: #a8a8a8;
}
.report-field.is-disabled .report-field-required {
  background: #d0d0d0;
}
.field-msg-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.field-msg-leave-active {
  transition: opacity 0.12s ease;
}
.field-msg-enter-from,
.field-msg-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
/* 从「前往完善」跳转过来时，目标字段做一次聚焦脉冲。 */
.report-field.is-targeted .report-field-control {
  animation: field-pulse 1.1s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes field-pulse {
  0%,
  100% {
    box-shadow: none;
  }
  22% {
    box-shadow: 0 0 0 4px rgb(23 23 23 / 10%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .report-field.is-targeted .report-field-control {
    animation: none;
  }
  .field-msg-enter-active,
  .field-msg-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
