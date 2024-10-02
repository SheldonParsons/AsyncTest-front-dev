<template>
  <h4 class="doc-base-title">{{ label }}</h4>
  <el-select v-model="localValue" placeholder="Select">
    <el-option-group
      v-for="group in options"
      :key="group.label"
      :label="group.label"
    >
      <el-option
        class="doc-base-option-mul"
        v-for="item in group.options"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      >
        <div class="flex items-center">
          <span>{{item.label}}</span>
          <span
        style="
          float: right;
          color: var(--el-text-color-secondary);
          font-size: 13px;
        "
      >
        {{ item.desc }}
      </span>
        </div>
      </el-option>
    </el-option-group>
  </el-select>
</template>
<script lang="ts" setup>
import { ref, computed, defineProps, watch, defineEmits } from "vue";

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

.doc-base-option-mul.is-hovering {
  background-color: #f4fcff;
}
</style>
