<template>
  <el-row style="margin-top: 60px">
    <el-col :offset="1" :span="3"
      ><el-dropdown trigger="click" @command="handelMethod">
        <el-button type="primary" class="method-btn">
          Method {{ methodList[currentMethod]
          }}<el-icon class="el-icon--right"><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              :command="index"
              v-for="(item, index) in methodList"
              :key="index"
              >{{ item }}</el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown></el-col
    >
    <el-col :span="12">
      <SpecialInput
        height="40px"
        radius="0px 0px 0px 0px"
        v-model="url"
        placeholder="Enter Request URL"
        @clearData="clearUrl"
        :max="600"
        :isTransColor="false"
      ></SpecialInput
    ></el-col>
    <el-col :span="3">
      <el-button class="send-btn" type="primary" @click="send"
        >Send Request</el-button
      >
    </el-col>
    <el-col style="margin-left: 5px" :span="2">
      <el-button style="width: 70%; height: 100%" @click="save">保存</el-button>
    </el-col>
    <el-col :span="2">
      <el-button style="width: 70%; height: 100%" @click="send">删除</el-button>
    </el-col>
  </el-row>
  <RegularInput></RegularInput>
  <el-row>
    <el-col :offset="1" :span="5">
      <RegularSelect
        label="状态"
        :showBadge="true"
        v-model="statusValue"
        :optionList="colors"
        :selectedStatusLabel="selectedStatusLabel"
        :displayLabel="statusLabel"
      ></RegularSelect>
    </el-col>
    <el-col :offset="1" :span="5">
      <RegularSelect
        label="责任人"
        :showBadge="false"
        v-model="responsorValue"
        :optionList="responsors"
        :selectedStatusLabel="selectedResponsorLabel"
        :displayLabel="responsorLabel"
      ></RegularSelect>
    </el-col>
    <el-col :offset="1" :span="5">
      <RegularSelectMul
        label="标签"
        :showBadge="false"
        v-model="markerValue"
        :optionList="marker_list"
        :displayLabel="markerLabel"
        @footerEntry="addMarker"
      ></RegularSelectMul>
    </el-col>
    <el-col :offset="1" :span="4">
      <RegularSelectGroup
        label="服务"
        :showBadge="false"
        v-model="serverValue"
        :options="serverOptions"
      ></RegularSelectGroup>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="22">
      <h4 class="doc-base-title">说明</h4>
    </el-col>
    <el-col :offset="1" :span="22">
      <el-input
        v-model="statement"
        :autosize="{ minRows: 4 }"
        type="textarea"
        placeholder="Please input"
      />
    </el-col>
  </el-row>
  <el-row style="margin-top: 20px; margin-bottom: 50px">
    <el-col :offset="1" :span="22">
      <el-collapse v-model="activeNames" @change="handleChange">
        <el-collapse-item name="1">
          <template #title>
            <span class="coll-span">请求参数</span>
          </template>
          <el-menu
            :default-active="activeIndex"
            class="el-menu-demo"
            mode="horizontal"
            @select="handleSelect"
          >
            <el-menu-item index="1">Query</el-menu-item>
            <el-menu-item index="2">Path</el-menu-item>
            <el-menu-item index="3">Body</el-menu-item>
            <el-menu-item index="4">Headers</el-menu-item>
            <el-menu-item index="5">Cookies</el-menu-item>
            <el-menu-item index="6">Auth</el-menu-item>
          </el-menu>
          <Body
            v-show="activeIndex == '3'"
            :tableData="tableData"
            @dataChange="bodyDataChange"
          ></Body>
        </el-collapse-item>
        <el-collapse-item name="2">
          <template #title>
            <span class="coll-span">返回响应</span>
          </template>
          <el-tabs
            v-model="activeName"
            type="border-card"
            class="demo-tabs"
            @tab-click="handleClick"
          >
            <el-tab-pane label="成功（200）" name="first">
              <el-row>
                <el-col
                  :span="4"
                  style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  "
                >
                  <span style="white-space: nowrap">HTTP 状态码:</span>
                  <el-dropdown
                    style="margin-left: 5px"
                    ref="statusDropdown"
                    trigger="contextmenu"
                  >
                    <el-input v-model="resStatus" @focus="choiceStatus" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          v-for="(
                            value, key, index
                          ) in GlobalStatus.regular_response_status_map()"
                          :key="index"
                          >{{ key }}（{{ value }}）</el-dropdown-item
                        >
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-col>
                <el-col
                  :offset="1"
                  :span="4"
                  style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  "
                >
                  <span style="white-space: nowrap">名称:</span>
                  <el-input style="margin-left: 5px" v-model="resName" />
                </el-col>
                <el-col
                  :offset="1"
                  :span="4"
                  style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  "
                >
                  <span style="white-space: nowrap">内容格式:</span>
                  <el-select
                    style="margin-left: 5px"
                    v-model="resContentType"
                    class="m-2"
                    placeholder="Select"
                  >
                    <el-option
                      v-for="item in options"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-col>
              </el-row>
              <ResBody
                v-show="activeIndex == '3'"
                :tableData="tableData"
                @dataChange="bodyDataChange"
              ></ResBody>
            </el-tab-pane>
          </el-tabs>
        </el-collapse-item>
      </el-collapse>
    </el-col>
  </el-row>
