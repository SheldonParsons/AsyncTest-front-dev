<template>
  <motion.div 
    class="case-tree-container"
    :initial="{ opacity: 0 }"
    :animate="{ opacity: 1 }"
    :transition="{ duration: 0.5 }"
  >
    <!-- 顶部操作栏 -->
    <motion.div 
      class="tree-header"
      :initial="{ y: -20, opacity: 0 }"
      :animate="{ y: 0, opacity: 1 }"
      :transition="{ delay: 0.2, duration: 0.3 }"
    >
      <motion.button 
        class="action-btn"
        @click="addRootNode"
        whileHover="hover"
        whileTap="tap"
        :variants="{
          hover: { scale: 1.05 },
          tap: { scale: 0.95 }
        }"
      >
        <span class="btn-icon">+</span>
        添加根节点
      </motion.button>
    </motion.div>

    <!-- 树形结构 -->
    <el-tree
      ref="treeRef"
      :data="treeData"
      :props="defaultProps"
      node-key="id"
      :expand-on-click-node="false"
      :default-expand-all="true"
      :highlight-current="true"
      draggable
      :allow-drop="handleAllowDrop"
      :allow-drag="handleAllowDrag"
      @node-drag-start="handleDragStart"
      @node-drag-enter="handleDragEnter"
      @node-drag-leave="handleDragLeave"
      @node-drag-over="handleDragOver"
      @node-drag-end="handleDragEnd"
      @node-drop="handleDrop"
      class="custom-tree"
    >
      <template #default="{ node, data }">
        <motion.div 
          class="custom-tree-node"
          :initial="{ opacity: 0, x: -10 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.3 }"
          @mouseenter="handleNodeHover(data, true)"
          @mouseleave="handleNodeHover(data, false)"
        >
          <!-- 节点内容 -->
          <motion.div 
            class="node-content"
            :animate="{ 
              backgroundColor: hoveredNodeId === data.id ? '#f5f5f5' : '#ffffff',
              borderColor: hoveredNodeId === data.id ? '#333' : '#e0e0e0'
            }"
            :transition="{ duration: 0.2 }"
          >
            <motion.div class="node-info">
              <CheckBox></CheckBox>
              <motion.span 
                class="node-label"
                :animate="{ color: hoveredNodeId === data.id ? '#000' : '#333' }"
              >
                {{ data.label }}
              </motion.span>
              <motion.span 
                class="node-count"
                :initial="{ opacity: 0 }"
                :animate="{ opacity: 0.6 }"
                :transition="{ delay: 0.1 }"
              >
                {{ data.children ? `(${data.children.length})` : '' }}
              </motion.span>
            </motion.div>

            <!-- 操作按钮组 -->
            <motion.div 
              class="node-actions"
              :animate="{ 
                opacity: hoveredNodeId === data.id ? 1 : 0,
                pointerEvents: hoveredNodeId === data.id ? 'auto' : 'none'
              }"
              :transition="{ duration: 0.2 }"
            >
              <motion.button
                class="node-action-btn"
                @click.stop="addSiblingNode(node, data)"
                whileHover="hover"
                whileTap="tap"
                :variants="actionBtnVariants"
                title="添加同级节点"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </motion.button>

              <motion.button
                class="node-action-btn"
                @click.stop="addChildNode(node, data)"
                whileHover="hover"
                whileTap="tap"
                :variants="actionBtnVariants"
                title="添加子节点"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v8m0 0l3-3m-3 3l-3-3m3 3v10M7 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </motion.button>

              <motion.button
                class="node-action-btn delete"
                @click.stop="removeNode(node, data)"
                whileHover="hover"
                whileTap="tap"
                :variants="actionBtnVariants"
                title="删除节点"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </template>
    </el-tree>
  </motion.div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { motion } from 'motion-v'
import { ElTree, ElMessageBox } from 'element-plus'
import CheckBox from '@/assets/motion/checkbox.vue'

// 树形数据
const treeData = ref([
  {
    id: 1,
    label: '根节点 1',
    children: [
      {
        id: 2,
        label: '子节点 1-1',
        children: [
          { id: 3, label: '叶子节点 1-1-1' },
          { id: 4, label: '叶子节点 1-1-2' }
        ]
      },
      {
        id: 5,
        label: '子节点 1-2'
      }
    ]
  },
  {
    id: 6,
    label: '根节点 2',
    children: [
      { id: 7, label: '子节点 2-1' }
    ]
  }
])

const treeRef = ref()
const hoveredNodeId = ref(null)
const nodeIdCounter = ref(100)

const defaultProps = {
  children: 'children',
  label: 'label'
}

// 动画变体
const actionBtnVariants = {
  hover: { scale: 1.1, backgroundColor: '#f0f0f0' },
  tap: { scale: 0.9 }
}

// 处理节点悬停
const handleNodeHover = (data, isHovering) => {
  hoveredNodeId.value = isHovering ? data.id : null
}

// 添加根节点
const addRootNode = () => {
  const newNode = {
    id: nodeIdCounter.value++,
    label: `新节点 ${nodeIdCounter.value}`,
    children: []
  }
  treeData.value.push(newNode)
}

// 添加同级节点
const addSiblingNode = (node, data) => {
  const parent = node.parent
  const children = parent.data.children || parent.data
  const index = children.findIndex(item => item.id === data.id)
  
  const newNode = {
    id: nodeIdCounter.value++,
    label: `新节点 ${nodeIdCounter.value}`
  }
  
  children.splice(index + 1, 0, newNode)
}

