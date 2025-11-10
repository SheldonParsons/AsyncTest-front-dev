<template>
  <el-dialog
    v-model="visiable"
    :show-close="false"
    width="550"
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
            >处理函数</span
          ></el-col
        >
        <el-col :span="1" style="display: flex; justify-content: end"
          ><div class="del-process" @click="close">
            <el-icon :size="12"><CloseBold /></el-icon></div
        ></el-col>
      </el-row>
    </template>
    <div class="process-dialog-content">
      <div class="process-function-content">
        <div
          class="process-function-item"
          v-for="(item, index) in process_function_list"
          :key="index"
          :class="{
            'active-process': choice_process_function.name === item.name,
          }"
          @click="choice_process_function = item"
        >
          <div>{{ item.name }}</div>
          <div v-if="item.name === 'substr'">
            <el-input-number
              v-model="item.start"
              :min="1"
              :max="1000"
              size="small"
              placeholder="start"
              controls-position="right"
            />
            <el-input-number
              style="margin-left: 5px"
              v-model="item.end"
              :min="1"
              :max="1000"
              size="small"
              placeholder="end"
              controls-position="right"
            />
          </div>
          <div v-else-if="item.name === 'sha'">
            <el-select
              v-model="item.value"
              placeholder="Select"
              size="small"
              style="width: 140px"
            >
              <el-option
                v-for="item in ['sha1', 'sha224', 'sha256', 'sha384', 'sha512']"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </div>
          <div v-else-if="item.name === 'concat'">
            <el-input
              v-model="item.value"
              style="width: 140px"
              size="small"
              placeholder="要在尾部连接的字符串"
            />
          </div>
          <div v-else-if="item.name === 'lconcat'">
            <el-input
              v-model="item.value"
              style="width: 140px"
              size="small"
              placeholder="要在头部连接的字符串"
            />
          </div>
          <div v-else-if="item.name === 'padStart'">
            <el-input-number
              v-model="item.length"
              :min="1"
              :max="1000"
              size="small"
              placeholder="填充长度"
              controls-position="right"
            />
            <el-input
              v-model="item.char"
              style="width: 140px; margin-left: 5px"
              size="small"
              placeholder="填充字符串"
            />
          </div>
          <div v-else-if="item.name === 'padEnd'">
            <el-input-number
              v-model="item.length"
              :min="1"
              :max="1000"
              size="small"
              placeholder="填充长度"
              controls-position="right"
            />
            <el-input
              v-model="item.char"
              style="width: 140px; margin-left: 5px"
              size="small"
              placeholder="填充字符串"
            />
          </div>
          <div v-else style="color: #667085; font-size: 14px">
            {{ item.desc }}
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="process-dialog-footer">
        <button class="process-dialog-btn cancel-btn" @click="visiable = false">
          <span>取消</span>
        </button>
        <button
          v-if="choice_process_function === -1 && is_edit === false"
          class="process-dialog-btn disabled-btn"
          disabled
          style="margin-left: 8px"
        >
          添加
        </button>
        <button
          v-if="choice_process_function === -1 && is_edit === true"
          class="process-dialog-btn disabled-btn"
          disabled
          style="margin-left: 8px"
        >
          修改
        </button>
        <button
          v-if="choice_process_function !== -1 && is_edit === false"
          class="process-dialog-btn add-btn"
          style="margin-left: 8px"
          @click="add_item()"
        >
          添加
        </button>
        <button
          v-if="choice_process_function !== -1 && is_edit === true"
          class="process-dialog-btn add-btn"
          style="margin-left: 8px"
          @click="edit_item()"
        >
          修改
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, getCurrentInstance } from "vue";
import tools from "@/utils/tools";
const { proxy }: any = getCurrentInstance();
const visiable = ref(false);
const choice_process_function: any = ref(-1);
const is_edit = ref(false)

const emit = defineEmits(["add_process_function","edit_process_function"]);

function initial() {
  choice_process_function.value = -1;
}

watch(visiable, (val) => {
  if (val === true && is_edit.value === false) {
    initial();
  }
});

const process_function_list = ref([
  {
    name: "md5",
    desc: "md5加密",
  },
  {
    name: "lower",
    desc: "所有字母变成小写",
  },
  {
    name: "upper",
    desc: "所有字母变成大写",
  },
  {
    name: "number",
    desc: "字符串转换为数字类型",
  },
  {
    name: "length",
    desc: "数据长度",
  },
  {
    name: "substr",
    desc: "截取部分字符串",
    start: null,
    end: null,
  },
  {
    name: "sha",
    desc: "sha加密",
    value: "sha1",
  },
  {
    name: "base64",
    desc: "base64编码",
  },
  {
    name: "unbase64",
    desc: "base64解码",
  },
  {
    name: "encodeUriComponent",
    desc: "URI 编码",
  },
  {
    name: "decodeUriComponent",
    desc: "URI 解码",
  },
  {
    name: "concat",
    desc: "字符串拼接",
    value: "",
  },
  {
    name: "lconcat",
    desc: "字符串左侧拼接",
    value: "",
  },
  {
    name: "padStart",
    desc: "字符串左侧填充",
    length: null,
    char: "",
  },
  {
    name: "padEnd",
    desc: "字符串右侧填充",
    length: null,
    char: "",
  },
]);

function add_item() {
  if (check(choice_process_function.value) === false) {
    tools.message("请填写必要的信息", proxy,'info');
    return;
  }
  choice_process_function.value["function_sign"] = get_function_sign_string(choice_process_function.value)
  visiable.value = false
  emit("add_process_function", choice_process_function.value);
}
function edit_item() {
  if (check(choice_process_function.value) === false) {
    tools.message("请填写必要的信息", proxy,'info');
    return;
  }
  choice_process_function.value["function_sign"] = get_function_sign_string(choice_process_function.value)
  visiable.value = false
  emit("edit_process_function", choice_process_function.value);
}
function get_function_sign_string(item: any) {
  let args_string = ""
  if (item.name === "substr") {
    args_string = `${item.start},${item.end}`;
  }
  if (item.name === "sha") {
    args_string = `'${item.value}'`;
  }
  if (item.name === "concat" || item.name === "lconcat") {
    args_string = `'${item.value}'`;
  }
  if (item.name === "padStart" || item.name === "padEnd") {
    args_string = `${item.length},'${item.char}'`;
  }
  return `${item.name}(${args_string})`;
}

function check(item: any) {
  if (item.name === "substr") {
    if (item.start === null || item.end === null) {
      return false;
    }
  }
  if (item.name === "sha") {
    if (item.value === "") {
      return false;
    }
  }
  if (item.name === "concat" || item.name === "lconcat") {
    if (item.value === "") {
      return false;
    }
  }
  if (item.name === "padStart" || item.name === "padEnd") {
    if (item.length === null || item.char === "") {
      return false;
    }
  }
  return true;
}

function open_dialog() {
  visiable.value = true;
  is_edit.value = false
}

function edit_dialog(item: any) {
  visiable.value = true;
  choice_process_function.value = item
  is_edit.value = true
}
// 暴露给父组件调用
defineExpose({
  open_dialog,
  edit_dialog
});
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
