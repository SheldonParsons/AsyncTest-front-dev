<template>
  <div style="width: 100%" v-show="show">
    <CustomInputer v-model="internalValue" :allow-newline="props.enableNewLine"
      :height="props.enableNewLine ? '200px' : '38px'" :show-clear="false" :paddingX="5" :paddingY="3" :fontSize="12"
      style="border: 2px solid #f0f0f0; border-radius: 6px;background-color: white;">
      <template #suffix>
        <el-icon :size="18" @click="show_edit_value" style="cursor: pointer;">
          <FullScreen />
        </el-icon>
      </template>
    </CustomInputer>
  </div>

  <EditValue v-if="display === true" ref="editValueDialog" :displayParam="displayParam" :disableVar="props.disableVar"
    :canVar="canVar" :interface_id="interface_id" :disable="props.disable" @add_code="add_code"
    :enableNewLine="props.enableNewLine" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import EditValue from "@/views/api/child_component/edit_value.vue";
import tools from "@/utils/tools";
import CustomInputer from '@/components/common/input/CustomInput.vue'

const props = defineProps({
  modelValue: { type: String, default: "" },
  enableNewLine: { type: Boolean, default: true },
  display: { type: Boolean, default: true },
  displayParam: { type: Boolean, default: true },
  disable: { type: Boolean, default: false },
  disableVar: { type: Boolean, default: false },
  canVar: { type: Boolean, default: true },
  interface_id: { type: Number, default: -1 },
});

const emit = defineEmits(["update:modelValue"]);

// 1. 使用 internalValue 来承接 v-model，避免直接修改 props
const internalValue = ref(props.modelValue);
const show = ref(true);
const editValueDialog: any = ref(null);

// 同步 props 到 internalValue
watch(() => props.modelValue, (newVal) => {
  if (newVal !== internalValue.value) {
    internalValue.value = newVal;
  }
});

// 当 internalValue 变化时通知父组件
watch(internalValue, (newVal) => {
  emit("update:modelValue", newVal);
});

// 2. 暴露给外部调用的方法，直接操作字符串
defineExpose({
  add_content,
  set_content,
});

function add_content(content: string) {
  internalValue.value = (internalValue.value || '') + content;
}

function set_content(content: string) {
  internalValue.value = content || '';
}

// 修改弹窗回调
function add_code(content: any) {
  set_content(content);
}

function show_edit_value() {
  if (props.display === false) {
    tools.message("您无法在只读状态下编辑内容", null); // getCurrentInstance 代理有时不可靠，传 null 或直接引用
    return;
  }
  editValueDialog.value.open_dialog();
  // 直接传递当前的值给弹窗
  editValueDialog.value.set_code(internalValue.value);
}

// 删除了所有 initCodeMirror 相关的逻辑，因为它现在不再需要操作 DOM 插件
</script>

<style>
.singleton-tooltip {
  padding: 0px;
  border-radius: 10px;
}

.mirror-tooltip {
  display: flex;
  flex-direction: column;
  width: 300px;
  align-items: center;
  justify-content: start;

  .mirror-tooltip-header {
    width: calc(100% - 20px);
    height: 30px;
    display: flex;
    justify-content: start;
    align-items: center;
    font-size: 14px;
    padding: 5px 10px;
    font-weight: 500;
  }

  .mirror-tooltip-divider {
    width: 100%;
    border-bottom: 1px solid var(--border-color);
  }
}

.edit-div {
  display: flex;
  justify-content: center;
  margin-right: 5px;
  align-items: center;
}

.edit-div i {
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
}

.edit-div i:hover {
  background-color: var(--hover-bg);
}

.editor-container:hover {
  background-color: white;
}

.editor-container {
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  /* transition: border-color 0.3s ease, color 0.3s ease; */
  /* border: 1px solid transparent; */
  width: 100%;
  overflow: hidden;

  .cm-scroller {
    overflow: hidden;
  }

  .cm-content {
    padding: 0px;
  }

  .cm-editor {
    font-size: 12px;
    outline: unset;
  }
}

.cm-line {
  width: 100%;
  display: flex !important;
  align-items: center;
}

.cm-editor {
  width: 100%;
  height: 100% !important;
  /* 确保编辑器高度填满容器 */
  overflow: hidden !important;
  /* 隐藏滚动条 */
  white-space: nowrap !important;
  /* 禁止换行 */
}
</style>
