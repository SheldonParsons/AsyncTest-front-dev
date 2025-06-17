<template>
  <el-dialog
    v-model="props.modelValue"
    @close="emit('update:modelValue', false)"
    :show-close="false"
    width="850"
    style="border-radius: 12px"
    class="process-dialog"
  >
    <template #header="{ close, titleId, titleClass }">
      <el-row style="padding: 24px 24px 0px">
        <el-col :span="23"
          ><span
            style="
              color: rgba(16, 24, 40, 0.8);
              font-weight: 500;
              font-size: 16px;
              margin: 0px;
            "
            >通过 JSON 生成对象</span
          ></el-col
        >
        <el-col
          :span="1"
          style="display: flex; justify-content: end; align-items: center"
          ><div class="del-process" @click="close">
            <el-icon :size="12"><CloseBold /></el-icon></div
        ></el-col>
      </el-row>
    </template>
    <div class="process-dialog-content">
      <div style="width: 100%; border: 1px solid #f3f5f6; border-radius: 10px">
        <NewJsonEditor ref="ediorText" v-model="code"></NewJsonEditor>
      </div>
    </div>
    <template #footer>
      <div class="process-dialog-footer">
        <button class="process-dialog-btn cancel-btn" @click="emit('update:modelValue', false)">
          <span>取消</span>
        </button>
        <button
          class="process-dialog-btn add-btn"
          style="margin-left: 8px"
          @click="add_item()"
        >
          转换
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, getCurrentInstance } from "vue";
import NewJsonEditor from "@/components/common/editor/NewJsonEditor.vue";
const { proxy }: any = getCurrentInstance();
const ediorText: any = ref(null);
const code = ref("");
const emit = defineEmits(["update:modelValue","exchange_value"]);

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  }
});

function add_item() {
  code.value = ediorText.value?.get_value();
  try {
    JSON.parse(code.value);
    emit("exchange_value", code.value);
  } catch (error) {
    proxy.$message({
      message: "该字符串不为标准的json字符串，无法转换",
      duration: 3000,
      type: "warning",
    });
  }
}

function open_dialog() {
  ediorText.value?.clean_value();
  emit('update:modelValue', true)
}
// 暴露给父组件调用
defineExpose({
  open_dialog,
  insert_code,
  set_code,
});

function insert_params(text: string) {
  insert_code(text);
}

function set_code(text: string) {
  code.value = text;
}

function insert_code(text: string) {
  ediorText.value?.insertText(text);
}
async function code_change(value: string) {}
</script>

<style scoped lang="scss">
.process-dialog-footer {
  padding-top: 0px;
  padding-right: 24px;
  padding-left: 24px;
  padding-bottom: 24px;
  .process-dialog-btn {
    -webkit-appearance: button;
    outline: 0;
    white-space: nowrap;
    text-align: center;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
    height: 32px;
    padding: 4px 15px 4px 15px;
    font-size: 14px;
    border-radius: 8px;
  }
  .cancel-btn:hover {
    background-color: #fff;
    border-color: #d0d5dd;
    color: #344054;
  }
  .cancel-btn {
    color: #344054;
    background-color: #fff;
    border-color: #eaecf0;
  }
  .add-btn {
    color: #fff;
    background-color: black;
    border-color: #eaecf0;
  }
  .add-btn:hover {
    background-color: rgb(46, 46, 46);
  }
  .disabled-btn {
    color: rgba(16, 24, 40, 0.24);
    background-color: #f9fafb;
    border-color: #f9fafb;
    cursor: not-allowed;
  }
}

.process-dialog-content {
  padding: 24px;
  font-size: 14px;
  .editor-header {
    height: 2.5rem;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    flex-flow: wrap;
    min-width: 0;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    flex-wrap: nowrap;
    border-bottom: 1px solid #f3f5f6;
  }
}
.del-process {
  padding: 3px;
  color: black;
  width: 12px;
  background-color: #fff;
  height: 12px;
  display: flex;
  align-items: center;
  border-radius: 3px;
  cursor: pointer;
}
.del-process:hover {
  background-color: #f3f3f3;
}
</style>

<style lang="scss">
.process-dialog {
  .el-dialog__header {
    padding: 0px;
  }
}
</style>
