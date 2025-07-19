<template>
  <div class="body-tools">
    <div class="title">键值对（编码表单数据）</div>
    <div class="tools">
      <div @click="open_review_dialog"><PreView />预览</div>
    </div>
  </div>
  <div class="private-table-outside">
    <el-table
      v-model:data="tableData"
      style="width: 100%"
      row-key="id"
      default-expand-all
      class="main-table"
      :show-header="false"
    >
      <template #empty>
        <div v-if="loading">
          <Loading></Loading>
        </div>
        <SpecialButton v-else @click="addFirstData"
          >点击添加您的数据</SpecialButton
        >
      </template>
      <el-table-column label="字段名" min-width="40%">
        <template #default="scope">
          <el-row style="width: 100%">
            <el-col :span="21">
              <input
                placeholder="字段名"
                v-model="scope.row.name"
                class="private-input"
              />
            </el-col>
          </el-row>
        </template>
      </el-table-column>
      <el-table-column label="类型" min-width="20%">
        <template #default="scope">
          <el-dropdown
            trigger="click"
            class="no-scroll"
            @command="handleCommand"
          >
            <span
              :style="{
                color: typingAttrMapping[scope.row.t]['color'],
              }"
              class="typing-span"
              >{{ scope.row.t }}</span
            >
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  :command="[scope.row, item]"
                  v-for="(item, index) in options"
                  >{{ item.label }}</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
      <el-table-column label="请求值">
        <template #default="scope">
          <div
            class="private-deafult g-unselect"
            v-if="['null'].includes(scope.row.t)"
          >
            {{ scope.row.default }}
          </div>
          <div v-else-if="['array'].includes(scope.row.t)" class="core-value">
            <div style="width: 100%">
              <div
                v-for="(item, index) in scope.row.child_list"
                class="array-item"
              >
                <CodeMirror
                  v-model="scope.row.child_list[index]"
                  :enableNewLine="false"
                  :interface_id="interface"
                ></CodeMirror>
                <div
                  style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  "
                >
                  <el-icon
                    @click="addArrayNode(scope.row.child_list, index)"
                    class="action-icon action-icon-plus"
                    color="black"
                    ><CirclePlus
                  /></el-icon>
                  <el-icon
                    class="action-icon action-icon-close"
                    @click="deleteArrayNode(scope.row.child_list, index)"
                    color="#FA8072"
                    ><CircleClose
                  /></el-icon>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="core-value">
            <div style="width: 100%">
              <CodeMirror
                v-model="scope.row.default"
                :enableNewLine="false"
                :interface_id="interface"
              ></CodeMirror>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="50%">
        <template #default="scope">
          <input
            placeholder="说明"
            v-model="scope.row.statement"
            class="private-input"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="15%">
        <template #default="scope">
          <el-tooltip content="添加相邻节点" placement="top" effect="light">
            <el-icon
              @click="addNearNode(scope.$index)"
              class="action-icon action-icon-plus"
              color="black"
              ><CirclePlus
            /></el-icon>
          </el-tooltip>
          <el-tooltip content="删除节点" placement="top" effect="light">
            <el-icon
              class="action-icon action-icon-close"
              @click="deleteNode(scope.$index)"
              color="#FA8072"
              ><CircleClose
            /></el-icon>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <UnEditValue ref="unEditValueDialog"></UnEditValue>
</template>

<script setup lang="ts">
import { ref, toRefs, getCurrentInstance } from "vue";
import { useRoute } from "vue-router";
import Loading from "@/views/api/child_component/params_child/comp/loading.vue";
import CodeMirror from "../../code_mirror.vue";
import UnEditValue from "@/views/api/child_component/un_edit_value.vue";
import SpecialButton from "@/components/common/button/special_button.vue";
import PreView from "@/assets/svg/common/preview.vue";
import { convertSchemaToUrlencoded } from "../object_to_string";
import GlobalStatus from "@/global";
import tools from "@/utils/tools";
import { ApiGetSummarySource } from "@/api/interface/index";
const route = useRoute();
// 定义组件属性
const props = defineProps<{
  tableData: any[]; // 定义tableData属性为一个数组
  interface: number;
}>();
const { proxy }: any = getCurrentInstance();
const { tableData } = toRefs(props);
const unEditValueDialog: any = ref(null);
const loading = ref(false);

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
];
const typingAttrMapping: any = GlobalStatus.regular_type_info_map();
function open_review_dialog() {
  unEditValueDialog.value.open_dialog();
  const _data = {
    project: route.params.project,
    interface: props.interface,
    check_target: "get_variables",
  };
  ApiGetSummarySource(_data).then((res: any) => {
    unEditValueDialog.value.set_code(
      convertSchemaToUrlencoded(props.tableData, res)
    );
  });
}

function addFirstData() {
  const emptyNode = {
    id: getRandomInt(1000000, 10000000),
    name: "",
    t: "string",
    default: "",
    statement: "",
  };
  props.tableData.push(emptyNode);
}

function deleteNode(index: number) {
  props.tableData.splice(index, 1);
}

function addNearNode(index: number) {
  const emptyNode = {
    id: getRandomInt(1000000, 10000000),
    name: "",
    t: "string",
    default: "",
    statement: "",
  };
  props.tableData.splice(index + 1, 0, emptyNode);
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
  } else if (command[0].child_list) {
    if (command[0].t !== "null") {
      command[0].default = "";
    }
    delete command[0].child_list;
  }
};

function getRandomInt(min: any, max: any) {
  min = Math.ceil(min); // 确保min是整数
  max = Math.floor(max); // 确保max是整数
  return Math.floor(Math.random() * (max - min + 1)) + min; // 返回介于min和max之间的整数
}
</script>

<style lang="scss" scoped>
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
    div {
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 4px 8px;
      gap: 4px;
      border-radius: 8px;
    }
    div:hover {
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
