<template>
  <h4 class="doc-base-title">{{ label }}</h4>
  <el-select multiple filterable v-model="localValue" placeholder="查找标签">
    <el-option
      class="doc-base-option-mul"
      v-for="item in optionList"
      :key="item.value"
      :label="displayLabel(item)"
      :value="item.value"
    >
      <div class="flex items-center">
        <span>{{ displayLabel(item) }}</span>
      </div>
    </el-option>
    <template #header>
      <el-button
        v-if="!isFooterEnter"
        text
        bg
        size="small"
        @click="isFooterEnter = !isFooterEnter"
      >
        Add an option
      </el-button>
      <template v-else>
        <el-input
          v-model="optionFooterName"
          class="option-input"
          placeholder="input option name"
          size="small"
        />
        <el-button type="primary" size="small" @click="onConfirmFooter">
          confirm
        </el-button>
        <el-button size="small" @click="isFooterEnter = !isFooterEnter"
          >cancel</el-button
        >
      </template>
    </template>
  </el-select>
</template>
<script lang="ts" setup>
import { ref, computed, defineProps, watch, defineEmits } from "vue";

const isFooterEnter = ref(false);

const optionFooterName = ref("");

interface DataOption {
  value: string | number;
  [key: string]: any; // 允许其他任意字段
}
// 定义接收的属性
const props = defineProps<{
  label: string | number;
  modelValue?: string | number | Array<string>;
  optionList: DataOption[];
  showBadge: boolean;
  displayLabel: (item: DataOption) => string;
}>();

// 定义 emit 事件
const emit = defineEmits(["update:modelValue", "footerEntry"]);

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

function onConfirmFooter() {
  emit("footerEntry", optionFooterName.value);
}
</script>
<style lang="scss" scoped>
.option-input {
  width: 100%;
  margin-bottom: 8px;
}
</style>

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

.doc-base-option-mul.is-hovering {
  background-color: #f4fcff;
}
</style>
