<template>
  <div class="body-tools">
    <div class="title">数据结构</div>
    <div class="tools">
      <div @click="open_review_dialog"><PreView />预览</div>
      <div @click="open_json_exchange_dialog"><ExChange />JSON转数据结构</div>
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
              <div
                class="root-icon"
                v-if="props.tableData[0].id === scope.row.id"
              >
                <span>根目录</span>
              </div>
              <input
                v-else
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
                  v-for="(item, index) in props.tableData[0].id === scope.row.id
                    ? root_options
                    : options"
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
            v-if="['object', 'array', 'null'].includes(scope.row.t)"
          >
            {{ scope.row.default }}
          </div>
          <div v-else class="core-value">
            <div style="width: 100%">
              <CodeMirror
                v-model="scope.row.default"
                :enableNewLine="enableNewLine"
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
          <div>
            <el-tooltip
              content="添加相邻节点"
              placement="top"
              effect="light"
              v-if="props.tableData[0].id !== scope.row.id"
            >
              <el-icon
                @click="addNearNode(scope.row, scope.$index)"
                class="action-icon action-icon-plus"
                color="black"
                ><CirclePlus
              /></el-icon>
            </el-tooltip>
            <el-tooltip content="删除节点" placement="top" effect="light">
              <el-icon
                :class="{ 'top-icon': props.tableData[0].id === scope.row.id }"
                class="action-icon action-icon-close"
                @click="deleteNode(scope.row)"
                color="#FA8072"
                ><CircleClose
              /></el-icon>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <UnEditValue ref="unEditValueDialog"></UnEditValue>
  <JsonExchange
    v-model="json_exchange_model"
    ref="jsonExchangeValueDialog"
    @exchange_value="exchange_json_to_obj"
  ></JsonExchange>
</template>

<script setup lang="ts">
import { ref, toRefs, nextTick } from "vue";
import { useRoute } from "vue-router";
import Loading from "@/views/api/child_component/params_child/comp/loading.vue";
import CodeMirror from "../../code_mirror.vue";
import UnEditValue from "@/views/api/child_component/un_edit_value.vue";
import JsonExchange from "@/views/api/child_component/json_exchange_value.vue";
import SpecialButton from "@/components/common/button/special_button.vue";
import PreView from "@/assets/svg/common/preview.vue";
import ExChange from "@/assets/svg/common/exchange.vue";
import GlobalStatus from "@/global";
import { convertSchemaToObject } from "../object_to_string";
import { ApiGetSummarySource } from "@/api/interface/index";
const route = useRoute();
// 定义组件属性
const props = defineProps<{
  tableData: any[]; // 定义tableData属性为一个数组
  interface: number;
}>();
const emit = defineEmits(["exchange_json_value"]);
const json_exchange_model = ref(false);
const { tableData } = toRefs(props);
const unEditValueDialog: any = ref(null);
const jsonExchangeValueDialog: any = ref(null);
const loading = ref(false);
const enableNewLine = ref(true);
const root_options = [
  {
    value: "array",
    label: "array",
  },
  {
    value: "object",
    label: "object",
  },
];

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
    value: "object",
    label: "object",
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
    console.log(props.tableData[0]);
    
    unEditValueDialog.value.set_code(
      convertSchemaToObject(props.tableData[0], res)
    );
  });
}

function open_json_exchange_dialog() {
  jsonExchangeValueDialog.value.open_dialog();
}

function addFirstData() {
  const emptyNode = {
    id: getRandomInt(1000000, 10000000),
    name: "",
    t: "object",
    default: "{}",
    statement: "",
    children: [
      {
        id: getRandomInt(1000000, 10000000),
        name: "",
        t: "string",
        default: "",
        statement: "",
      },
    ],
  };
  props.tableData.push(emptyNode);
}

function deleteNode(current_node: any) {
  let fatherNode = findParentNode(props.tableData, current_node.id);
  if (fatherNode === null) {
    let deleteIndex = -1;
    for (var i = 0; i < props.tableData.length; i++) {
      if (props.tableData[i].id === current_node.id) {
        deleteIndex = i;
        break;
      }
    }
    if (deleteIndex !== -1) {
      props.tableData.splice(deleteIndex, 1);
    }
  } else {
    let deleteIndex = -1;
    for (var i = 0; i < fatherNode.children.length; i++) {
      if (fatherNode.children[i].id === current_node.id) {
        deleteIndex = i;
        break;
      }
    }
    if (deleteIndex !== -1) {
      fatherNode.children.splice(deleteIndex, 1);
      if (fatherNode.children.length === 0) {
        const emptyNode = {
          id: getRandomInt(1000000, 10000000),
          name: "",
          t: "string",
          default: "",
          statement: "",
        };
        fatherNode.children.push(emptyNode);
      }
    }
  }
}

