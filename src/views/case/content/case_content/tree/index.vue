<template>
  <motion.div class="case-tree-container" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
    :transition="{ duration: 0.5 }">
    <!-- 树形结构 -->
    <el-tree ref="treeRef" :data="treeData" :props="defaultProps" node-key="id" :expand-on-click-node="false"
      :default-expand-all="true" :highlight-current="true" draggable :allow-drag="handleAllowDrag"
      @node-drag-start="handleDragStart" @node-drag-end="handleDragEnd" @node-drag-enter="handleDragEnter"
      @node-drag-leave="handleDragLeave" class="case-custom-tree">
      <template #default="{ node, data }">
        <motion.div style="display: flex;flex-direction: column;width: 100%;" class="tree-node-container"
          :node-id="node.id" :data-id="data.id" :data-type="data.type">
          <Line class="target-line-top hidden"></Line>
          <For v-if="data.type === 'for'" @changeCheck="(val: any) => changeCheckHandle(val, data)" :check="data.check"
            :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown"></For>
          <Interface v-if="data.type === 'interface'" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown">
          </Interface>
          <Empty v-if="data.type === 'empty'" :hoveredNodeId="hoveredNodeId" :data="data"></Empty>
          <Line v-if="showBottomLine(node)" class="target-line-button hidden"></Line>
        </motion.div>
      </template>
    </el-tree>
  </motion.div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { motion } from 'motion-v'
import { ElTree } from 'element-plus'
import Line from '@/views/case/content/case_content/tree/components/line.vue'
import { useTreeNodeOperations, type TreeNode } from './composables/useTreeNodeOperations'
import { useDragAndDrop } from './composables/useDragAndDrop'
import { useLineMounting } from './composables/useLineMounting'
import { defaultProps, actionBtnVariants } from './utils/constants'
import For from '@/views/case/content/case_content/tree/node_components/for.vue'
import Interface from '@/views/case/content/case_content/tree/node_components/interface.vue'
import Empty from '@/views/case/content/case_content/tree/node_components/empty.vue'
import _ from 'lodash'

// 树形数据
const treeData = ref<any[]>([
  {
    id: 12,
    type: 'for',
    label: 'for循环节点',
    check: 'check',
    children: [
      {
        id: 81923123,
        lable: '',
        type: 'empty',
        check: 'check',
      }
    ]
  },
  {
    id: 1,
    type: 'for',
    label: '根节点 1',
    check: 'check',
    children: [
      {
        id: 2,
        label: '子节点 1-1',
        type: 'for',
        check: 'check',
        children: [
          {
            id: 3, label: '叶子节点 1-1-1', type: 'for', check: 'check', children: [
              {
                id: 8,
                type: 'interface',
                label: '叶子节点 1-1-1-1',
                check: 'check',
              },
              {
                id: 11,
                type: 'interface',
                label: '叶子节点 1-1-1-2',
                check: 'check',
              }
            ]
          },
          { id: 4, label: '叶子节点 1-1-2', type: 'interface', check: 'check', }
        ]
      },
      {
        id: 5,
        type: 'interface',
        label: '子节点 1-2',
        check: 'check',
      }
    ]
  },
  { id: 9, label: '节点', type: 'interface', check: 'check', },
  { id: 10, label: '节点', type: 'interface', check: 'check', },
  {
    id: 6,
    label: '根节点 2',
    type: 'for',
    check: 'check',
    children: [
      { id: 7, label: '子节点 2-1', type: 'interface', check: 'check' }
    ]
  },
  {
    id: 15,
    label: '根节点 2',
    type: 'for',
    check: 'check',
    children: [
      { id: 16, label: '子节点 2-1', type: 'interface', check: 'check' }
    ]
  },
  {
    id: 17,
    label: '根节点 2',
    type: 'for',
    check: 'check',
    children: [
      { id: 18, label: '子节点 2-1', type: 'interface', check: 'check' }
    ]
  }
])

const treeRef = ref<InstanceType<typeof ElTree>>()
const hoveredNodeId = ref<number | null>(null)
const current_drag_node_target: any = ref(null)
const current_drag_node_data_id: any = ref(-1)
const drag_target_info: any = ref(null)
const origin_tree: any = ref(null)

// 使用组合式函数
const {
  showBottomLine,
  moveNode,
} = useTreeNodeOperations()

const {
  getNodeHeightMapping,
  startListeningMouse,
  stopListeningMouse,
  cleanAllLine
} = useDragAndDrop()

