<template>
  <div class="body-tools">
    <div class="title">表单键值对（混合类型数据）</div>
    <div class="tools">
      <div style="width: 300px">
        <el-input v-model="tableData.boundary" placeholder="boundary，为空时自动生成"></el-input>
      </div>
    </div>
  </div>
  <div class="private-table-outside">
    <el-table v-model:data="tableData.data" style="width: 100%" row-key="id" default-expand-all class="main-table"
      :show-header="false">
      <template #empty>
        <div v-if="loading">
          <Loading></Loading>
        </div>
        <SpecialButton v-else @click="addFirstData">添加数据</SpecialButton>
      </template>
      <el-table-column label="字段名" min-width="40%">
        <template #default="scope">
          <el-row style="width: 100%">
            <el-col :span="21">
              <input placeholder="字段名" v-model="scope.row.name" class="private-input" />
            </el-col>
          </el-row>
        </template>
      </el-table-column>
      <el-table-column label="类型" min-width="40%">
        <template #default="scope">
          <MotionDropdown :scope="scope" :data="options" @command="handleCommand"></MotionDropdown>
        </template>
      </el-table-column>
      <el-table-column label="请求值">
        <template #default="scope">
          <div class="private-deafult g-unselect" v-if="['null'].includes(scope.row.t)">
            {{ scope.row.default }}
          </div>
          <div v-else-if="['files'].includes(scope.row.t)" class="core-value">
            <div class="select-files-container">
              <div class="select-files" @click="open_file_select_dialog(scope.row.file_list)">
                选择文件
              </div>
              <div class="select-files-name" v-for="(item, index) in scope.row.file_list">
                {{ item.lose ? `文件不存在-（${item.name}）` : item.name }}
                <div class="close-div" @click="scope.row.file_list.splice(index, 1)">
                  <el-icon class="close-icon">
                    <CloseBold />
                  </el-icon>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="['array'].includes(scope.row.t)" class="core-value">
            <div style="width: 100%">
              <div v-for="(item, index) in scope.row.child_list" class="array-item">
                <CodeMirror v-model="scope.row.child_list[index]" :enableNewLine="false" :interface_id="interface">
                </CodeMirror>
                <div style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  ">
                  <el-icon @click="addArrayNode(scope.row.child_list, index)" class="action-icon action-icon-plus"
                    color="black">
                    <CirclePlus />
                  </el-icon>
                  <el-icon class="action-icon action-icon-close" @click="deleteArrayNode(scope.row.child_list, index)"
                    color="#FA8072">
                    <CircleClose />
                  </el-icon>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="core-value">
            <div style="width: 100%">
              <CodeMirror v-model="scope.row.default" :enableNewLine="false" :interface_id="interface"></CodeMirror>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="Content-Type" min-width="50%">
        <template #default="scope">
          <el-select v-model="scope.row.content_type" filterable :empty-values="[null, undefined]"
            :value-on-clear="null" clearable placeholder="Content-Type">
            <el-option v-for="item in content_type_options" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="50%">
        <template #default="scope">
          <input placeholder="说明" v-model="scope.row.statement" class="private-input" />
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="25%">
        <template #default="scope">
          <div style="display: flex;align-items: center;gap:3px" class="other-action">
            <motion.div :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.9 }"
              style="display: flex;align-items: center;justify-content: center;">
              <el-icon @click="addNearNode(scope.row, scope.$index)" size="16" class="action-icon action-icon-plus"
                color="#139659">
                <CirclePlus />
              </el-icon>
            </motion.div>
            <motion.div :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.9 }"
              style="display: flex;align-items: center;justify-content: center;">
              <el-icon class="action-icon action-icon-close" @click="deleteNode(scope.$index)" color="gray" size="16">
                <CircleCloseFilled />
              </el-icon>
            </motion.div>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <UnEditValue ref="unEditValueDialog"></UnEditValue>
  <FileDialog v-model="fileDialogModel" ref="fileDialogRef" @choice_select="choice_select_handle"></FileDialog>
</template>

<script setup lang="ts">
import { ref, toRefs, getCurrentInstance } from "vue";
import { motion } from "motion-v"
import Loading from "@/views/api/child_component/params_child/comp/loading.vue";
import CodeMirror from "../../code_mirror.vue";
import UnEditValue from "@/views/api/child_component/un_edit_value.vue";
import SpecialButton from "@/components/common/button/special_button.vue";
import GlobalStatus from "@/global";
import { convertSchemaToUrlencoded } from "../object_to_string";
import FileDialog from "@/views/api/child_component/select_files.vue";
import tools from "@/utils/tools";
import MotionDropdown from '@/views/api/child_context/req/body_child/comp/dropdown.vue'
// 定义组件属性
const props = defineProps<{
  tableData: any; // 定义tableData属性为一个数组
  interface: number;
}>();
const { proxy }: any = getCurrentInstance();
const { tableData } = toRefs(props);
const unEditValueDialog: any = ref(null);
const loading = ref(false);
const fileDialogModel = ref(false);
const fileDialogRef: any = ref(null);
const current_file_list: any = ref([]);
const boundary_text = ref("");

const content_type_options = GlobalStatus.regular_content_type_map();

const options = [
  {
    value: "string",
    label: "string",
  },
  {
    value: "integer",
    label: "integer",
  },
  {
    value: "boolean",
    label: "boolean",
  },
  {
    value: "number",
    label: "number",
  },
  {
    value: "array",
    label: "array",
  },
  {
    value: "null",
    label: "null",
  },
  {
    value: "files",
    label: "files",
  },
];

