<template>
  <h4 class="doc-base-title">{{ label }}</h4>
  <el-select
    class="doc-base-select"
    v-model="localValue"
    placeholder="Select"
  >
    <el-option
      class="doc-base-option"
      v-for="item in optionList"
      :key="item.value"
      :label="displayLabel(item)"
      :value="item.value"
    >
      <div class="flex items-center">
        <el-badge
          v-if="showBadge"
          is-dot
          class="item"
          :color="item.value"
        ></el-badge>
        <span>{{ displayLabel(item) }}</span>
      </div>
    </el-option>
    <template #label>
      <el-badge
        v-if="showBadge"
        is-dot
        class="item"
        :color="localValue"
      ></el-badge>
      <span>{{ selectedStatusLabel }}</span>
    </template>
  </el-select>
</template>
<script lang="ts" setup>
import { ref, computed, defineProps, watch, defineEmits } from "vue";
interface DataOption {
  value: string | number;
  [key: string]: any; // 允许其他任意字段
}
// 定义接收的属性
const props = defineProps<{
  label: string | number;
  modelValue?: string | number;
  optionList: DataOption[];
  selectedStatusLabel: string;
  showBadge: boolean;
  displayLabel: (item: DataOption) => string;
}>();

// 定义 emit 事件
const emit = defineEmits(["update:modelValue"]);

// 定义本地状态以支持双向绑定
const localValue = ref(props.modelValue);

// 监听 props.modelValue 的变化，同步到 localValue
watch(
  () => props.modelValue,
  (newValue) => {
    localValue.value = newValue;
  }
);

// 当 localValue 变化时，触发 update:modelValue 事件，以支持双向绑定
watch(localValue, (newValue) => {
  emit("update:modelValue", newValue);
});
</script>
<style lang="scss" scoped></style>

<style lang="scss">
.doc-base-select
  .el-select__wrapper
  .el-select__selection
  .el-select__selected-item {
  display: flex;
  align-items: center;
  .el-badge {
    display: flex;
  }
  span {
    margin-left: 5px;
  }
}

.doc-base-option {
  div {
    display: flex;
    align-items: center;
    div {
      display: flex;
    }
    span {
      margin-left: 5px;
    }
  }
}
.doc-base-option.is-hovering {
  background-color: #f4fcff;
}
</style>
