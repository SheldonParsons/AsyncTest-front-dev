<template>
  <motion.div class="case-tree-container" :class="{ 'no-scroll': read_only > 0 }" :initial="{ opacity: 0 }"
    :animate="{ opacity: 1 }" :transition="{ duration: 0.5 }" style="flex: 1;">
    <!-- 树形结构 -->
    <FirstStep v-if="treeData.length === 0 && read_only === 0 && loading === false" @scroll="emit('scroll')"
      @action="addFirstStep">
    </FirstStep>
    <div v-if="treeData.length === 0 && read_only > 0 && loading === false"
      style="width: 100%;height: 100%;display: flex;justify-content: center;align-items: center;font-size: 0.9rem;">暂无数据
    </div>
    <div v-if="treeData.length > 0 && loading === false" class="global-action">
      <CheckBox :check="getGlobalCheckStatus()" @change="changeCheck"></CheckBox>
      <div style="width: 100px;">已选 {{ checked_count }} 个步骤</div>
      <!-- <AstButton @click="deleteChoiceNode" :padding="'0px 8px'" :borderRadius="'4px'" :disabled="checked_count === 0"><span
          style="font-size: 0.8rem;">删除</span></AstButton> -->
    </div>
    <AstLoading v-if="loading"></AstLoading>
    <el-tree v-if="treeData.length > 0 && loading === false" ref="treeRef" :data="treeData" :props="defaultProps"
      node-key="id" :expand-on-click-node="false" :default-expand-all="true" :highlight-current="true" draggable
      :allow-drag="handleAllowDrag" @node-click="show_step_detail" @node-drag-start="handleDragStart"
      @node-drag-end="handleDragEnd" @node-drag-enter="handleDragEnter" @node-drag-leave="handleDragLeave"
      class="case-custom-tree">
      <template #default="{ node, data }">
        <motion.div style="display: flex;flex-direction: column;width: 100%;" class="tree-node-container"
          :node-id="node.id" :data-id="data.id" :data-type="data.type">
          <!-- {{ data.id }} -->
          <Line class="target-line-top hidden"></Line>
          <Multitasker :read_only="read_only" v-if="data.type === 'multitasker'" @action="step_action"
            :action_group="stepActionGroup[data.type]" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown" :status_mapping="status_mapping"></Multitasker>
          <Group :read_only="read_only" v-if="data.type === 'group'" @action="step_action"
            :action_group="stepActionGroup[data.type]" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown" :status_mapping="status_mapping"></Group>
          <If :read_only="read_only" v-if="data.type === 'if'" @action="step_action"
            :action_group="stepActionGroup[data.type]" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown" :status_mapping="status_mapping"></If>
          <Interface :read_only="read_only" v-if="data.type === 'interface'" @action="step_action"
            :action_group="stepActionGroup[data.type]" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown" :status_mapping="status_mapping">
          </Interface>
          <Database :read_only="read_only" v-if="data.type === 'database'" @action="step_action"
            :action_group="stepActionGroup[data.type]" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown" :status_mapping="status_mapping">
          </Database>
          <Case :read_only="read_only" v-if="data.type === 'case'" @action="step_action"
            :action_group="stepActionGroup[data.type]" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown" :status_mapping="status_mapping">
          </Case>
          <Error :read_only="read_only" v-if="data.type === 'error'" @action="step_action"
            :action_group="stepActionGroup[data.type]" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown" :status_mapping="status_mapping">
          </Error>
          <Script :read_only="read_only" v-if="data.type === 'script'" @action="step_action"
            :action_group="stepActionGroup[data.type]" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown" :status_mapping="status_mapping">
          </Script>
          <Delay :read_only="read_only" v-if="data.type === 'delay'" @action="step_action"
            :action_group="stepActionGroup[data.type]" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown" :status_mapping="status_mapping">
          </Delay>
          <Assertion :read_only="read_only" v-if="data.type === 'assertion'" @action="step_action"
            :action_group="stepActionGroup[data.type]" @changeCheck="(val: any) => changeCheckHandle(val, data)"
            :check="data.check" :data="data" :hoveredNodeId="hoveredNodeId" @changeHover="handleNodeHover"
            @canDragAction="onHandlePointerDown" :status_mapping="status_mapping"></Assertion>
          <Empty :read_only="read_only" v-if="data.type === 'empty'" :hoveredNodeId="hoveredNodeId" :data="data"
            :status_mapping="status_mapping">
          </Empty>
          <Line v-if="showBottomLine(node)" class="target-line-button hidden"></Line>
        </motion.div>
      </template>
    </el-tree>
    <div v-if="treeData.length > 0 && loading === false" style="height: 100px;width: 100%;"></div>
  </motion.div>
  <StepChoice ref="stepChoiceRef"></StepChoice>
  <InterfaceChoice ref="interfaceChoiceRef"></InterfaceChoice>
  <CaseChoice ref="caseChoiceRef"></CaseChoice>
  <CaseStepChoice :excluded_ids="[case_id]" ref="caseStepChoiceRef"></CaseStepChoice>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { motion } from 'motion-v'