const typingAttrMapping: any = GlobalStatus.regular_type_info_map();
function open_review_dialog() {
  unEditValueDialog.value.open_dialog();
  const test_mapping = {
    name: "sheldon",
  };
  console.log(props.tableData);
  const res = convertSchemaToUrlencoded(props.tableData, test_mapping);
  unEditValueDialog.value.set_code(res);
}

function open_file_select_dialog(file_list: Array<any>) {
  current_file_list.value = file_list;
  fileDialogModel.value = true;
}

function choice_select_handle(file_list: Array<any>) {
  const new_items = file_list.filter(
    (item) =>
      !current_file_list.value.some(
        (current_item: any) => current_item.id === item.id
      )
  );
  current_file_list.value.push(...new_items);
}

function addFirstData() {
  console.log(props.tableData);

  const emptyNode = {
    id: getRandomInt(1000000, 10000000),
    name: "",
    t: "string",
    default: "",
    statement: "",
    content_type: "text/plain",
  };
  props.tableData.data.push(emptyNode);
}

function deleteNode(index: number) {
  props.tableData.data.splice(index, 1);
}

function addNearNode(current_node: any, index: number) {
  console.log(index);

  const emptyNode = {
    id: getRandomInt(1000000, 10000000),
    name: "",
    t: "string",
    default: "",
    statement: "",
    content_type: "text/plain",
  };
  props.tableData.data.splice(index + 1, 0, emptyNode);
}

function findParentNode(nodes: any[], targetId: number): any | null {
  for (let node of nodes) {
    if (node.id === targetId) {
      return null; // 找到了根节点，没有父节点
    }
    if (node.children) {
      for (let child of node.children) {
        if (child.id === targetId) {
          return node; // 找到了目标节点的父节点
        }
      }
      const parentNode = findParentNode(node.children, targetId);
      if (parentNode !== null) {
        return parentNode; // 在子节点中找到了父节点
      }
    }
  }
  return null; // 没有找到父节点
}

function addArrayNode(row: any, index: number) {
  row.push("");
}

function deleteArrayNode(row: any, index: number) {
  if (row.length === 1) {
    tools.message("请至少保留一项", proxy);
    return;
  }
  row.splice(index, 1);
}

// 定义组件事件
const handleCommand = (command: any) => {
  command[0].t = command[1].label;
  if (command[0].t === "null") {
    command[0].default = "null";
  }
  if (command[0].t === "array") {
    command[0]["child_list"] = [""];
  } else if (command[0].t === "files") {
    command[0]["file_list"] = [];
  } else if (command[0].child_list || command[0].file_list) {
    if (command[0].t !== "null") {
      command[0].default = "";
    }
    delete command[0].child_list;
    delete command[0].file_list;
  }
  if (command[0].t !== "files") {
    command[0].content_type = "text/plain";
  } else {
    command[0].content_type = null;
  }
};

function getRandomInt(min: any, max: any) {
  min = Math.ceil(min); // 确保min是整数
  max = Math.floor(max); // 确保max是整数
  return Math.floor(Math.random() * (max - min + 1)) + min; // 返回介于min和max之间的整数
}
</script>

<style lang="scss" scoped>
.close-div {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  cursor: pointer;
}

.select-files-container {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .select-files-name {
    justify-content: space-between;
    cursor: default;
    display: flex;
    align-items: center;
    border: 1px solid var(--border-color);
    padding: 0px 6px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    background-color: var(--default-bg);
    transition: color 0.4s ease-in-out;
    transition: background-color 0.3s ease, width 0.3s ease;
  }

  .select-files {
    width: 5em;
    border: 1px solid var(--border-color);
    padding: 0px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }
}

.body-tools {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--border-color);
  border-left: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  padding: 7px 12px;

  .title {
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
  }

  .tools {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;

    .preview-tool {
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 4px 8px;
      gap: 4px;
      border-radius: 8px;
    }

    .preview-tool:hover {
      background-color: var(--hover-bg);
    }
  }
}

.root-icon {
  display: flex;

  span {
    cursor: pointer;
    padding: 0px 3px;
    height: 20px;
    border-radius: 4px;
    font-size: 13px;
    background-color: var(--dark);
    color: white;
    display: flex;
    align-items: center;
  }
}

.core-value {
  display: flex;
  justify-content: start;
  align-items: center;
  gap: 4px;

  .array-item:not(:first-child) {
    margin-top: 5px;
  }

  .array-item {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
  }
}

.private-input {
  margin: 0;
  padding: 5px;
  border: none;
  border: 1px solid transparent;
  outline: none;
  background-color: transparent;
  font-size: 14px;
  width: 100%;
  border-radius: 8px;
  font-weight: 500;
  transition: border-color 0.3s ease, color 0.3s ease;
}

.private-input:hover,
.private-input:focus {
  color: var(--primary);
  border: 1px solid var(--border-color) !important;
  background-color: white;
}

.private-deafult {
  cursor: not-allowed;
  font-size: 15px;
  font-weight: 600;
  color: var(--primary);
}

.typing-span {
  cursor: pointer;
  display: flex;
  justify-self: center;
  align-items: center;
  height: 20px;
  font-weight: 600;
}

.custom-mini {
  width: 20px;
  height: 20px;
}

.custom-mini:hover {
  background-color: white;
  border-radius: 3px;
  cursor: pointer;
}

.action-icon {
  cursor: pointer;
}

.action-icon-close {
  margin-left: 3px;
}
</style>

<style lang="scss">
.main-table {
  .cell {
    padding: 1px;
  }
}
</style>
