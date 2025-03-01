<template>
    <draggable
      v-model="nodes"
      item-key="id"
      group="nestedGroup"
      ghost-class="ghost-style"
      chosen-class="active-style"
      handle=".drag-handle"
      @start="$emit('node-click', $event.item.dataset.id)"
    >
      <template #item="{ element }">
        <div class="node" :data-id="element.id">
          <div class="node-header">
            <span class="drag-handle">☰</span>
            {{ element.name }}
            <button @click="addChild(element)">+</button>
            <button @click="removeNode(element)">×</button>
          </div>
          
          <NestedDraggable
            v-if="element.children && element.children.length"
            :nodes="element.children"
            class="children-container"
            @node-click="$emit('node-click', $event)"
          />
        </div>
      </template>
    </draggable>
  </template>
  
  <script setup>
  import { ref, defineProps, defineEmits } from "vue";
  import draggable from "vuedraggable";
  
  // 获取父组件传递的 `nodes`
  const props = defineProps(["nodes"]);
  const nodes = ref(props.nodes);
  
  // 事件定义
  const emit = defineEmits(["node-click"]);
  
  const addChild = (element) => {
    if (!element.children) {
      element.children = [];
    }
    element.children.push({
      id: Math.random().toString(36).substr(2, 9),
      name: "新节点",
      children: [],
    });
  };
  
  const removeNode = (element) => {
    const index = nodes.value.indexOf(element);
    if (index !== -1) {
      nodes.value.splice(index, 1);
    }
  };
  </script>
  
  <style scoped>
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
  