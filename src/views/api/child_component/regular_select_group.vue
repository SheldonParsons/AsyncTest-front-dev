<template>
  <div class="doc-base-title">{{ label }}</div>
  <el-select v-model="localValue" placeholder="服务">
    <el-option-group
      v-for="(group, index) in options"
      :key="index"
      :label="group.label"
    >
      <el-option
        class="doc-base-option-mul"
        v-for="item in group.options"
        :key="item.id"
        :label="item.name"
        :value="item.name === '继承父类' ? 'inherit' : item.name"
      >
        <div class="flex items-center">
          <span>{{ item.name }}</span>
          <span class="items-server"> {{ item.prefix }} </span>
        </div>
      </el-option>
    </el-option-group>
  </el-select>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";

// 定义接收的属性
const props = defineProps<{
  label: string | number;
  modelValue?: string | number | Array<string>;
  options: any;
  showBadge: boolean;
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

:deep(.el-select__wrapper) {
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
</style>

<style lang="scss">
.items-center {
  gap: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .items-server {
    margin-left: auto;
    color: #999;
    font-size: 12px;
    transition: color 0.2s ease;
  }
}

.doc-base-select {
  .el-select__wrapper {
    .el-select__selection .el-select__selected-item {
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

.doc-base-option-mul {
  border-radius: 4px;
  margin: 2px 6px;
  padding: 8px 10px !important;
  transition: all 0.2s ease;
  min-height: 34px;
  display: flex;
  align-items: center;

  &.is-hovering {
    background: rgba(0, 0, 0, 0.04);
    transform: translateX(2px);

    .items-server {
      color: #666;
    }
  }

  &.is-selected {
    background: rgba(0, 0, 0, 0.08);
    font-weight: 500;
    color: #000000;

    .items-server {
      color: #000000;
    }
  }
}

.el-select-group__title {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(0, 0, 0, 0.02);
  border-left: 2px solid rgba(0, 0, 0, 0.15);
  margin: 2px 6px 2px 6px;
  height: 24px;
  line-height: 16px;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

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