</template>
<script lang="ts" setup>
import {
  ref,
  computed,
  onBeforeUnmount,
  onMounted,
  getCurrentInstance,
  watch,
} from "vue";
import SpecialInput from "@/components/common/input/specialInput.vue";
import RegularInput from "../child_component/ragular_input.vue";
import RegularSelect from "../child_component/regular_select.vue";
import RegularSelectMul from "../child_component/regular_select_mul.vue";
import RegularSelectGroup from "../child_component/regular_select_group.vue";
import Body from "./req/body.vue";
import ResBody from './res/res_body.vue'
import GlobalStatus from "@/global";
import tools from "@/utils/tools";
// 全局对象
const { proxy }: any = getCurrentInstance();
const statusDropdown = ref();
const activeName = ref("first");

const resStatus = ref("");
const resName = ref("");
const resContentType = ref();

function choiceStatus() {
  if (!statusDropdown.value) return;
  statusDropdown.value.handleOpen();
}
const handleClick = (tab: any, event: Event) => {
  console.log(tab, event);
};
const options = ref([
  {
    value: "json",
    label: "JSON",
  },
  {
    value: "xml",
    label: "XML",
  },
  {
    value: "html",
    label: "HTML",
  },
  {
    value: "raw",
    label: "Raw",
  },
]);
const tableDataOld: any = ref();
const tableData: any = ref([]);
const tableData2: any = ref([
  {
    id: 1,
    name: "Tom1",
    type: "object",
    default: "{ }",
    statement: "hello statement",
    chinese: "Chinese Name",
    children: [
      {
        id: 2,
        name: "Tom1-1",
        type: "object",
        default: "{ }",
        statement: "hello statement",
        chinese: "Chinese Name",
        children: [
          {
            id: 4,
            name: "Tom1-1-1",
            type: "boolean",
            default: "true",
            statement: "hello statement",
            chinese: "Chinese Name",
          },
        ],
      },
      {
        id: 3,
        name: "Tom1-2",
        type: "string",
        default: "default {{tommy}}",
        statement: "hello statement",
        chinese: "Chinese Name",
      },
    ],
  },
  {
    id: 5,
    name: "Tom1",
    type: "integer",
    default: "66",
    statement: "hello statement",
    chinese: "Chinese Name",
  },
  {
    id: 6,
    name: "Tom1",
    type: "number",
    default: "3.1415926",
    statement: "hello statement",
    chinese: "Chinese Name",
  },
  {
    id: 7,
    name: "Tom1",
    type: "array",
    default: "[ ]",
    statement: "hello statement",
    chinese: "Chinese Name",
    children: [
      {
        id: 9,
        name: "Tom1-1",
        type: "string",
        default: "default {{tommy}}",
        statement: "hello statement",
        chinese: "Chinese Name",
      },
    ],
  },
  {
    id: 8,
    name: "Tom1",
    type: "null",
    default: "null",
    statement: "hello statement",
    chinese: "Chinese Name",
  },
]);

// watch(
//   tableData,
//   (newValue, oldValue) => {
//     console.log("Table data updated:", newValue);
//   },
//   {
//     deep: true,
//   }
// );

function bodyDataChange(updateValue: any) {
  console.log(updateValue);
}

const methodList = ["GET", "POST", "PUT", "DELETE"];
const url = ref("");
const currentMethod = ref(0);
const statement = ref("");
const activeNames = ref(["1", "2"]);
const handleChange = (val: string[]) => {
  console.log(val);
};
const activeIndex = ref("3");
const handleSelect = (key: string, keyPath: string[]) => {
  activeIndex.value = key.toString();
};

onMounted(() => {
  // 添加全局事件监听
  window.addEventListener("keydown", addAltS);
  tableDataOld.value = deepCopy(tableData.value);
});

