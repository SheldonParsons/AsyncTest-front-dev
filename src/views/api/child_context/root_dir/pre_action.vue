<template>
  <div class="pre-action">
    <div class="drag-container-wrapper">
      <el-row class="drag-item" v-if="props.hasFatherActions">
        <el-col :offset="offset" :span="span">
          <FatherActions :elements="fatherActions"></FatherActions> </el-col
      ></el-row>
      <draggable
        v-model="action_items"
        group="shared"
        animation="300"
        item-key="id"
        handle=".drag-handle"
        class="drag-container"
      >
        <template #item="{ element, index }">
          <el-row class="drag-item">
            <el-col :offset="offset" :span="span">
              <DefaultAction
                v-if="element.t === 0"
                @add_action="add_action"
                :hasFatherAction="hasFatherActions"
              ></DefaultAction>
              <CustomScript
                v-if="element.t === 1"
                :is_after="false"
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
                :interface="interface"
              ></DataBase>
            </el-col>
          </el-row>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import draggable from "vuedraggable";
import DefaultAction from "./actions/default_action.vue";
import CustomScript from "./actions/custom_script.vue";
import WaitTime from "./actions/wait_time.vue";
import DataBase from "./actions/data_base.vue";
import FatherActions from "./actions/father_actions.vue";
import tools from "@/utils/tools";

const emit = defineEmits(["update:modelValue"]);
const props = defineProps({
  offset: {
    type: Number,
    default: 1,
  },
  span: {
    type: Number,
    default: 22,
  },
  modelValue: {
    type: Array,
    default: () => [
      {
        id: -1,
        t: 0,
        status: true,
        name: "default",
      },
    ],
  },
  fatherActions: {
    type: Object,
    default: () => [],
  },
  hasFatherActions: {
    type: Boolean,
    default: false,
  },
  interface: {
    type: Number,
    default: -1
  }
});

function default_action() {
  return [
    {
      id: -1,
      t: 0,
      status: true,
      name: "default",
    },
  ];
}

// 计算属性双向绑定
const action_items = computed({
  get() {
    if (props.modelValue.length === 0) {
      emit("update:modelValue", default_action());
    }
    return props.modelValue;
  },
  set(value) {
    emit("update:modelValue", value);
  },
});
function save() {
  return action_items.value;
}

defineExpose({
  save,
});
function change_code(element: any, value: string) {
  element.data.code = value;
}

function delete_action(index: number) {
  action_items.value.splice(index, 1);
}

function dup_action(element: any, index: number) {
  action_items.value.splice(index + 1, 0, {
    ...JSON.parse(JSON.stringify(element)),
    id: tools.getRandomInt(1000000, 99999999),
  });
}

function add_database_param(element: any, call_back: Function = () => {}) {
  call_back(element.data.params);
}

function delete_database_param(element: any, call_back: Function = () => {}) {
  call_back(element.data.params);
}

function add_action(action_name: string) {
  const index = action_items.value.findIndex(
    (item: any) => item.name === "default"
  );
  if (action_name === "database") {
    action_items.value.splice(index, 0, {
      name: action_name,
      id: tools.getRandomInt(1000000, 99999999),
      t: 3,
      data: {
        status: true,
        code: "",
        name: "",
        database: null,
        params: [
          {
            name: "",
            t: "env",
            jsonpath: "",
          },
        ],
      },
    });
  }
  if (action_name === "script") {
    action_items.value.splice(index, 0, {
      name: action_name,
      id: tools.getRandomInt(1000000, 99999999),
      t: 1,
      data: {
        status: true,
        code: "",
      },
    });
  }
  if (action_name === "wait") {
    action_items.value.splice(index, 0, {
      name: action_name,
      id: tools.getRandomInt(1000000, 99999999),
      t: 2,
      data: {
        status: true,
        time: 1000,
      },
    });
  }
}
</script>

<style scoped>
.pre-action {
  margin-top: 20px;
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