function addNearNode(current_node: any, index: number) {
  let fatherNode = findParentNode(props.tableData, current_node.id);
  const emptyNode = {
    id: getRandomInt(1000000, 10000000),
    name: "",
    t: "string",
    default: "",
    statement: "",
  };

  if (fatherNode === null) {
    props.tableData.push(emptyNode);
  } else {
    fatherNode.children.splice(index, 0, emptyNode);
  }
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

// 定义组件事件
const handleCommand = (command: any) => {
  command[0].t = command[1].label;
  if (command[0].t === "null") {
    command[0].default = "null";
  }
  if (command[0].t === "object" || command[0].t === "array") {
    if (command[0].t === "object") {
      command[0].default = "{}";
    }
    if (command[0].t === "array") {
      command[0].default = "[]";
    }
    command[0]["children"] = [
      {
        id: getRandomInt(1000000, 10000000),
        name: "",
        t: "string",
        default: "",
        statement: "",
      },
    ];
  } else if (command[0].children) {
    command[0].default = "";
    delete command[0].children;
  }
};
async function exchange_json_to_obj(json_string: string) {
  json_exchange_model.value = false;
  loading.value = true;
  await nextTick();
  setTimeout(() => {
    emit("exchange_json_value", json_string, convertRoot);
    loading.value = false;
  }, 50);
}

function convertRoot(jsonString: string) {
  try {
    const data = JSON.parse(jsonString);
    const root = createRootNode(data);
    return root;
  } catch (error) {
    throw new Error("Invalid JSON input");
  }

  function createRootNode(value: any) {
    const rootNode: any = {
      id: getRandomInt(1000000, 10000000),
      name: "",
      statement: "",
      default: "",
    };

    if (value === null) {
      rootNode.t = "null";
      rootNode.default = "null";
    } else if (Array.isArray(value)) {
      rootNode.t = "array";
      rootNode.default = "[]";
      rootNode.children = convertArrayElements(value);
    } else if (typeof value === "object") {
      rootNode.t = "object";
      rootNode.default = "{}";
      rootNode.children = convertObjectProperties(value);
    } else {
      handlePrimitiveType(value, rootNode);
    }

    return rootNode;
  }

  function convertObjectProperties(obj: any) {
    return Object.entries(obj).map(([key, value]) => convertNode(value, key));
  }

  function convertArrayElements(arr: any) {
    return arr.map((item: any) => convertNode(item, ""));
  }

  function convertNode(value: any, name: any) {
    const node: any = {
      id: getRandomInt(1000000, 10000000),
      name,
      statement: "",
    };

    if (value === null) {
      node.t = "null";
      node.default = "null";
    } else if (Array.isArray(value)) {
      node.t = "array";
      node.default = "[]";
      node.children = convertArrayElements(value);
    } else if (typeof value === "object") {
      node.t = "object";
      node.default = "{}";
      node.children = convertObjectProperties(value);
    } else {
      handlePrimitiveType(value, node);
    }

    return node;
  }

  function handlePrimitiveType(value: any, node: any) {
    switch (typeof value) {
      case "string":
        node.t = "string";
        node.default = value;
        break;
      case "number":
        node.t = Number.isInteger(value) ? "integer" : "number";
        node.default = String(value);
        break;
      case "boolean":
        node.t = "boolean";
        node.default = String(value);
        break;
      default:
        node.t = "unknown";
        node.default = "";
    }
  }
}

function getRandomInt(min: any, max: any) {
  min = Math.ceil(min); // 确保min是整数
  max = Math.floor(max); // 确保max是整数
  return Math.floor(Math.random() * (max - min + 1)) + min; // 返回介于min和max之间的整数
}
</script>

<style lang="scss" scoped>
.top-icon {
  margin-left: 0px !important;
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

<style lang="scss"></style>
