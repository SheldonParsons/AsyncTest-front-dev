<template>
  <el-dialog
    v-model="visiable"
    :show-close="false"
    width="350"
    style="border-radius: 12px"
    class="process-dialog"
    :modal="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <el-row style="padding: 15px">
        <el-col :span="23"
          ><span
            style="
              color: rgba(16, 24, 40, 0.8);
              font-weight: 500;
              font-size: 16px;
              margin: 0px;
            "
            >添加执行步骤</span
          ></el-col
        >
        <el-col :span="1" style="display: flex; justify-content: end;align-items: center;"
          ><div class="del-process" @click="close">
            <el-icon :size="12"><CloseBold /></el-icon></div
        ></el-col>
      </el-row>
    </template>
    <div style="padding: 10px">
      <div class="grid-item">
        <div v-if="false" class="read-dynamic-value w-med" @click="addAction('database')">
          <el-row style="width: 100%">
            <el-col :span="9"><h1>Database</h1></el-col>
            <el-col
              :span="15"
              style="
                display: flex;
                flex-direction: column;
                justify-content: center;
              "
            >
              <el-row style="width: 100%">
                <el-col :span="24"
                  ><span style="font-weight: 500; color: black"
                    >数据库操作</span
                  ></el-col
                >
              </el-row>
              <el-row style="width: 100%">
                <el-col :span="24"
                  ><span
                    style="color: #667085; font-size: 12px; font-weight: 400"
                    >连接数据库读取数据</span
                  ></el-col
                >
              </el-row>
            </el-col>
          </el-row>
        </div>
        <div class="read-dynamic-value w-med" @click="addAction('script')">
          <el-row style="width: 100%">
            <el-col :span="9"><h1>Script</h1></el-col>
            <el-col
              :span="15"
              style="
                display: flex;
                flex-direction: column;
                justify-content: center;
              "
            >
              <el-row style="width: 100%">
                <el-col :span="24"
                  ><span style="font-weight: 500; color: black"
                    >自定义脚本</span
                  ></el-col
                >
              </el-row>
              <el-row style="width: 100%">
                <el-col :span="24"
                  ><span
                    style="color: #667085; font-size: 12px; font-weight: 400"
                    >Python脚本自定义处理数据</span
                  ></el-col
                >
              </el-row>
            </el-col>
          </el-row>
        </div>
        <div class="read-dynamic-value w-med" @click="addAction('wait')">
          <el-row style="width: 100%">
            <el-col :span="9"><h1>Waiting</h1></el-col>
            <el-col
              :span="15"
              style="
                display: flex;
                flex-direction: column;
                justify-content: center;
              "
            >
              <el-row style="width: 100%">
                <el-col :span="24"
                  ><span style="font-weight: 500; color: black"
                    >等待时间</span
                  ></el-col
                >
              </el-row>
              <el-row style="width: 100%">
                <el-col :span="24"
                  ><span
                    style="color: #667085; font-size: 12px; font-weight: 400"
                    >强制暂停脚本进行等待</span
                  ></el-col
                >
              </el-row>
            </el-col>
          </el-row>
        </div>
        <div v-if="after" class="read-dynamic-value w-med" @click="addAction('extract')">
          <el-row style="width: 100%">
            <el-col :span="9"><h1>Extract</h1></el-col>
            <el-col
              :span="15"
              style="
                display: flex;
                flex-direction: column;
                justify-content: center;
              "
            >
              <el-row style="width: 100%">
                <el-col :span="24"
                  ><span style="font-weight: 500; color: black"
                    >提取变量</span
                  ></el-col
                >
              </el-row>
              <el-row style="width: 100%">
                <el-col :span="24"
                  ><span
                    style="color: #667085; font-size: 12px; font-weight: 400"
                    >从接口中提取内容作为变量</span
                  ></el-col
                >
              </el-row>
            </el-col>
          </el-row>
        </div>
        <div v-if="false" class="read-dynamic-value w-med" @click="addAction('assertion')">
          <el-row style="width: 100%">
            <el-col :span="9"><h1>Assertion</h1></el-col>
            <el-col
              :span="15"
              style="
                display: flex;
                flex-direction: column;
                justify-content: center;
              "
            >
              <el-row style="width: 100%">
                <el-col :span="24"
                  ><span style="font-weight: 500; color: black"
                    >断言</span
                  ></el-col
                >
              </el-row>
              <el-row style="width: 100%">
                <el-col :span="24"
                  ><span
                    style="color: #667085; font-size: 12px; font-weight: 400"
                    >断言接口或变量值</span
                  ></el-col
                >
              </el-row>
            </el-col>
          </el-row>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, getCurrentInstance } from "vue";
import Equal from "@/assets/svg/common/equal.vue";
import tools from "@/utils/tools";
const { proxy }: any = getCurrentInstance();
const visiable = ref(false);

const props = defineProps({
  after: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "add_process_function",
  "edit_process_function",
  "add_action",
]);

function open_dialog() {
  visiable.value = true;
}
// 暴露给父组件调用
defineExpose({
  open_dialog,
});

function addAction(type: string) {
  emit("add_action", type);
  visiable.value = false
}
</script>

<style scoped lang="scss">
.grid-item {
  display: grid;
  gap: 10px;
  .read-dynamic-value {
    border-radius: 10px;
    border-style: solid;
    border-width: 1px;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    transition: all 0.1s;
    display: flex;
    cursor: pointer;
    height: 50px;
    h1 {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Playball", cursive;
      font-size: 2em;
      font-weight: 700;
      text-align: center;
      margin: 0.25em 0; // Cosmetic value
    }
  }
  .w-var {
    background-color: rgba(3, 158, 116, 0.04);
    border-color: rgba(3, 158, 116, 0.04);
    h1 {
      color: #2ecc71;
    }
  }
  .w-med {
    background-color: rgba(81, 81, 81, 0.04);
    border-color: rgba(57, 57, 57, 0.04);
    h1 {
      color: black;
    }
  }
  .w-equal {
    background-color: white;
    border-color: #f2f4f7;
  }
  .w-equal:hover {
    background-color: rgba(87, 87, 87, 0.08);
  }
  .w-med:hover {
    background-color: rgba(50, 50, 50, 0.08);
  }
  .w-var:hover {
    background-color: rgba(3, 158, 116, 0.08);
  }
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
  .process-function-content {
    border: 1px solid #eaecf0;
    border-radius: 10px;
    padding: 4px;
    height: 100%;
    .process-function-item {
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 12px;
      cursor: pointer;
    }
    .process-function-item:hover {
      background: rgba(16, 24, 40, 0.05);
    }
    .active-process {
      background: #f2f4f7;
    }
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