import { ElTree } from 'element-plus'
import Line from '@/views/case/content/case_content/runner/tree/components/line.vue'
import { useTreeNodeOperations } from './composables/useTreeNodeOperations'
import { useDragAndDrop } from './composables/useDragAndDrop'
import { useLineMounting } from './composables/useLineMounting'
import { defaultProps, stepActionGroup, removeNodeById, insertNode, analyzeTree, updateAllCheckStatus, filterNoneNodes, refreshCheckStatusJs } from './utils/constants'
import Multitasker from '@/views/case/content/case_content/runner/tree/node_components/multitasker.vue'
import If from '@/views/case/content/case_content/runner/tree/node_components/if.vue'
import Group from '@/views/case/content/case_content/runner/tree/node_components/group.vue'
import Interface from '@/views/case/content/case_content/runner/tree/node_components/interface.vue'
import Empty from '@/views/case/content/case_content/runner/tree/node_components/empty.vue'
import Database from '@/views/case/content/case_content/runner/tree/node_components/database.vue'
import Delay from '@/views/case/content/case_content/runner/tree/node_components/delay.vue'
import Script from '@/views/case/content/case_content/runner/tree/node_components/script.vue'
import Error from '@/views/case/content/case_content/runner/tree/node_components/error.vue'
import Case from '@/views/case/content/case_content/runner/tree/node_components/case.vue'
import Assertion from '@/views/case/content/case_content/runner/tree/node_components/assertion.vue'
import StepChoice from '@/views/case/content/case_content/runner/tree/components/step_dialog.vue';
import InterfaceChoice from '@/views/case/content/case_content/runner/tree/components/interface_selecter.vue'
import CaseChoice from '@/views/case/content/case_content/runner/tree/components/case_selecter.vue'
import CaseStepChoice from '@/views/case/content/case_content/runner/tree/components/step_selecter.vue'
import { ApiCaseMixin, ApiGetCaseSingle } from '@/api/case/case/index'
import FirstStep from '@/views/case/content/case_content/runner/tree/components/first_step.vue'
import CheckBox from '@/assets/motion/checkbox.vue'
import tools from '@/utils/tools'
import _ from 'lodash'

// 树形数据
const treeData = ref<any[]>([])

const treeRef: any = ref<InstanceType<typeof ElTree>>()
const hoveredNodeId = ref<number | null>(null)
const current_drag_node_target: any = ref(null)
const current_drag_node_data_id: any = ref(-1)
const drag_target_info: any = ref(null)
const origin_tree: any = ref(null)
const current_choice_step: any = ref(null)
const stepChoiceRef: any = ref(null)
const interfaceChoiceRef: any = ref(null)
const caseChoiceRef: any = ref(null)
const caseStepChoiceRef: any = ref(null)
const step_count: any = ref(0)
const checked_count: any = ref(0)
const loading: any = ref(false)
const case_info: any = ref(null)

const props = defineProps({
  case_id: {
    default: -1,
    type: Number
  },
  read_only: {
    default: 0,
    type: Number
  },
  exclude_case: {
    default: false,
    type: Boolean
  },
  status_mapping: {
    default: null,
    type: null
  },
  ready_data: {
    default: null,
    type: null
  }
})

