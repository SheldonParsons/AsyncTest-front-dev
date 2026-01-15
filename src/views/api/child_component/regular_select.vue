<template>
  <div class="doc-base-title">{{ label }}</div>
  <el-select class="doc-base-select" v-model="localValue" placeholder="Select">
    <el-option
      class="doc-base-option"
      v-for="item in optionList"
      :key="item.id"
      :label="displayLabel(item)"
      :value="item.id"
    >
      <div class="flex items-center">
        <el-badge
          v-if="showBadge"
          is-dot
          class="item"
          :color="item.color"
        ></el-badge>
        <span>{{ displayLabel(item) }}</span>
      </div>
    </el-option>
    <template #label>
      <el-badge
        v-if="showBadge"
        is-dot
        class="item"
        :color="current_color"
      ></el-badge>
      <span>{{ selectedStatusLabel }}</span>
    </template>
  </el-select>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";
interface DataOption {
  id: string | number;
  [key: string]: any; // 允许其他任意字段
}
// 定义接收的属性
const props = withDefaults(defineProps<{
  label: string | number;
  modelValue?: string | number;
  optionList: DataOption[];
  selectedStatusLabel: string;
  showBadge: boolean;
  displayLabel: (item: DataOption) => string;
}>(), {
  modelValue: '', // 或 0，根据你期望的默认类型来设置
});

const current_color = ref("");

function get_color(id: any): any {
  const found = props.optionList.find(item => item.id === id);
  return found?.color;
}

// 定义 emit 事件
const emit = defineEmits(["update:modelValue"]);

// 定义本地状态以支持双向绑定
const localValue = ref(props.modelValue);

// 监听 props.modelValue 的变化，同步到 localValue
watch(
  () => props.modelValue,
  (newValue) => {
    localValue.value = newValue;
    current_color.value = get_color(newValue);
  },
  { immediate: true }
);

// 当 localValue 变化时，触发 update:modelValue 事件，以支持双向绑定
watch(localValue, (newValue) => {
  emit("update:modelValue", newValue);
});
</script>
<style lang="scss" scoped>
.doc-base-title {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 8px;
  padding: 0 2px;
  display: flex;
  align-items: center;
  height: 22px;
  line-height: 22px;
}
</style>

<style lang="scss">
.doc-base-select {
  .el-select__wrapper {
    min-height: 36px;
    padding: 6px 12px;
    height: auto;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.25s ease;

    &:hover {
      border-color: rgba(0, 0, 0, 0.25);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    &.is-focused {
      border-color: #1a1a1a;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
    }
  }

  .el-select__selection {
    display: flex;
    align-items: center;

    .el-select__selected-item {
      display: flex;
      align-items: center;
      line-height: 1;

      .el-badge {
        display: flex;
        align-items: center;
      }

      span {
        margin-left: 6px;
        font-size: 14px;
        color: #1a1a1a;
        line-height: 1;
      }
    }
  }
}

.doc-base-option {
  border-radius: 4px;
  margin: 2px 6px;
  padding: 8px 10px !important;
  transition: all 0.2s ease;
  min-height: 34px;
  display: flex;
  align-items: center;

  div {
    display: flex;
    align-items: center;
    width: 100%;

    div {
      display: flex;
      align-items: center;
    }

    span {
      margin-left: 6px;
      font-size: 14px;
      color: #1a1a1a;
      line-height: 1;
    }
  }

  &.is-hovering {
    background: rgba(0, 0, 0, 0.04);
    transform: translateX(2px);
  }

  &.is-selected {
    background: rgba(0, 0, 0, 0.08);
    font-weight: 500;

    span {
      color: #000000;
    }
  }
}
</style>

<style lang="scss">
.el-select-dropdown {
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
