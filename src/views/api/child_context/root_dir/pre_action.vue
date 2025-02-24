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
              <DefaultAction :element="element"></DefaultAction>
              <CustomScript :element="element"></CustomScript>
              <WaitTime :element="element"></WaitTime>
              <DataBase :element="element"></DataBase>
            </el-col>
          </el-row>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import draggable from "vuedraggable";
import DefaultAction from "./actions/default_action.vue";
import CustomScript from "./actions/custom_script.vue";
import WaitTime from "./actions/wait_time.vue";
import DataBase from './actions/data_base.vue'
const items = ref([
  {
    id: 2,
    type: 3,
    name: "database",
  },
  {
    id: 0,
    type: 1,
    name: "script",
  },
  {
    id: 1,
    type: 2,
    name: "time",
  },
  {
    id: -1,
    type: 0,
    name: "default",
  }
]);

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