watch(() => props.case_id, async (n, o) => {
  loading.value = true
  let params: any = {}
  if (props.exclude_case === true) {
    params.exclude_case = props.exclude_case
  }
  if (props.ready_data === null) {
    await ApiGetCaseSingle(props.case_id, params).then((res: any) => {
      treeData.value = res.steps
    })
  } else {
    treeData.value = props.ready_data
  }

  await tools.delaySec(200)
  loading.value = false
  await nextTick()
  if (treeRef.value) {
    await mountLines(treeRef)
  }
})

function get_case() {
  return case_info.value
}

onMounted(async () => {
  loading.value = true
  let params: any = {}
  if (props.exclude_case === true) {
    params.exclude_case = props.exclude_case
  }
  if (props.ready_data === null) {
    await ApiGetCaseSingle(props.case_id, params).then((res: any) => {
      case_info.value = res
      treeData.value = case_info.value.steps
    })
  } else {
    treeData.value = props.ready_data
  }

  setGlobalCheck()
  emit("done")
  await tools.delaySec(200)
  loading.value = false
  await nextTick()
  if (treeRef.value) {
    await mountLines(treeRef)
  }
})

function get_select() {
  let filter_node = filterNoneNodes(treeData.value)
  updateAllCheckStatus(filter_node, 'check')
  return filter_node
}

function clean_choice() {
  const oldStep = document.querySelector('.choice-step');
  if (oldStep) oldStep.classList.remove('choice-step');

  const oldChildren = document.querySelector('.choice-step-children');
  if (oldChildren) oldChildren.classList.remove('choice-step-children');
}

defineExpose({ get_select, get_case, clean_choice })

function setGlobalCheck() {
  const { totalNodes, checkedNodes } = analyzeTree(treeData.value)
  step_count.value = totalNodes
  checked_count.value = checkedNodes
}

function getGlobalCheckStatus() {
  if (checked_count.value === step_count.value) {
    return 'check'
  }
  if (checked_count.value === 0) {
    return 'none'
  }
  if (checked_count.value < step_count.value) {
    return 'part'
  }
}

const deleteChoiceNode = async () => {
  const _data = {
    type: 0,
    child_action_type: 'delete_choice_node',
    content: {
      case_id: props.case_id,
      t: 'all_checked'
    }
  }
}

const changeCheck = async (type: any) => {
  if (props.read_only === 2 || props.read_only === 3) return
  let _data
  if (type === 'check') {
    _data = {
      type: 0,
      child_action_type: 'check_change',
      content: {
        case_id: props.case_id,
        t: 'all_checked'
      }
    }
  } else if (type === 'none') {
    _data = {
      type: 0,
      child_action_type: 'check_change',
      content: {
        case_id: props.case_id,
        t: 'all_unchecked'
      }
    }
  }
  updateAllCheckStatus(treeData.value, type)

  if (props.read_only === 0) {
    await send_action(_data)
    refreshCheckStatusJs(treeData.value)
  }
  setGlobalCheck()
}

const emit = defineEmits(['scroll', 'choice', 'delete', 'done'])

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


const add_step_mapping: any = {
  'empty': ['interface', 'assertion', 'database', 'script', 'multitasker', 'group', 'if', 'error', 'delay', 'case', 'copy'],
  'multitasker-child': ['interface', 'assertion', 'database', 'script', 'multitasker', 'group', 'if', 'error', 'delay', 'case', 'copy'],
  'next': ['interface', 'assertion', 'database', 'script', 'multitasker', 'group', 'if', 'delay', 'case', 'copy'],
  'child': ['interface', 'assertion', 'database', 'script', 'multitasker', 'group', 'if', 'delay', 'case', 'copy']
}

const addFirstStep = async (step_type: any) => {
  await add_step(step_type, treeData.value, 'first', 'top', null)
  console.log(treeData.value);
}

const choice_step = async (range_type: string, data: any, position: any) => {
  const range = add_step_mapping[range_type]
  const { step_type } = await stepChoiceRef.value.open(range)
  await add_step(step_type, data, range_type, position, data.id)
}

