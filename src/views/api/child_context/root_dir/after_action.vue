<template>
  <div class="pre-action">
    <div class="drag-container-wrapper">
      <!-- 第一个拖拽容器 -->
      <draggable
        v-model="items"
        group="shared"
        animation="300"
        item-key="id"
        handle=".drag-handle"
        class="drag-container"
        style="margin-top: 20px"
      >
        <template #item="{ element, index }">
          <el-row class="drag-item">
            <el-col :offset="1" :span="22">
              <CustomScript
                v-if="element.t === 1"
                :element="element"
                @dup_action="dup_action(element, index)"
                @delete_action="delete_action(index)"
                @change_code="(playload) => change_code(element, playload)"
              ></CustomScript>
              <WaitTime
                @dup_action="dup_action(element, index)"
                @delete_action="delete_action(index)"
                v-if="element.t === 2"
                :element="element"
              ></WaitTime>
              <Extract
              @dup_action="dup_action(element, index)"
                @delete_action="delete_action(index)"
                v-if="element.t === 4"
                :element="element"
              ></Extract>
              <DataBase
                @add_database_param="
                  (payload) => add_database_param(element, payload)
                "
                @delete_database_param="
                  (payload) => delete_database_param(element, payload)
                "
                @dup_action="dup_action(element, index)"
                @delete_action="delete_action(index)"
                @change_code="(playload) => change_code(element, playload)"
                v-if="element.t === 3"
                :element="element"
              ></DataBase>
            </el-col>
          </el-row>
        </template>
      </draggable>
      <el-row class="drag-item">
        <el-col :offset="1" :span="22">
          <AfterDefaultAction @add_action="add_action"></AfterDefaultAction> </el-col
      ></el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import draggable from "vuedraggable";
import AfterDefaultAction from "./actions/after_default_action.vue";
import CustomScript from "./actions/custom_script.vue";
import WaitTime from "./actions/wait_time.vue";
import DataBase from "./actions/data_base.vue";
import Extract from './actions/extract.vue'
onMounted(() => {
  origin_data.value = JSON.parse(JSON.stringify(items.value));
});
const origin_data: any = ref([]);
const items: any = ref([{
      name: "extract",
      id: "NEW-" + Date.now().toString(),
      t: 4,
      data: {
        status: true,
        name: "",
        source: "body",
        extract_range: "all",
        regexp: {
            expression: "",
            template: "" 
        },
        jsonpath: {
            expression: ""
        },
        xpath: {
            expression: ""
        },
        header_name: "",
        cookie_name: "",
        waste_time_unit: ""
      },
    }]);
function save() {
  const { updates, newItems, order } = compareLists(
    origin_data.value,
    items.value
  );
  console.log(updates);
  console.log(newItems);
  console.log(order);

  // TODO:将数据发往后端
  // TODO:得到最新的列表，如果有新增数据，更新item，更新origin_data，主要修改临时ID为正式ID
  origin_data.value = JSON.parse(JSON.stringify(items.value));
}

function compareLists(originalList: Array<any>, updatedList: Array<any>) {
  // 创建哈希映射加速查找（O(1) 复杂度）
  const originalMap = new Map(originalList.map((item) => [item.id, item]));

  // 初始化结果集
  const updates = [];
  const newItems = [];
  const order = updatedList.map((item) => item.id);

  // 高性能差异检测（支持提前终止）
  const hasChanged = (a: any, b: any) => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    // 键数量不同直接判定为变化
    if (aKeys.length !== bKeys.length) return true;

    // 同步遍历双指针检测差异
    for (const key of new Set([...aKeys, ...bKeys])) {
      // 使用JSON序列化保证深比较，同时避免递归性能问题
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        return true;
      }
    }
    return false;
  };

  // 批量处理更新列表
  for (const updatedItem of updatedList) {
    const originalItem = originalMap.get(updatedItem.id);

    if (!originalItem) {
      // 新增项处理
      newItems.push(updatedItem);
      updates.push(updatedItem);
    } else if (hasChanged(originalItem, updatedItem)) {
      // 变更项处理
      updates.push(updatedItem);
    }
  }

  return {
    updates, // 需要更新的数据（包含新增和修改）
    newItems, // 纯新增的数据
    order, // 顺序列表
  };
}

defineExpose({
  save,
});
function change_code(element: any, value: string) {
  element.data.code = value;
}

function delete_action(index: number) {
  items.value.splice(index, 1);
}

function dup_action(element: any, index: number) {
  items.value.splice(index + 1, 0, {
    ...JSON.parse(JSON.stringify(element)),
    id: "NEW-" + Date.now().toString(),
  });
}

function add_database_param(element: any, call_back: Function = () => {}) {
  call_back(element.data.params);
}

function delete_database_param(element: any, call_back: Function = () => {}) {
  call_back(element.data.params);
}

function add_action(action_name: string) {
  const index = items.value.findIndex((item: any) => item.name === "default");
  if (action_name === "database") {
    items.value.push({
      name: action_name,
      id: "NEW-" + Date.now().toString(),
      t: 3,
      data: {
        status: true,
        code: "",
        name: "",
        database: 0,
        params: [
          {
            name: "",
            t: "temp",
            jsonpath: "",
          },
        ],
      },
    });
  }
  if (action_name === "script") {
    items.value.push({
      name: action_name,
      id: "NEW-" + Date.now().toString(),
      t: 1,
      data: {
        status: true,
        code: "",
      },
    });
  }
  if (action_name === "wait") {
    items.value.push({
      name: action_name,
      id: "NEW-" + Date.now().toString(),
      t: 2,
      data: {
        status: true,
        time: 1000,
      },
    });
  }
  if (action_name === "extract") {
    items.value.push({
      name: action_name,
      id: "NEW-" + Date.now().toString(),
      t: 4,
      data: {
        status: true,
        name: "",
        source: "body",
        extract_range: "all",
        regexp: {
            expression: "",
            template: "" 
        },
        jsonpath: {
            expression: ""
        },
        xpath: {
            expression: ""
        },
        header_name: "",
        cookie_name: "",
        waste_time_unit: ""
      },
    });
  }
}
</script>

<style scoped>
.pre-action {
  margin-bottom: 70px;
}
/* 高亮拖拽目标的样式 */
.drag-over {
  background-color: #d3f9d8; /* 设置拖拽到目标时的高亮颜色 */
  border: 2px dashed #4caf50; /* 可选：添加边框 */
}

.drag-container {
  transition: all 1s ease;
}

/* 单个拖拽项样式 */
.drag-item {
  /* cursor: pointer; */
}

/* 拖拽中的元素 */
.dragging {
  opacity: 0.5; /* 拖拽时元素不完全透明 */
  z-index: 999; /* 拖拽的元素在最上层 */
  transform: scale(1.05); /* 放大拖拽元素 */
}

/* 隐藏原位置元素 */
.sortable-ghost {
  visibility: hidden !important;
  opacity: 0 !important;
}

/* 让拖拽目标区域高亮 */
.drag-over {
  background-color: #e0f7fa; /* 拖拽到目标时的背景颜色 */
  border: 2px solid #00bcd4; /* 可选：为目标区域添加边框 */
}
.drag-handle {
  left: 2px;
  display: flex;
  position: relative;
  padding-right: 0.25rem;
  align-items: center;
}
.drag-handle:hover {
  svg {
    color: black;
  }
}
.drag-div {
  display: flex;
  width: 100%;
  margin-bottom: 0.25rem;
  justify-content: center;
}
</style>