const {
  mountLines
} = useLineMounting()

// 处理节点悬停
const handleNodeHover = (node_id: number) => {
  hoveredNodeId.value = node_id
}

const handleDragEnter = (_: any, dropNode: any, _ev: any) => {
  if (dropNode.data.type === 'empty') {
    const el = document.querySelector(`.custom-tree-node[data-id="${dropNode.data.id}"] .node-content`)
    if (el) {
      el.classList.add('drag-hover')
    }
  }
}

const handleDragLeave = (_: any, dropNode: any, _ev: any) => {
  if (dropNode.data.type === 'empty') {
    const el = document.querySelector(`.custom-tree-node[data-id="${dropNode.data.id}"] .node-content`)
    if (el) {
      el.classList.remove('drag-hover')
    }
  }
}

function findPath(
  list: any[],
  targetId: number,
  parents: any[] = []
): any[] | null {
  for (const node of list) {
    if (node.id === targetId) {
      return [...parents, node];
    }
    if (node.children) {
      const found = findPath(node.children, targetId, [...parents, node]);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 更新 node 及其所有后代的 check 状态
 */
function updateDescendants(node: any, newCheck: 'none' | 'check' | 'part') {
  node.check = newCheck;
  if (node.children) {
    node.children.forEach((child: any) =>
      updateDescendants(child, newCheck)
    );
  }
}

/**
 * 单个节点选中/取消选中后，同步它及其祖先的 check 属性
 * @param type    要设的新状态，只会是 'check' 或 'none'
 * @param nodeData 当前操作的节点对象
 */
function changeCheckHandle(
  type: 'none' | 'check' | 'part',
  nodeData: any
) {
  // 1. 拿到从根到当前节点的路径
  const path = findPath(treeData.value, nodeData.id);
  if (!path) return;

  // 2. 更新当前节点及所有后代
  updateDescendants(path[path.length - 1], type);

  // 3. 自下而上更新祖先节点的状态
  for (let i = path.length - 2; i >= 0; i--) {
    const parent = path[i];
    const childStates = parent.children.map((c: any) => c.check);
    let parentState: 'none' | 'check' | 'part';
    if (childStates.every((s: any) => s === 'check')) {
      parentState = 'check';
    } else if (childStates.every((s: any) => s === 'none')) {
      parentState = 'none';
    } else {
      parentState = 'part';
    }
    parent.check = parentState;
  }
}

const draggingFromHandle = ref(false)

// 当在句柄上按下时，打标记
function onHandlePointerDown(value: boolean) {
  origin_tree.value = _.cloneDeep(treeData.value)
  draggingFromHandle.value = value
}


// 拖拽相关处理函数
function handleAllowDrag(node: any) {
  console.log(node);

  console.log(treeData.value);

  const allow = draggingFromHandle.value
  // 不管放行还是拦截，都清掉标记
  nextTick(() => { draggingFromHandle.value = false })
  return allow
}

// const handleAllowDrop = () => {
//   // 返回false来阻止默认的放置行为，你可以自己控制
//   console.log("handleAllowDrop");

//   return false
// }

function clearHighlightTreeNode(rootEl: any) {
  if (!(rootEl instanceof HTMLElement)) return;

  // 1. 清除 node-content 上的类
  const content = rootEl.querySelector('.blink-border-content');
  if (content) {
    content.classList.remove('blink-border-content');
  }

  // 2. 清除第一个 children 上的类
  for (let i = 0, len = rootEl.children.length; i < len; i++) {
    const child = rootEl.children[i];
    if (child.classList && child.classList.contains('blink-border-children')) {
      child.classList.remove('blink-border-children');
      break;
    }
  }
}

const handleDragEnd = async (draggingNode: any, dropNode: any, dropType: string) => {
  console.log('拖拽结束:', {
    dragging: draggingNode.data.label,
    target: dropNode?.data?.label,
    dropType: dropType
  })
  stopListeningMouse()
  cleanAllLine()
  clearHighlightTreeNode(current_drag_node_target.value)
  if (drag_target_info.value !== null) {
    moveNode(origin_tree.value, Number(current_drag_node_data_id.value), Number(drag_target_info.value.id), drag_target_info.value.position)
    treeData.value = origin_tree.value
    if (treeRef.value) {
      await mountLines(treeRef)
    }
  }
}

const handleDragStart = async (node: any, ev: any) => {
  console.log('开始拖拽:', node.data)
  console.log(draggingFromHandle.value);
  console.log(node.data);
  console.log(treeData.value);


  await getNodeHeightMapping(node.data.id)
  current_drag_node_data_id.value = node.data.id
  current_drag_node_target.value = ev.target
  const content = ev.target.querySelector('.el-tree-node__content .node-content');
  if (content) {
    content.classList.add('blink-border-content');
  }

  if (node.data.children) {
    const childrenEl = ev.target.querySelector('.el-tree-node__children');
    if (childrenEl) {
      childrenEl.classList.add('blink-border-children');
    }
  }
  let dragImage = null
  if (node.data.type !== 'for') {
    dragImage = ev.target.querySelector('.node-content')
  } else {
    dragImage = ev.target as HTMLElement
  }
  
  
  if (dragImage) {
    ev.dataTransfer?.setDragImage(dragImage, 0, 0)
  }
  startListeningMouse(set_drag_target_info)
}

const set_drag_target_info = (target: any) => {
  if (target && target.status !== 'blank') {
    console.log(target);
    console.log(target.htmlObject.getAttribute('data-id'));
    console.log(current_drag_node_data_id.value);
    console.log(target.status);
    drag_target_info.value = {
      id: target.htmlObject.getAttribute('data-id'),
      position: target.status
    }
  } else {
    drag_target_info.value = null
  }
}

onMounted(async () => {
  if (treeRef.value) {
    await mountLines(treeRef)
  }
})
</script>

<style lang="scss">
@keyframes blinkLine {

  0%,
  100% {
    opacity: 0;
  }

  50% {
    opacity: 1;
  }
}

/* 给 .blink-border-content 添加伪元素闪烁四边框 */
.blink-border-content {
  position: relative;
  opacity: 0.7;
}

.blink-border-content::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid rgb(48, 43, 99);
  border-radius: inherit;
  pointer-events: none;
  animation: blinkLine 0.8s infinite ease-in-out;
}

/* 给 .blink-border-children 添加伪元素闪烁左/右/底三边 */
.blink-border-children {
  position: relative;
  opacity: 0.7;
}

.blink-border-children::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-left: 2px solid rgb(48, 43, 99);
  border-right: 2px solid rgb(48, 43, 99);
  border-bottom: 2px solid rgb(48, 43, 99);
  border-top: none;
  border-radius: 0 0 6px 6px;
  /* 根据需要圆角 */
  pointer-events: none;
  animation: blinkLine 0.8s infinite ease-in-out;
}

/* 3. 如果没有子节点，则不缩进 */
.case-custom-tree .el-tree-node__children:empty {
  margin-left: 0 !important;
  margin-right: 5px !important;
}

/* 1. 根节点下第一层 children，缩进 20px */
.case-custom-tree>.el-tree-node>.el-tree-node__children:not(:empty) {
  border-left: 2px solid rgba(86, 87, 88, 0.04);
  border-right: 2px solid rgba(86, 87, 88, 0.04)cc;
  border-bottom: 2px solid rgba(86, 87, 88, 0.04);
  border-bottom-right-radius: 6px;
  border-bottom-left-radius: 6px;
  border-color: rgba(86, 87, 88, 0.04);
  margin-left: 14px !important;
  margin-right: 5px !important;
}

/* 2. 其他层级（子节点、孙子节点……），缩进 38px */
.case-custom-tree .el-tree-node__children:not(:empty) {
  border-left: 2px solid rgba(86, 87, 88, 0.04);
  border-right: 2px solid rgba(86, 87, 88, 0.04);
  border-bottom: 2px solid rgba(86, 87, 88, 0.04);
  border-bottom-right-radius: 6px;
  border-bottom-left-radius: 6px;
  border-color: rgba(86, 87, 88, 0.04);
  margin-left: 14px !important;
  margin-right: 5px !important;
}

/* 先给所有节点都打 18px */
.case-custom-tree .el-tree-node__children .el-tree-node__content {
  padding-left: 0px !important;

}

/* 2. 单独把根节点的 content（直接挂在 .case-custom-tree 下）重置为 0 */
.case-custom-tree>.el-tree-node>.el-tree-node__content {
  padding-left: 0 !important;
}
</style>

<style scoped>
.case-tree-container {
  min-height: 400px;
  height: inherit;
  padding: 10px;
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
.case-custom-tree {
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
</style>