const add_step = async (step_type: any, data: any, range_type: any, position: any, target_id: any) => {
  let res = null
  if (step_type === 'interface') {
    const { interface_list } = await interfaceChoiceRef.value.open()
    const _data = {
      type: 0,
      child_action_type: 'insert_default_step',
      content: {
        case_id: props.case_id,
        step_type: step_type,
        interface_list: interface_list,
        position: position,
        target_id: target_id
      }
    }
    res = await send_action(_data)
  } else if (step_type === 'case') {
    const { case_list, project } = await caseChoiceRef.value.open(props.case_id)

    const _data = {
      type: 0,
      child_action_type: 'insert_default_step',
      content: {
        case_id: props.case_id,
        step_type: step_type,
        case_list: case_list,
        position: position,
        target_id: target_id,
        project_id: project.id,
        project_name: project.name
      }
    }
    res = await send_action(_data)
  } else if (step_type === 'copy') {
    const { filter_step } = await caseStepChoiceRef.value.open()
    console.log(filter_step);
    const _data = {
      type: 0,
      child_action_type: 'copy_node_from_other_case',
      content: {
        case_id: props.case_id,
        origin_nodes: filter_step,
        position: position,
        target_id: target_id
      }
    }
    res = await send_action(_data)
  } else {
    const _data = {
      type: 0,
      child_action_type: 'insert_default_step',
      content: {
        case_id: props.case_id,
        step_type: step_type,
        position: position,
        target_id: target_id
      }
    }
    res = await send_action(_data)
    res = [res]
  }
  synchronizeData(range_type, data, res)
  setGlobalCheck()
  refreshCheckStatusJs(treeData.value)
}

const synchronizeData = (range_type: any, data: any, input_data: any) => {
  if (range_type === 'multitasker-child' || range_type === 'child' || range_type === 'empty') {
    insertNode(treeData.value, input_data, data.id, 'child')
  } else if (range_type === 'first') {
    treeData.value = input_data
  } else if (range_type === 'next') {
    insertNode(treeData.value, input_data, data.id, 'next')
  }
}

async function send_action(_data: any) {
  return await ApiCaseMixin(_data).then(res => {
    window.$toast({ title: '更新成功' })
    return res
  })
}

function findParentNode(tree: any, targetId: any, parent = null) {
  for (const node of tree) {
    if (node.id === targetId) {
      return parent; // 找到目标，返回父节点
    }
    if (node.children) {
      const found: any = findParentNode(node.children, targetId, node);
      if (found) {
        return found;
      }
    }
  }
  return null; // 没找到
}

const show_step_detail = (data: any, node: any, tree_node: any, event: any) => {
  if (props.read_only === 3) {
    choice_ui_change(data)
    emit('choice', data, node, tree_node, event)
    return
  }
  if (props.read_only > 0) return
  if (data.type === 'empty') {
    const father_node = findParentNode(treeData.value, data.id)
    choice_step('empty', father_node, 'child')
    return
  }
  if (data.type === 'interface' && data.is_exist === false) {
    window.$toast({ title: '该接口已经不存在，请删除后重新引用。', type: 'error' })
    return
  }
  if (data.type === 'case' && data.is_exist === false) {
    window.$toast({ title: '该用例已经不存在，请删除后重新引用。', type: 'error' })
    return
  }
  current_choice_step.value = data
  choice_ui_change(data)
  emit('choice', data, node, tree_node, event)
}

function choice_ui_change(data: any) {
  // 直接查找并移除，不用forEach
  const oldStep = document.querySelector('.choice-step');
  if (oldStep) oldStep.classList.remove('choice-step');

  const oldChildren = document.querySelector('.choice-step-children');
  if (oldChildren) oldChildren.classList.remove('choice-step-children');
  const el: any = document.querySelector(`.case-custom-tree .el-tree-node.is-expanded.is-focusable[data-key="${data.id}"]`)

  const content = el.querySelector('.node-content');
  if (content) {
    content.classList.add('choice-step');
  }

  if (data.children) {
    const childrenEl = el.querySelector('.el-tree-node__children');
    if (childrenEl) {
      childrenEl.classList.add('choice-step-children');
    }
  }
}

