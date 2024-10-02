<template>
  <el-row style="margin-top: 20px">
    <el-col :span="24" class="table-col">
      <el-row style="margin-bottom: 1%">
        <el-col :span="24">
          <el-radio-group v-model="bodyType" @change="changeBodyType" is-button>
            <el-radio-button label="none" value="none" />
            <el-radio-button label="form-data" value="form-data" />
            <el-radio-button
              label="x-www-form-urlencoded"
              value="x-www-form-urlencoded"
            />
            <el-radio-button label="json" value="json" />
            <el-radio-button label="xml" value="xml" />
            <el-radio-button label="raw" value="raw" />
          </el-radio-group>
        </el-col>
      </el-row>
      <el-row v-show="bodyType == 'none'">
        <el-col :span="24">
          <div class="empty-body g-unselect">
            <span>该请求不传入body内容</span>
          </div>
        </el-col>
      </el-row>
      <el-table
        v-show="bodyType == 'json'"
        v-model:data="tableData"
        style="width: 100%; margin-bottom: 20px"
        row-key="id"
        border
        default-expand-all
        class="main-table"
      >
        <template #empty>
          <SpecialButton @click="addFirstData"
            >点击添加您的数据<el-icon><Plus /></el-icon
          ></SpecialButton>
        </template>
        <el-table-column label="参数名">
          <template #default="scope">
            <el-row style="width: 100%">
              <el-col :span="21">
                <input
                  placeholder="参数名"
                  v-model="scope.row.name"
                  class="private-input"
                />
              </el-col>
            </el-row>
          </template>
        </el-table-column>
        <el-table-column label="类型" min-width="30%">
          <template #default="scope">
            <el-dropdown trigger="click" @command="handleCommand">
              <span
                :style="{ color: typingAttrMapping[scope.row.type]['color'] }"
                class="typing-span"
                >{{ scope.row.type }}</span
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
        <el-table-column label="请求默认值" min-width="40%">
          <template #default="scope">
            <div
              class="private-deafult g-unselect"
              v-if="['object', 'array', 'null'].includes(scope.row.type)"
            >
              {{ scope.row.default }}
            </div>
            <CodeMirror
              v-else
              :doc="scope.row.default"
              @updateValue="updateJsonValue($event, scope.row, 'default')"
            ></CodeMirror>
          </template>
        </el-table-column>
        <el-table-column label="中文名" min-width="40%">
          <template #default="scope">
            <input
              placeholder="中文名"
              v-model="scope.row.chinese"
              class="private-input"
            />
          </template>
        </el-table-column>
        <el-table-column label="说明">
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
                @click="addNearNode(scope.row)"
                class="action-icon action-icon-plus"
                color="#009879"
                ><CirclePlus
              /></el-icon>
            </el-tooltip>
            <el-tooltip content="删除节点" placement="top" effect="light">
              <el-icon
                class="action-icon action-icon-close"
                @click="deleteNode(scope.row)"
                color="#FA8072"
                ><CircleClose
              /></el-icon>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-col>
  </el-row>
</template>
<script lang="ts" setup>
import {
  ref,
  reactive,
  defineProps,
  defineEmits,
  watchEffect,
  watch,
  toRefs,
} from "vue";
import CodeMirror from "../code_mirror.vue";
import SpecialButton from '@/components/common/button/special_button.vue'
const emit = defineEmits(["dataChange"]);
// 定义组件属性
const props = defineProps<{
  tableData: any[]; // 定义tableData属性为一个数组
}>();
const { tableData } = toRefs(props);

function addFirstData() {
  const emptyNode = {
    id: getRandomInt(1000000, 10000000),
    name: "",
    type: "string",
    default: "",
    statement: "",
    chinese: "",
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
          type: "string",
          default: "",
          statement: "",
          chinese: "",
        };
        fatherNode.children.push(emptyNode);
      }
    }
  }
  console.log(props.tableData);
}

function addNearNode(current_node: any) {
  let fatherNode = findParentNode(props.tableData, current_node.id);
  const emptyNode = {
    id: getRandomInt(1000000, 10000000),
    name: "",
    type: "string",
    default: "",
    statement: "",
    chinese: "",
  };
  if (fatherNode === null) {
    props.tableData.push(emptyNode);
  } else {
    fatherNode.children.push(emptyNode);
  }
  console.log(props.tableData);
}

function getRandomInt(min: any, max: any) {
  min = Math.ceil(min); // 确保min是整数
  max = Math.floor(max); // 确保max是整数
  return Math.floor(Math.random() * (max - min + 1)) + min; // 返回介于min和max之间的整数
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

function updateJsonValue(updateValue: any, row: any, key: any) {
  row[key] = updateValue[0];
  emit("dataChange", updateValue[0]);
}

// 定义组件事件
const handleCommand = (command: any) => {
  console.log(command);
  command[0].type = command[1].label;
  if (command[0].type === "object" || command[0].type === "array") {
    if (command[0].type === 'object') {
        command[0].default = '{}'
    }
    if (command[0].type === 'array') {
        command[0].default = '[]'
    }
    command[0]["children"] = [
      {
        id: getRandomInt(1000000, 10000000),
        name: "",
        type: "string",
        default: "",
        statement: "",
        chinese: "",
      },
    ];
  } else if (command[0].children) {
    delete command[0].children;
  }
};

const changeBodyType = (label: string) => {
  bodyType.value = label;
};
const bodyType = ref("json");

function changeBodyContent(value: any, row: any, key: any) {
  console.log(value);
  console.log(row);
  row[key] += value.data;
}

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

const typingAttrMapping: any = {
  string: {
    color: "#43CD80",
  },
  integer: {
    color: "#00CED1",
  },
  boolean: {
    color: "#FF6A6A",
  },
  number: {
    color: "#DA70D6",
  },
  array: {
    color: "#FFC125",
  },
  object: {
    color: "#64A1F9",
  },
  null: {
    color: "#8B795E",
  },
};
</script>
<style lang="scss" scoped>
.private-input {
  margin: 0;
  padding: 0;
  border: none;
  border-bottom: 1px solid transparent;
  outline: none;
  background-color: transparent;
  font-size: 15px;
  width: 100%;
  transition: border-color 0.3s ease, color 0.3s ease;
}
.private-input:hover {
  color: var(--primary);
  border-bottom: 1px solid var(--primary) !important;
}
.private-deafult {
  cursor: not-allowed;
  font-size: 15px;
  font-weight: 600;
  color: var(--primary);
}
.empty-body {
  border: 1px solid #dcdfe6;
  border-radius: 5px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 1em;
  cursor: not-allowed;
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
