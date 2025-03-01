<template>
    <div class="container">
      <!-- 左侧待选列表 -->
      <div class="source-panel">
        <h3>待选元素</h3>
        <draggable
          v-model="sourceList"
          :group="{ name: 'nestedGroup', pull: 'clone', put: false }"
          item-key="id"
          ghost-class="ghost-style"
          @start="onDragStart"
        >
          <template #item="{ element }">
            <div class="source-item">
              <span class="drag-handle">☰</span>
              {{ element.name }}
            </div>
          </template>
        </draggable>
      </div>
  
      <!-- 右侧嵌套区域 -->
      <div class="target-panel">
        <h3>嵌套结构</h3>
        <NestedDraggable
          :nodes="treeData"
          class="tree-root"
          @node-click="onNodeClick"
        />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, defineAsyncComponent } from "vue";
  import draggable from "vuedraggable";
  
  // 数据初始化
  const sourceList = ref([
    { id: "source-1", name: "组件 A" },
    { id: "source-2", name: "组件 B" },
    { id: "source-3", name: "组件 C" },
  ]);
  
  // 修正：改为普通的异步组件导入方式
  const NestedDraggable = defineAsyncComponent(() => import("./temp/NestedDraggable.vue"));
  
  // 确保 `treeData` 结构正确
  const treeData = ref([
    {
      id: "root-1",
      name: "根节点",
      children: [
        {
          id: "node-1",
          name: "子节点 1",
          children: [
            {
              id: "node-1-1",
              name: "子节点 1-1",
              children: [], // 必须初始化为空数组
            },
          ],
        },
      ],
    },
  ]);
  
  // 事件处理
  const onDragStart = (evt) => {
    evt.item.style.opacity = "0.5";
  };
  
  const onNodeClick = (nodeId) => {
    console.log("当前选中节点:", nodeId);
  };
  </script>
  
  <style scoped>
  .container {
    display: flex;
    gap: 30px;
    padding: 20px;
  }
  
  .source-panel,
  .target-panel {
    flex: 1;
    border: 1px solid #eee;
    padding: 15px;
    min-height: 500px;
  }
  
  /* 拖拽项样式 */
  .source-item {
    padding: 10px;
    margin: 5px 0;
    background: #f8f8f8;
    border-radius: 4px;
    cursor: move;
  }
  
  /* 树形节点样式 */
  .node {
    margin: 8px 0;
    padding: 10px;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 4px;
  }
  
  .node-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .children-container {
    margin-left: 25px;
    border-left: 2px solid #eee;
    padding-left: 15px;
    margin-top: 8px;
  }
  
  /* 拖拽交互样式 */
  .drag-handle {
    cursor: grab;
    opacity: 0.4;
    transition: opacity 0.2s;
  }
  
  .drag-handle:hover {
    opacity: 1;
  }
  
  .ghost-style {
    background: #f0f0f0;
    border: 2px dashed #666 !important;
    opacity: 0.7;
  }
  
  .active-style {
    background: #fff3e0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: rotate(2deg);
  }
  </style>
  