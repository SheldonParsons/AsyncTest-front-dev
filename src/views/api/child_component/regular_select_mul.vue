<template>
  <div class="doc-base-title">{{ label }}</div>
  <el-select multiple v-model="localValue" placeholder="查找标签" class="regular-mul-select">
    <el-option
      class="doc-base-option-mul"
      v-for="item in optionList"
      :key="item.id"
      :label="displayLabel(item)"
      :value="item.id"
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
        添加标签
      </el-button>
      <template v-else>
        <el-input
          v-model="optionFooterName"
          class="option-input"
          placeholder="请输入标签名"
          size="small"
        />
        <el-button type="primary" size="small" @click="onConfirmFooter">
          添加
        </el-button>
        <el-button size="small" @click="isFooterEnter = !isFooterEnter"
          >取消</el-button
        >
      </template>
    </template>
  </el-select>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";

const isFooterEnter = ref(false);

const optionFooterName = ref("");

interface DataOption {
  id: string | number;
  [key: string]: any; // 允许其他任意字段
}
// 定义接收的属性
const props = defineProps<{
  label: string | number;
  modelValue?: string | number | Array<string|number>;
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
  optionFooterName.value = ""
}
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

.option-input {
  width: 100%;
  margin-bottom: 8px;

  :deep(.el-input__wrapper) {
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: #ffffff;
    transition: all 0.2s ease;

    &:hover {
      border-color: rgba(0, 0, 0, 0.25);
    }

    &.is-focus {
      border-color: #1a1a1a;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
    }
  }
}
</style>

<style lang="scss">
.regular-mul-select {
  .el-select__wrapper {
    min-height: 36px!important;
    padding: 6px 12px!important;
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
    flex-wrap: wrap;
    gap: 0;

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

    .el-tag {
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.12);
      color: #1a1a1a;
      font-weight: 500;
      font-size: 13px;
      padding: 0 8px;
      margin: 2px 4px 2px 0;
      height: 22px;
      line-height: 22px;
      display: inline-flex;
      align-items: center;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.1);
        border-color: rgba(0, 0, 0, 0.2);
      }

      .el-tag__close {
        transition: all 0.2s ease;
        color: #666;
        margin-left: 4px;

        &:hover {
          background-color: rgba(0, 0, 0, 0.15);
          color: #000;
        }
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
  }

  &.is-selected {
    background: rgba(0, 0, 0, 0.08);
    font-weight: 500;
    color: #000000;
  }
}

.el-select-dropdown__header {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  margin-bottom: 4px;

  .el-button {
    border-radius: 4px;
    transition: all 0.2s ease;
    font-size: 13px;

    &:hover {
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }

    &--primary {
      background: #1a1a1a;
      border-color: #1a1a1a;
      color: #ffffff;

      &:hover {
        background: #000000;
        border-color: #000000;
      }
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