const getMaxId = (nodes: any) => {
  let maxId = 0;
  nodes.forEach((node: any) => {
    if (node.id > maxId) {
      maxId = node.id;
    }
    if (node.children) {
      maxId = Math.max(maxId, getMaxId(node.children));
    }
  });
  return maxId;
};
// 复制指定节点
const duplicateNode = (nodeId: number) => {
  // 找到原始节点的父节点和索引
  const findNodeAndParent: any = (nodes: any, id: number) => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.id === id) return { node, parent: nodes, index: i };
      if (node.children) {
        const foundNode = findNodeAndParent(node.children, id);
        if (foundNode) return foundNode;
      }
    }
  };

  // 找到被复制的节点及其父节点
  const { node: nodeToCopy, parent: parentNode, index } = findNodeAndParent(treeData.value, nodeId);
  if (!nodeToCopy || !parentNode) return; // 如果没有找到节点，直接返回

  // 获取当前最大ID
  const currentMaxId = getMaxId(treeData.value); // 获取当前最大ID

  // 调用递归函数并插入到父节点的children中
  let newNode = _.cloneDeep(nodeToCopy)
  newNode = updateNodeIds(newNode, currentMaxId + 1)
  if (parentNode.children) {
    parentNode.children.splice(index + 1, 0, newNode);
  } else {
    parentNode.splice(index + 1, 0, newNode);
  }

};

const updateNodeIds = (node: any, startId: number) => {
  node.id = startId; // 更新当前节点的ID

  // 如果节点有子节点，递归更新它们的ID
  if (node.children) {
    node.children.forEach((childNode: any) => {
      startId += 1; // 每次遇到一个子节点，ID 加 1
      updateNodeIds(childNode, startId); // 递归更新子节点的ID
    });
  }

  return node; // 返回更新后的起始ID
};

// 处理节点悬停
const handleNodeHover = (node_id: number) => {
  hoveredNodeId.value = node_id
}


const step_action = async (t: string, data: any) => {
  if (t === 'copy') {
    const _data = {
      type: 0,
      child_action_type: 'copy_node',
      content: {
        case_id: props.case_id,
        origin_node: data
      }
    }
    const res = await send_action(_data)
    insertNode(treeData.value, res, data.id, 'next')
    setGlobalCheck()
    refreshCheckStatusJs(treeData.value)
    return
  }
  if (t === 'delete') {
    const delete_step_id = data.id
    const _data = {
      type: 0,
      child_action_type: 'delete_step',
      content: {
        case_id: props.case_id,
        step_id: delete_step_id
      }
    }
    const empty_node = await send_action(_data)
    removeNodeById(treeData.value, delete_step_id, empty_node)
    setGlobalCheck()
    refreshCheckStatusJs(treeData.value)
    emit("delete", delete_step_id)
    return
  }
  // 添加相邻步骤
  if (t === 'addSiblingStep') {
    choice_step('next', data, 'next')
  }
  // 添加子步骤
  if (t === 'addChildStep') {
    if (data.type === 'multitasker') {
      choice_step('multitasker-child', data, 'child')
    } else {
      choice_step('child', data, 'child')
    }
  }
}

