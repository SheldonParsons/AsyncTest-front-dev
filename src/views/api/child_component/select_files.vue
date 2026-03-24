<template>
  <el-dialog
    v-model="props.modelValue"
    @close="emit('update:modelValue', false)"
    :show-close="false"
    width="1200px"
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
            >文件管理</span
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
    <FilesPage ref="filesPageRef" :selectable="true" :sync-route="false"></FilesPage>
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
          选择
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance } from "vue";
import FilesPage from "@/views/settings/source_management/files_child/files_index.vue";
const { proxy }: any = getCurrentInstance();
const filesPageRef: any = ref(null);
const emit = defineEmits(["update:modelValue", "choice_select"]);

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  }
});

function open_dialog() {
  emit('update:modelValue', true)
}
// 暴露给父组件调用
defineExpose({
  open_dialog,
});

function add_item() {
  const select = filesPageRef.value?.get_select()
  if (select.length === 0) {
    proxy.$message({
      message: "请至少选择一个文件",
      duration: 3000,
      type: "warning",
    });
  } else {
    emit('choice_select', select)
    filesPageRef.value?.clean_select()
    emit('update:modelValue', false)
  }
}
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
