<template>
  <div class="body-tools">
    <div class="title">数据结构 <span v-if="dsName.length > 0"> （{{ dsName }}）</span></div>
    <div class="tools">
      <div @click="open_review_dialog" v-if="can_show_ds_detail">
        <PreView />预览
      </div>
      <div @click="open_json_exchange_dialog" v-if="can_show_ds_detail && inOuter === false">
        <ExChange />JSON转数据结构
      </div>
    </div>
  </div>
  <div class="private-table-outside">
    <el-table v-model:data="tableData" style="width: 100%" row-key="id" default-expand-all class="main-table no-scroll"
      :show-header="false">
      <template #empty>
        <div v-if="loading">
          <Loading></Loading>
        </div>
        <SpecialButton v-if="!loading && can_show_ds_detail" @click="addFirstData">添加数据</SpecialButton>
      </template>
      <el-table-column label="字段名" min-width="40%">
        <template #default="scope">
          <el-row style="width: 100%">
            <el-col :span="21">
              <div class="root-icon" v-if="props.tableData[0].id === scope.row.id">
                <span>根目录</span>
              </div>
              <input v-else placeholder="字段名" v-model="scope.row.name" class="private-input" />
            </el-col>
          </el-row>
        </template>
      </el-table-column>
      <el-table-column label="类型" min-width="30%">
        <template #default="scope">
          <MotionDropdown :can_show_ds_detail="can_show_ds_detail" :scope="scope" :inOuter="inOuter" :data="props.tableData[0].id === scope.row.id
            ? root_options
            : options" @command="handleCommand" :excluded_ids="excluded_ids"></MotionDropdown>
        </template>
      </el-table-column>
      <el-table-column label="请求值">
        <template #default="scope">
          <div class="private-deafult g-unselect"
            v-if="['object', 'array', 'null', 'ds'].includes(scope.row.t) && scope.row.t !== 'ds'">
            {{ scope.row.default }}
          </div>
          <div v-if="scope.row.t === 'ds' && can_show_ds_detail" @click.stop class="ds-detail-btn" style="width: 30px;">
            <DsDetail :index="inOuter ? scope.row.ds_target : scope.row.ds_id" :inOuter="inOuter">
            </DsDetail>
          </div>
          <div v-if="!['object', 'array', 'null', 'ds'].includes(scope.row.t)" class="core-value">
            <div style="width: 100%">
              <CodeMirror :display="can_show_ds_detail" v-model="scope.row.default" :enableNewLine="enableNewLine"
                :interface_id="interface">
              </CodeMirror>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="50%">
        <template #default="scope">
          <CodeMirror :display="can_show_ds_detail" v-model="scope.row.statement" :enableNewLine="enableNewLine"
            :disable="can_show_ds_detail === false || inOuter === true" :canVar="false" :displayParam="false">
          </CodeMirror>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="20%" v-if="inOuter === false && can_show_ds_detail === true">
        <template #default="scope">
          <div style="display: flex;align-items: center;gap:3px" class="other-action">
            <motion.div v-if="props.tableData[0].id !== scope.row.id" :while-hover="{ scale: 1.05 }"
              :while-press="{ scale: 0.9 }" style="display: flex;align-items: center;justify-content: center;">
              <el-icon @click="addNearNode(scope.row, scope.$index)" size="16" class="action-icon action-icon-plus"
                color="#139659">
                <CirclePlus />
              </el-icon>
            </motion.div>
            <motion.div :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.9 }"
              style="display: flex;align-items: center;justify-content: center;">
              <el-icon :class="{ 'top-icon': props.tableData[0].id === scope.row.id }"
                class="action-icon action-icon-close" @click="deleteNode(scope.row)" color="gray" size="16">
                <CircleCloseFilled />
              </el-icon>
            </motion.div>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <UnEditValue ref="unEditValueDialog"></UnEditValue>
  <JsonExchange v-model="json_exchange_model" ref="jsonExchangeValueDialog" @exchange_value="exchange_json_to_obj">
  </JsonExchange>
</template>

<script setup lang="ts">
import { ref, toRefs, nextTick, onMounted } from "vue";
import { motion } from 'motion-v'
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
import DsDetail from '@/views/api/child_context/req/body_child/comp/ds_detail.vue'
import { ApiGetSummarySource } from "@/api/interface/index";
import MotionDropdown from '@/views/api/child_context/req/body_child/comp/dropdown.vue'
import tools from '@/utils/tools'
import { ApiDsMixin, } from '@/api/ds/index'
const route = useRoute();
// 定义组件属性
const props = defineProps(
  {
    tableData: {
      type: null
    },
    interface: {
      type: Number,
      default: -1,
    },
    canRootDs: {
      type: Boolean,
      default: true
    },
    excluded_ids: {
      type: Array<Number>,
      default: []
    },
    can_show_ds_detail: {
      type: Boolean,
      default: true
    },
    inOuter: {
      type: Boolean,
      default: false
    },
    dsName: {
      type: String,
      default: ""
    }
  }
);
const emit = defineEmits(["exchange_json_value"]);
const json_exchange_model = ref(false);
const { tableData } = toRefs(props);
const unEditValueDialog: any = ref(null);
const jsonExchangeValueDialog: any = ref(null);
const loading = ref(false);
const enableNewLine = ref(true);
var root_options = [
  {
    value: "array",
    label: "array",
  },
  {
    value: "object",
    label: "object",
  },
  {
    value: 'ds',
    label: '引用模型'
  }
];

