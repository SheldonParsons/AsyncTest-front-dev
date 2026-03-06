<template>
  <el-row style="width: 100%">
    <el-col :span="24">
      <div
        style="padding: 10px; background-color: #f9fafb; border-radius: 10px"
      >
        <el-input
          @input="content_function"
          v-model="fixed_data"
          size="small"
          placeholder="请输入固定值"
        />
      </div>
    </el-col>
  </el-row>
  <div
    v-if="fixed_data === ''"
    style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100px;
    "
  >
    <Empty></Empty>
  </div>
  <div class="insert-main">
    <div class="process-func" v-if="fixed_data !== ''">
      <div class="process-container" v-if="process_list.length > 0">
        <div
          v-for="(item, index) in process_list"
          :key="index"
          @mouseover="hover_process = index"
          @mouseleave="hover_process = -1"
          @click="eidt_process_function_dialog(item, index)"
          class="process-item"
        >
          <el-row style="height: 100%">
            <el-col
              style="display: flex; justify-content: start; align-items: center"
              :span="11"
              ><span style="font-size: 12px; color: black">{{
                item.function_sign
              }}</span></el-col
            >
            <el-col
              style="display: flex; justify-content: end; align-items: center"
              :span="11"
              ><span style="font-size: 12px; color: #667085">{{
                item.desc
              }}</span></el-col
            >
            <el-col
              v-if="hover_process !== index"
              :span="2"
              style="display: flex; align-items: center; justify-content: end"
              ><el-icon :size="12"><ArrowRight /></el-icon
            ></el-col>
            <el-col
              v-if="hover_process === index"
              :span="2"
              style="display: flex; align-items: center; justify-content: end"
            >
              <div class="del-process" @click.stop="delete_process_item(index)">
                <el-icon :size="12"><CloseBold /></el-icon>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
      <button class="add-btn" @click="open_process_function_dialog">
        <el-icon><Plus /></el-icon><span>添加处理函数</span>
      </button>
    </div>
    <div class="expression" v-if="fixed_data !== ''">
      <el-row style="width: 100%">
        <el-col :span="24"
          ><div class="exp-div">
            表达式:
            <el-tooltip placement="top" effect="light">
              <template #content>
                <div
                  style="
                    max-width: 300px;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                  "
                >
                  {{ exp }}
                </div>
              </template>
              <div class="exp-span" style="font-weight: 500" @click="copy(exp)">
                {{ exp }}
              </div>
            </el-tooltip>
          </div></el-col
        >
      </el-row>
      <el-row style="width: 100%; margin-top: 7px">
        <el-col :span="24"
          ><div class="exp-div">
            预览:
            <el-tooltip placement="top" effect="light">
              <template #content>
                <div
                  style="
                    max-width: 300px;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                  "
                >
                  {{ preview }}
                </div>
              </template>
              <div
                class="exp-span"
                style="font-weight: 500"
                @click="copy(preview)"
              >
                {{ preview }}
              </div>
            </el-tooltip>
          </div></el-col
        >
      </el-row>
    </div>
    <div class="process-btn">
      <button @click="insert"><span>插入</span></button>
    </div>
  </div>
  <ProcessFunction
    ref="process_function_component"
    @add_process_function="add_process_function"
    @edit_process_function="edit_process_function"
  ></ProcessFunction>
</template>

<script setup lang="ts">
import { ref, watch, getCurrentInstance } from "vue";
import ProcessFunction from "../dialog_page/process_function.vue";
import * as InnerFunction from "../dialog_page/inner_function";
import tools from "@/utils/tools";
import Empty from "../comp/empty.vue";
import useClipboard from "vue-clipboard3/dist/esm/index.js";
const { proxy }: any = getCurrentInstance();
const hover_process: any = ref(-1);
const process_list: any = ref([]);
const exp = ref("");
const process_function_component: any = ref(null);
const preview = ref("");
const emit = defineEmits(["reload_height", "insert_action"]);
const cache_process_item_index: any = ref(null);

const fixed_data: any = ref("");

function content_function() {
  generation_expression();
  generation_preview(fixed_data.value);
  emit("reload_height");
}

// 监听数组变化
watch(
  [process_list],
  ([newList1], [oldList1]) => {
    if (fixed_data.value !== "") {
      generation_expression();
      generation_preview(fixed_data.value);
    }
    emit("reload_height");
  },
  { deep: true }
);
function insert() {
  if (exp.value === "") {
    tools.message("请正确补充完整必要信息", proxy, "info");
    return;
  }
  emit("insert_action", exp.value);
}

async function copy(value: String) {
  const { toClipboard } = useClipboard();
  await toClipboard(value.toString());
  tools.message("已复制", proxy, "success");
}

function generation_expression() {
  const start = "{{";
  const end = "}}";
  const name_list = process_list.value.map((item: any) => item.function_sign);
  const merged_array = [`'${fixed_data.value}'`].concat(name_list);
  exp.value = start + merged_array.join("|") + end;
}
function generation_preview(input_value: any) {
  process_list.value.forEach((process: any) => {
    const function_sign = modifyFunctionCalls(
      process.function_sign,
      input_value
    );
    const dynamicFunc = new Function(
      "InnerFunction",
      `return InnerFunction.${function_sign};`
    );
    input_value = dynamicFunc(InnerFunction); // 执行动态函数
  });
  preview.value = input_value;
  return input_value;
}

function modifyFunctionCalls(functionCallStr: string, value: string | number) {
  const input_value = convert(value);
  return functionCallStr.replace(
    /([a-zA-Z0-9]+)\(([^)]*)\)/g,
    (match, fnName, args) => {
      const newArgs =
        args.trim() === "" ? input_value : `${input_value}, ${args.trim()}`;
      return `${fnName}(${newArgs})`;
    }
  );
}

