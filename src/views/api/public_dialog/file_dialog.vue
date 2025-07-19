<template>
  <el-dialog
    v-model="dialogVisible"
    :show-close="false"
    width="850"
    style="border-radius: 12px"
    class="process-dialog"
    :append-to-body="true"
  >
    <template #header="{ close, titleId, titleClass }">
      <el-row style="padding: 24px 24px 14px">
        <el-col :span="23"
          ><span
            style="
              color: rgba(16, 24, 40, 0.8);
              font-weight: 500;
              font-size: 16px;
              margin: 0px;
            "
            >{{ title }}</span
          ></el-col
        >
        <el-col
          :span="1"
          style="display: flex; justify-content: end; align-items: center"
          ><div class="del-process" @click="close">
            <el-icon :size="12"><CloseBold /></el-icon></div
        ></el-col>
      </el-row>
      <el-divider></el-divider>
    </template>
    <div class="file-content">
      <el-upload
        class="upload-demo"
        drag
        multiple
        :http-request="handleChange"
        :show-file-list="false"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖拽文件至此 或者 <em>点击 以上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            最多可上传{{ FILE_MAX_COUNT }}个文件，每个文件不超过{{
              FILE_MAX_SIZE / 1024 / 1024
            }}MB
          </div>
        </template>
      </el-upload>
      <div
        class="no-scroll file-list"
        style="overflow-y: scroll;"
      >
        <transition-group name="fade" appear>
          <div
            v-for="(item, index) in file_list.list"
            style="
              background-color: var(--default-bg);
              width: 100%;
              height: 50px;
              border-radius: 10px;
              display: flex;
              justify-content: center;
              align-items: center;
            "
          >
            <span style="width: 95%; font-size: 14px; font-weight: 600;padding: 5px;">{{
              item.name
            }}</span
            ><el-icon
              style="width: 5%; cursor: pointer"
              @click="removeFile(index)"
              ><CloseBold
            /></el-icon>
          </div>
        </transition-group>
      </div>
    </div>
    <template #footer>
      <div class="process-dialog-footer">
        <button class="process-dialog-btn cancel-btn" @click="handleClose">
          <span>取消</span>
        </button>
        <button
          class="process-dialog-btn add-btn"
          style="margin-left: 8px"
          @click="action()"
        >
          {{ action_title }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance, computed, reactive } from "vue";
import tools from "@/utils/tools";
const { proxy }: any = getCurrentInstance();
const core_value = ref("");
const file_list: any = reactive({
  list: [] as any,
});
const FILE_MAX_COUNT = 1;
const FILE_MAX_SIZE = 50 * 1024 * 1024;
// 使用v-model的props定义
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
  action_title: {
    type: String,
    default: "添加",
  },
  placeholder: {
    type: String,
    default: "",
  },
});
function action() {
  emit("action", file_list.list);
}

function removeFile(index: number) {
  file_list.list.splice(index, 1);
}

// 使用计算属性实现双向绑定
const dialogVisible = computed({
  get: () => {
    if (props.modelValue) {
      core_value.value = "";
    }
    return props.modelValue;
  },
  set: (value) => emit("update:modelValue", value),
});

// 统一关闭处理方法
const handleClose = () => {
  dialogVisible.value = false;
};

function handleChange(options: any) {
  console.log(options);

  const { file, onProgress, onSuccess, onError } = options;
  if (file_list.list.length === FILE_MAX_COUNT) {
    tools.message(`最大上传文件不能超过${FILE_MAX_COUNT}个`, proxy);
  } else if (options.file.size > FILE_MAX_SIZE) {
    tools.message(`文件最大不能超过${FILE_MAX_SIZE / 1024 / 1024}MB`, proxy);
  } else {
    file_list.list.push(file);
  }
}

// 定义emit事件
const emit = defineEmits(["update:modelValue", "action"]);
</script>

<style scoped lang="scss">
.file-list {
  width: 100%;
  margin-top: 10px;
}
.fade-enter-active {
  opacity: 1;
  transition: all 0.05s ease-in-out;
}
.fade-leave-active {
  opacity: 1;
  transition: all 0.3s linear;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
.upload-demo {
  width: 100%;
}
.file-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  flex-direction: column;
}
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
.el-divider--horizontal {
  margin: 0px !important;
}
</style>