onMounted(() => {
  if (props.canRootDs === false) {
    root_options = root_options.filter((item: any) => {
      return item.value !== 'ds'
    })
  }
})

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
  {
    value: 'ds',
    label: '引用模型'
  }
];

const typingAttrMapping: any = GlobalStatus.regular_type_info_map();

function can_show_ds_target() {
  if (props.can_show_ds_detail === false && props.tableData && props.tableData.length > 0 && ('ds_target' in props.tableData[0] || 'name' in props.tableData[0])) {
    return true
  }
  return false
}

function get_ds_target() {
  return ` （${props.tableData[0].name}）`
}

const is_loading_preview = ref(false)
async function open_review_dialog() {
  if (is_loading_preview.value) {
    window.$toast({ title: '正在加载预览信息，请勿重复提交' })
    return
  }
  is_loading_preview.value = true
  const preview_data = {
    type: 0,
    child_action_type: "generate_review",
    content: {
      json_data: props.tableData,
      is_outer_ds: props.inOuter,
      project: route.params.project
    }
  }
  const res = await tools.send(ApiDsMixin, preview_data)
  if (res === false) {
    is_loading_preview.value = false
    return
  } else {
    unEditValueDialog.value.open_dialog();
    unEditValueDialog.value.set_code(res);
    is_loading_preview.value = false
    return
  }


  unEditValueDialog.value.open_dialog();
  if (props.interface !== -1) {
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
  } else {
    convertSchemaToObject(props.tableData[0], {})
  }

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
  console.log(command);
  if (command[1].value === 'ds') {
    let name = command[2].name
    if (name.includes("--")) {
      const parts = name.split("--");
      name = parts[1];
    }
    if (!('t_name' in command[2])) {
      command[0].t_name = name
    }
    command[0].t = 'ds'
    console.log('content_type' in command[2]);
    command[0].name = 'content_type' in command[2] ? command[2].content_type : command[2].name
    command[0]['ds_id'] = command[2].target
    command[0].children = []
    return
  }

  command[0].t = command[1].value;
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
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-bottom: none;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  padding: 8px 12px;

  .title {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    display: flex;
    align-items: center;
  }

  .tools {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;

    div {
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 4px 10px;
      gap: 4px;
      border-radius: 5px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      transition: all 0.15s ease;
      font-weight: 500;
      color: #374151;

      &:hover {
        background: #f9fafb;
        border-color: #10b981;
        color: #10b981;
      }

      &:active {
        transform: scale(0.98);
      }
    }
  }
}

.private-table-outside {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  overflow: hidden;
}

.root-icon {
  display: flex;

  span {
    cursor: pointer;
    padding: 2px 6px;
    height: 20px;
    border-radius: 4px;
    font-size: 12px;
    background: #10b981;
    color: white;
    display: flex;
    align-items: center;
    font-weight: 600;
    transition: all 0.15s ease;

    &:hover {
      background: #059669;
    }

    &:active {
      transform: scale(0.98);
    }
  }
}

.core-value {
  display: flex;
  justify-content: start;
  align-items: center;
  gap: 6px;
}

.private-input {
  margin: 0;
  padding: 4px 6px;
  border: 1px solid transparent;
  outline: none;
  background-color: transparent;
  font-size: 13px;
  width: 100%;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.15s ease;
  color: #374151;

  &::placeholder {
    color: #9ca3af;
  }

  &:hover {
    background-color: #f9fafb;
    border-color: #e5e7eb;
  }

  &:focus {
    background-color: #ffffff;
    border-color: #10b981;
    color: #111827;
  }
}

.private-deafult {
  cursor: not-allowed;
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  padding: 4px 6px;
  border-radius: 4px;
  background-color: #f9fafb;
}

.typing-span {
  cursor: pointer;
  display: flex;
  justify-self: center;
  align-items: center;
  height: 20px;
  font-weight: 600;
  transition: all 0.15s ease;

  &:hover {
    color: #10b981;
  }
}

.custom-mini {
  width: 20px;
  height: 20px;
  transition: all 0.15s ease;

  &:hover {
    background-color: #f3f4f6;
    border-radius: 4px;
    cursor: pointer;
  }
}

.action-icon {
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.action-icon-close {
  margin-left: 3px;
}
</style>

<style lang="scss">
.main-table {
  background: #ffffff;

  .cell {
    padding: 4px 6px;
  }

  .el-table__row {
    transition: background-color 0.15s ease;

    &:hover {
      background-color: #f9fafb !important;
    }
  }

  .el-table__empty-block {
    background: #ffffff;
  }
}
</style>