const handleDragEnter = (_: any, dropNode: any, _ev: any) => {
  function is_child(node: any, empty_node: any) {
    if (empty_node.level === 0 || empty_node.parent === null) {
      return false
    }
    if (empty_node.data.id === node.data.id) {
      return true
    }
    return is_child(node, empty_node.parent)
  }
  if (_.data.type === 'error') return
  if (dropNode.data.type === 'empty') {
    if (is_child(_, dropNode) === true) return
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
async function changeCheckHandle(
  type: 'none' | 'check' | 'part',
  nodeData: any
) {
  if (props.read_only === 2 || props.read_only === 3) return
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
  const _data = {
    type: 0,
    child_action_type: 'check_change',
    content: {
      case_id: props.case_id,
      t: type,
      target_id: nodeData.id
    }
  }
  if (props.read_only === 0) {
    await send_action(_data)
    refreshCheckStatusJs(treeData.value)
  }
  setGlobalCheck()
}

const draggingFromHandle = ref(false)

// 当在句柄上按下时，打标记
function onHandlePointerDown(value: boolean) {
  if (props.read_only) return
  origin_tree.value = _.cloneDeep(treeData.value)
  draggingFromHandle.value = value
}


// 拖拽相关处理函数
function handleAllowDrag(node: any) {
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
  console.log(draggingNode);
  console.log(dropNode);
  console.log(dropType);
  console.log('拖拽结束:', {
    dragging: draggingNode.data.label,
    target: dropNode?.data?.label,
    dropType: dropType
  })
  stopListeningMouse()
  cleanAllLine()
  clearHighlightTreeNode(current_drag_node_target.value)
  console.log(current_drag_node_data_id.value);
  console.log(drag_target_info.value);
  if (drag_target_info.value !== null) {
    moveNode(origin_tree.value, Number(current_drag_node_data_id.value), Number(drag_target_info.value.id), drag_target_info.value.position)
    treeData.value = origin_tree.value
    if (treeRef.value) {
      await mountLines(treeRef)
    }
    const _data = {
      type: 0,
      child_action_type: 'move_node',
      content: {
        case_id: props.case_id,
        change_id: current_drag_node_data_id.value,
        target_id: drag_target_info.value.id,
        position: drag_target_info.value.position
      }
    }
    await send_action(_data)
  } else {
    treeData.value = origin_tree.value
  }
  if (current_choice_step.value !== null && current_choice_step.value.id === draggingNode.data.id) {
    show_step_detail(current_choice_step.value, null, null, null)
  }

  refreshCheckStatusJs(treeData.value)
}

const handleDragStart = async (node: any, ev: any) => {
  console.log('开始拖拽:', node.data)
  console.log(draggingFromHandle.value);
  console.log(node.data);
  console.log(treeData.value);
  console.log(node);
  console.log(ev);

  let sibling_node_ids: Array<number> = []
  if (node.data.type === 'error') {
    node.parent.childNodes.forEach((child_node: any) => {
      if (child_node.data.id !== node.data.id) {
        sibling_node_ids.push(child_node.data.id)
      }
    })
  }
  await getNodeHeightMapping(node.data.id, node.data.type, sibling_node_ids)
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

  if (node.data.type !== 'multitasker' && node.data.type !== 'if' && node.data.type !== 'group') {
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
    drag_target_info.value = {
      id: Number(target.htmlObject.getAttribute('data-id')),
      position: target.status
    }
  } else {
    drag_target_info.value = null
  }
}


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
.choice-step {
  position: relative;
  opacity: 1;
}

.choice-step::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid rgba(0, 0, 0, 0.3);
  border-radius: inherit;
  pointer-events: none;
}

.choice-step-children {
  position: relative;
  opacity: 1;
}

.choice-step-children::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-left: 2px solid rgba(0, 0, 0, 0.3);
  border-right: 2px solid rgba(0, 0, 0, 0.3);
  border-bottom: 2px solid rgba(0, 0, 0, 0.3);
  border-top: none;
  border-radius: 0 0 6px 6px;
  pointer-events: none;
}

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
  border: 2px solid rgb(0, 0, 0);
  border-radius: inherit;
  pointer-events: none;
  animation: blinkLine 1s infinite ease-in-out;
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
  border-left: 2px solid rgb(0, 0, 0);
  border-right: 2px solid rgb(0, 0, 0);
  border-bottom: 2px solid rgb(0, 0, 0);
  border-top: none;
  border-radius: 0 0 6px 6px;
  /* 根据需要圆角 */
  pointer-events: none;
  animation: blinkLine 1s infinite ease-in-out;
}

/* 3. 如果没有子节点，则不缩进 */
.case-custom-tree .el-tree-node__children:empty {
  margin-left: 0 !important;
  margin-right: 5px !important;
}

/* 1. 根节点下第一层 children，缩进 20px */
.case-custom-tree>.el-tree-node>.el-tree-node__children:not(:empty) {
  border-left: 2px solid rgba(86, 87, 88, 0.04);
  border-right: 2px solid rgba(86, 87, 88, 0.04);
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

<style scoped lang="scss">
.case-tree-container {
  height: inherit;
  padding: 10px;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  .global-action {
    display: flex;
    justify-content: start;
    align-items: center;
    padding: 7px 16px;
    gap: 5px;
    box-sizing: border-box;
    font-size: 0.9rem;
    font-weight: 500;
  }
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