function deepCopy(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

onBeforeUnmount(() => {
  window.removeEventListener("keydown", addAltS);
});

function addAltS(event: any) {
  if (
    (event.metaKey || event.ctrlKey) &&
    (event.key === "s" || event.code === "KeyS")
  ) {
    event.preventDefault(); // 阻止浏览器默认行为
    save();
    // 在这里执行你想要的逻辑
  }
}
// status-------------------------------------------
const statusValue = ref("#EB913A");
const colors = [
  {
    value: "#EB913A",
    label: "测试中",
  },
  {
    value: "#00BFFF",
    label: "开发中",
  },
  {
    value: "#DCDCDC",
    label: "将废弃",
  },
  {
    value: "#57A569",
    label: "已发布",
  },
];

// 计算属性获取当前选中的标签值
const selectedStatusLabel = computed(() => {
  const selectedItem = colors.find((item) => item.value === statusValue.value);
  return selectedItem ? selectedItem.label : "";
});

function statusLabel(item: any) {
  return item.label;
}
// Responsor-------------------------------------------
const responsorValue = ref(0);
const responsors = [
  {
    value: 0,
    username: "sheldon",
    nickname: "李博",
  },
  {
    value: 1,
    username: "haoppy",
    nickname: "肖豪",
  },
];
function responsorLabel(item: any) {
  return item.username + "(" + item.nickname + ")";
}
// 计算属性获取当前选中的标签值
const selectedResponsorLabel = computed(() => {
  const selectedItem: any = responsors.find(
    (item: any) => item.value === responsorValue.value
  );

  return selectedItem
    ? selectedItem.username + "(" + selectedItem.nickname + ")"
    : "";
});

// marker-------------------------------------------

function addMarker(item: any) {
  console.log(item);
  marker_list.value.unshift({
    value: marker_list.value.length,
    label: item,
  });
}

const markerValue = ref([]);

const marker_list = ref([
  {
    value: 0,
    label: "宠物",
  },
  {
    value: 1,
    label: "机械",
  },
  {
    value: 2,
    label: "宠物",
  },
  {
    value: 3,
    label: "机械",
  },
  {
    value: 4,
    label: "宠物",
  },
  {
    value: 5,
    label: "机械",
  },
]);

// 计算属性获取当前选中的标签值
const selectedMarkerLabel = computed(() => {
  const selectedItem: any = responsors.find(
    (item: any) => item.value === responsorValue.value
  );
  console.log(selectedItem);
  return selectedItem.label;
});

// server-------------------------------------------

const serverValue = ref("father");

const serverOptions = [
  {
    label: "默认设置",
    options: [
      {
        value: "father",
        label: "继承父类",
        desc: "跟随父级目录设置（推荐）",
      },
    ],
  },
  {
    label: "手动指定",
    options: [
      {
        value: "default1",
        label: "默认服务1",
        desc: "http://127.0.0.1:4523/m1/2273535-0-default",
      },
    ],
  },
];

function serverLabel(item: any) {
  return item.label;
}

function markerLabel(item: any) {
  return item.label;
}

function handelMethod(command: any) {
  currentMethod.value = command;
}

function clearUrl() {
  url.value = "";
}

function send() {}

function save() {
  // console.log(tableData.value);
  // console.log(tableDataOld.value);
  // console.log(compareAndUpdate(tableDataOld.value, tableData.value));
  tools.message("已保存", proxy);
}

function compareAndUpdate(A: any, B: any, parent_id: any = "top") {
  // 初始化一个存放更新描述的数组
  const updates: any = [];

  // 遍历结构A的每个对象
  A.forEach((objA: any) => {
    // 在结构B中找到相同id的对象
    const objB = B.find((item: any) => item.id === objA.id);

    if (objB) {
      // 对比属性并记录更新
      for (let key in objA) {
        if (key === "children") {
          continue;
        }
        if (objA.hasOwnProperty(key) && objB.hasOwnProperty(key)) {
          // 检查属性值是否不同，记录需要更新的操作
          if (objA[key] !== objB[key]) {
            updates.push({
              type: "update",
              target: objA.id,
              field: key,
              value: objB[key],
            });
          }
        }
      }
      // 检查children属性，递归比较
      if (objA.children && objB.children) {
        updates.push(
          ...compareAndUpdate(objA.children, objB.children, objA.id)
        );
      }
    } else {
      // 如果在B中找不到相同id的对象，说明该对象需要被删除
      updates.push({
        type: "delete",
        target: parent_id,
        value: objA.id,
      });
    }
  });

  // 检查在B中有而A中没有的对象，需要添加到A中
  B.forEach((objB: any) => {
    const objA = A.find((item: any) => item.id === objB.id);
    if (!objA) {
      updates.push({
        type: "add",
        target: parent_id,
        value: objB,
      });
    }
  });

  return updates;
}
</script>
<style lang="scss" scoped>
.typing-span {
  cursor: pointer;
}
.typing-span:hover {
  color: var(--primary);
}
.el-dropdown,
.method-btn,
.send-btn {
  width: 100%;
  height: 100%;
}
.method-btn {
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
}
.send-btn {
  border-radius: 0px 5px 5px 0px;
}

.el-tag {
  border: none;
  aspect-ratio: 1;
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
.coll-span {
  font-size: 1.1em;
  margin-left: 1%;
}
</style>

<style>
.main-table {
  .cell {
    display: flex;
    align-items: center;
    padding-left: 12px;
    padding-right: 5px;
    width: 100%;
    > div {
      width: 100%;
    }
  }
}
.doc-base-title {
  color: gray;
  font-size: 0.9em;
}

.el-collapse-item__wrap,
.el-collapse {
  border: none;
}

/* .el-collapse-item__header {
  border: 2px dashed var(--el-color-primary);
  border-radius: 5px;
  border-color:var(--el-color-primary)!important;
  margin-bottom: 5px;
} */
.el-tabs--border-card > .el-tabs__header {
  background-color: #ffffff;
  border-radius: 5px;
}
.el-tabs__nav-wrap,
.el-tabs--border-card {
  border-radius: 5px;
}
.el-dropdown__popper .el-dropdown-menu {
  max-height: 200px;
}
</style>