// 添加子节点
const addChildNode = (node, data) => {
  const newNode = {
    id: nodeIdCounter.value++,
    label: `新节点 ${nodeIdCounter.value}`
  }
  
  if (!data.children) {
    data.children = []
  }
  data.children.push(newNode)
}

// 删除节点
const removeNode = async (node, data) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此节点吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const parent = node.parent
    const children = parent.data.children || parent.data
    const index = children.findIndex(item => item.id === data.id)
    children.splice(index, 1)
  } catch {
    // 用户取消
  }
}

// 拖拽相关处理函数
const handleAllowDrag = (node) => {
  console.log('允许拖拽检查:', node.data)
  return true // 允许拖拽
}

const handleAllowDrop = (draggingNode, dropNode, type) => {
  console.log('允许放置检查:', { 
    dragging: draggingNode.data.label, 
    target: dropNode.data.label, 
    type 
  })
  // 返回false来阻止默认的放置行为，你可以自己控制
  return false
}

const handleDragStart = (node, ev) => {
  console.log('开始拖拽:', node.data)
  
  // 创建自定义拖拽图像，背景透明但保留内容
  if (ev.dataTransfer) {
    // 找到当前节点的DOM元素
    const nodeElement = ev.target.closest('.custom-tree-node')
    if (nodeElement) {
      // 克隆节点元素
      const dragImage = nodeElement.cloneNode(true)
      
      // 设置透明背景样式
      dragImage.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: ${nodeElement.offsetWidth}px;
        pointer-events: none;
        z-index: 9999;
      `
      
      // 修改克隆元素的背景为透明
      const nodeContent = dragImage.querySelector('.node-content')
      if (nodeContent) {
        nodeContent.style.backgroundColor = 'transparent'
        nodeContent.style.borderColor = 'transparent'
        nodeContent.style.boxShadow = 'none'
      }
      
      // 添加到body
      document.body.appendChild(dragImage)
      
      // 设置为拖拽图像
      ev.dataTransfer.setDragImage(dragImage, nodeElement.offsetWidth / 2, nodeElement.offsetHeight / 2)
      
      // 清理临时元素
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage)
        }
      }, 0)
    }
  }
}

const handleDragEnter = (draggingNode, dropNode, ev) => {
  console.log('拖拽进入目标:', {
    dragging: draggingNode.data.label,
    target: dropNode.data.label
  })
}

const handleDragLeave = (draggingNode, dropNode, ev) => {
  console.log('拖拽离开目标:', {
    dragging: draggingNode.data.label,
    target: dropNode.data.label
  })
}

const handleDragOver = (draggingNode, dropNode, ev) => {
  console.log('拖拽悬停在目标上:', {
    dragging: draggingNode.data.label,
    target: dropNode.data.label
  })
}

const handleDragEnd = (draggingNode, dropNode, dropType, ev) => {
  console.log('拖拽结束:', {
    dragging: draggingNode.data.label,
    target: dropNode?.data?.label,
    dropType: dropType
  })
  
  // 在这里添加你的拖拽结束逻辑
  // 比如保存到数据库、更新状态等
}

const handleDrop = (draggingNode, dropNode, dropType, ev) => {
  console.log('节点放置:', {
    dragging: draggingNode.data.label,
    target: dropNode.data.label,
    dropType: dropType // 'before', 'after', 'inner'
  })
  
  // 阻止默认的放置行为
  ev.preventDefault()
  
  // 在这里写你自己的放置逻辑
  // 例如：
  // if (dropType === 'before') {
  //   // 放置在目标节点之前
  // } else if (dropType === 'after') {
  //   // 放置在目标节点之后
  // } else if (dropType === 'inner') {
  //   // 放置为目标节点的子节点
  // }
}
</script>

<style scoped>
.case-tree-container {
  min-height: 400px;
  padding: 24px;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tree-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: #000;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon {
  font-size: 18px;
  font-weight: 300;
}

/* 自定义树样式 */
.custom-tree {
  background-color: transparent;
  color: #333;
}

:deep(.el-tree-node__content) {
  height: auto;
  padding: 0;
  background-color: transparent !important;
}

:deep(.el-tree-node__expand-icon) {
  color: #666;
  font-size: 14px;
  transition: all 0.2s ease;
}

:deep(.el-tree-node__expand-icon.is-leaf) {
  color: transparent;
}

:deep(.el-tree-node__expand-icon:hover) {
  color: #000;
}

/* 拖拽状态样式 - 让正在拖拽的源节点稍微半透明，但保持背景 */
:deep(.el-tree-node.is-dragging) {
  opacity: 0.6;
}

/* 保持源节点的正常样式，不改变背景 */
:deep(.el-tree-node.is-dragging .node-content) {
  /* 不修改背景，保持原样 */
}

:deep(.el-tree-node__drop-indicator) {
  background-color: #000;
  height: 2px;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.node-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  transition: color 0.2s ease;
}

.node-count {
  font-size: 12px;
  color: #999;
}

.node-actions {
  display: flex;
  gap: 4px;
  transition: all 0.2s ease;
}

.node-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
}

.node-action-btn:hover {
  border-color: #333;
  color: #000;
}

.node-action-btn.delete:hover {
  border-color: #ff4444;
  color: #ff4444;
}

/* 树的连接线样式
:deep(.el-tree-node__children) {
  position: relative;
}

:deep(.el-tree-node__children::before) {
  content: '';
  position: absolute;
  left: 24px;
  top: -8px;
  bottom: 16px;
  width: 1px;
  background-color: #e0e0e0;
}

:deep(.el-tree-node:last-child > .el-tree-node__children::before) {
  bottom: auto;
  height: calc(100% - 8px);
} */
</style>