function convert(value: string | number) {
  // 判断输入是否是字符串
  if (typeof value === "string") {
    // 如果是字符串，且没有引号（即不是 'sheldon' 或 "sheldon"）
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value; // 如果已经是带引号的字符串，直接返回
    }
    return `'${value}'`; // 否则，转换成带引号的字符串
  }
  if (typeof value === "boolean") {
    return `'${value}'`;
  }

  // 如果是数字，直接返回
  if (typeof value === "number") {
    return value;
  }

  return value; // 其他类型直接返回
}

function open_process_function_dialog() {
  process_function_component.value?.open_dialog();
}

function eidt_process_function_dialog(item: any, index: any) {
  cache_process_item_index.value = index;
  process_function_component.value?.edit_dialog(item);
}

function add_process_function(data: any) {
  process_list.value.push(data);
  emit("reload_height");
}

function edit_process_function(data: any) {
  process_list.value[cache_process_item_index.value] = data;
}

function delete_process_item(index: any) {
  process_list.value.splice(index, 1);
  emit("reload_height");
}
// -------------- 内置函数 ----------------
</script>

<style lang="scss" scoped>
.content-name {
  height: 20px;
  line-height: 20px;
  margin: 0px;
  font-size: 12px;
  color: #344054;
}
.insert-main {
  display: flex;
  flex-direction: column;
  //   justify-content: end;
  //   height: 100%;
}
.process-btn {
  width: 100%;
  margin-top: 8px;
  button {
    border-radius: 8px;
    width: 100%;
    outline: 0;
    border: 1px solid transparent;
    color: #fff;
    background-color: black;
    font-weight: 400;
    height: 32px;
    font-size: 14px;
    cursor: pointer;
  }
  button:hover {
    background-color: rgb(56, 56, 56);
  }
}
.exp-div {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  display: flex;
}
.exp-span {
  cursor: pointer;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.exp-span:hover {
  text-decoration: underline dashed;
}
.expression {
  padding: 10px;
  background-color: #f2f2f2;
  font-size: 13px;
  border-radius: 8px;
  margin-top: 10px;
}
.del-process {
  padding: 3px;
  color: red;
  background-color: #f3f3f3;
  height: 12px;
  display: flex;
  align-items: center;
  border-radius: 3px;
}
.del-process:hover {
  background-color: #e6e6e6;
}
.process-container {
  display: flex;
  flex-direction: column;
  border: 1px solid #f2f4f7;
  border-radius: 8px;
  max-height: 200px;
  overflow: scroll;
  flex-wrap: nowrap;
}

.process-item {
  padding: 5px;
  background-color: #fff;
  height: 20px;
  cursor: pointer;
}

.process-container > .process-item:only-child {
  border-radius: 8px;
}

/* 当有两个元素时 */
.process-container:has(.process-item:nth-child(2)) .process-item:first-child {
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #f2f4f7;
}

.process-container:has(.process-item:nth-child(2)) .process-item:last-child {
  border-radius: 0 0 8px 8px;
}

/* 当有多个元素时 */
.process-container:has(.process-item:nth-child(n + 3))
  .process-item:first-child {
  border-radius: 8px 8px 0 0;
}

.process-container:has(.process-item:nth-child(n + 3))
  .process-item:last-child {
  border-radius: 0 0 8px 8px;
}

.process-container:has(.process-item:nth-child(n + 3))
  .process-item:not(:first-child):not(:last-child) {
  border-radius: 0;
  border-bottom: 1px solid #f2f4f7;
}

.process-func {
  padding: 8px;
  background-color: #f9fafb;
  border-radius: 8px;
  margin-top: 10px;
  .add-btn {
    margin-top: 5px;
    background-color: #f9fafb;
    height: 24px;
    padding: 8px 1px;
    font-weight: 400;
    font-size: 12px;
    line-height: 18px;
    border-radius: 6px;
    width: 100%;
    color: #667085;
    cursor: pointer;
    display: flex;
    justify-content: center;
    border: 0px;
    align-items: center;
  }
  .add-btn:hover {
    background-color: rgba(16, 24, 40, 0.04);
  }
}
.params-row {
  border: 1px solid #f2f4f7;
  border-radius: 5px;
  background-color: #f9fafb;
  padding: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  margin-top: 10px;
  cursor: pointer;
}
.show-content {
  margin-top: 10px;
  max-height: 200px;
  overflow: scroll;
}
</style>

<style lang="scss">
.el-input__wrapper {
  border-radius: 5px;
}
.el-input__wrapper.is-focus {
  box-shadow: 0 0 0 1px rgb(114, 114, 114);
}
.el-cascader-node.in-active-path,
.el-cascader-node.is-active,
.el-cascader-node.is-selectable.in-checked-path {
  color: black;
}
.el-cascader-node__label {
  font-size: 13px;
  font-weight: 500;
}
.el-cascader-node {
  height: 20px;
}
.el-cascader .el-input.is-focus .el-input__wrapper {
  box-shadow: 0 0 0 1px black;
}
.el-select__wrapper.is-focused {
  box-shadow: 0 0 0 1px black;
}
.el-cascader-node {
  margin-top: 10px;
}
.el-cascader-menu__wrap.el-scrollbar__wrap {
  height: 300px;
}
.el-popper.is-pure {
  border-radius: 12px;
}
.el-select-dropdown__item.is-selected {
  color: black;
}
</style>
