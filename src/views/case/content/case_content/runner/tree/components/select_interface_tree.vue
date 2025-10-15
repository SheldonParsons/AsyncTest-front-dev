<template>
  <div v-if="loading === false">
    <el-tree class="api-tree no-scroll" id="api-tree" ref="treeRef" style="margin-top: 10px" :data="dataSource"
      node-key="id" icon="ArrowRightBold" @node-click="change_menu" :highlight-current="true"
      :expand-on-click-node="false" :default-expanded-keys="firstLevelKeys" icon-class="none">
      <template #default="{ node, data }">
        <div v-if="
          data.child_type === 0 ||
          data.child_type === 1 ||
          data.child_type === (is_case ? 3 : 2)
        " class="tree-node g-unselect">
          <el-icon v-if="data.child_type !== (is_case ? 3 : 2)" :size="8" color="#606266" :class="node.expanded ? 'private-icon icon-expanded' : 'private-icon'
            " @click.stop="changeExpanded(node)">
            <ArrowRightBold />
          </el-icon>
          <div v-else style="padding: 5px;">
            <div style="width: 8px;height: 8px;"></div>
          </div>
          <CheckBox :check="get_check(node)" @change="changeCheck(node, data)" :read_only="get_read_only_status(data)">
          </CheckBox>
          <div v-if="data.child_type !== (is_case ? 3 : 2)"
            style="display: flex; justify-content: center; align-items: center;color: black;">
            <FoldExpend v-if="node.expanded"></FoldExpend>
            <Fold v-else></Fold>
          </div>
          <span v-if="data.child_type === 2" class="method-span gradient-text" :class="method_color[data.method]">{{
            data.method.toUpperCase() }}</span>
          <Case style="height: 13px" v-if="data.child_type === 3"></Case>
          <TooltipAnimation :isOpen="get_show_tooltip(data)" v-if="data.child_type === 3">
            <template #trigger>
              <div @mouseenter="showIdTooltip = data.id" @mouseleave="showIdTooltip = -1" class="label-span-method"
                :class="{ 'inactive-label': get_read_only_status(data) > 0 }">
                <div class="g-ellipsis">{{ data.name }}</div>
              </div>
            </template>
            <template #default>
              <div style="display: flex;flex-direction: column;gap: 5px;">
                <div>无法引用</div>
                <div v-if="get_read_only_status(data) === 1" style="color: rgba(255,255,255,0.5);line-height: 1.3rem;">
                  该测试用例为当前用例，无法引用自身。</div>
                <div v-if="get_read_only_status(data) === 2" style="color: rgba(255,255,255,0.5);line-height: 1.3rem;">
                  该测试用例直接或者间接引用了当前用例，所以无法引用它。</div>
              </div>
            </template>
          </TooltipAnimation>
          <div class="label-span-method" v-if="data.child_type !== 3">
            <div class="g-ellipsis">{{ data.name }}</div>
            <span class="count-span" v-if="data.child_type === 1 || data.child_type === 0">({{ data.count }})</span>
          </div>
        </div>
      </template>
    </el-tree>
  </div>
  <el-row v-else>
    <el-col :span="22" :offset="1">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item variant="h1" style="width: 100%" />
          <div v-for="item in 15" style="margin-top: 10px">
            <el-skeleton-item variant="h1" :style="{ width: 10 + '%' }" />
            <el-skeleton-item variant="h1" :style="{ width: randomStep() + '%' }" style="margin-left: 5%" />
          </div>
        </template>
      </el-skeleton>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue";
import tools from "@/utils/tools";
import { getTree } from "@/api/program/tree";
import Fold from "@/assets/svg/tree/fold.vue";
import FoldExpend from '@/assets/svg/tree/fold_expend.vue'
import CheckBox from '@/assets/motion/checkbox.vue'
import Case from "@/assets/svg/tree/case.vue";
import TooltipAnimation from '@/components/common/general/tooltip.vue'
const emit = defineEmits(["change_menu", "change_check", "ready"]);
const dataSource: any = ref([]);
const treeRef: any = ref(null)
const loading = ref(true);
const firstLevelKeys: any = ref([]);
const showIdTooltip = ref(-1)
const method_color: any = {
  get: "green",
  post: "orange",
  put: "blue",
  delete: "red",
};

const props = defineProps({
  project: {
    type: Number,
    default: -1
  },
  is_case: {
    type: Boolean,
    default: false
  },
  case_id: {
    type: Number,
    default: -1
  }
})

onMounted(async () => {
  // 调整一次高度
  await load_tree();
  emit('ready')
});

watch(
  () => props.project,
  (newVal: any, oldVal) => {
    load_tree();
  }
);

function getCheckedNodes() {
  return treeRef.value!.getCheckedNodes(false, false)
}

function get_read_only_status(data: any) {
  if (data.child_type === 3) {
    if (data.target === props.case_id) return 1
    if (data.is_reference) return 2
  }

  return 0
}

/**
 * [辅助函数] 递归构建一个从 target 属性到 id 数组的映射
 * @param nodes - 当前要遍历的节点数组
 * @param map - 用于存储映射的 Map 对象
 */
function buildTargetToIdMap(nodes: any[], map: Map<any, number[]>) {
  for (const node of nodes) {
    if (node.target !== undefined && node.id !== undefined) {
      if (!map.has(node.target)) {
        map.set(node.target, []);
      }
      if (node.child_type === 3) {
        map.get(node.target)!.push(node.id);
      }
    }
    if (node.children && node.children.length > 0) {
      buildTargetToIdMap(node.children, map);
    }
  }
}

/**
 * [推荐] 根据 target 属性批量设置节点的勾选状态
 * @param targets - 要设置勾选的 target 值数组
 * @param checked - 目标状态 (true 为勾选, false 为取消勾选)
 */
function checkNodesByTarget(targets: any[], checked: boolean) {
  if (!treeRef.value || !dataSource.value) {
    return;
  }
  console.log(dataSource.value);
  

  // 1. 构建 target -> [id, id...] 的映射
  const targetToIdMap = new Map<any, number[]>();
  buildTargetToIdMap(dataSource.value, targetToIdMap);

  // 2. 将输入的 targets 数组转换为对应的 id 数组
  const idsToChange: number[] = [];
  for (const target of targets) {
    if (targetToIdMap.has(target)) {
      idsToChange.push(...targetToIdMap.get(target)!);
    }
  }
  console.log(targetToIdMap);
  

  // 3. 使用 setCheckedKeys 进行高效的批量操作
  if (checked) {
    console.log("in check");
    
    // 勾选：合并当前已选中的和新增的
    const currentCheckedIds = treeRef.value.getCheckedKeys();
    const finalIds = [...new Set([...currentCheckedIds, ...idsToChange])];
    treeRef.value.setCheckedKeys(finalIds);
  } else {
    console.log("in un check");
    
    // 取消勾选：从当前已选中的移除
    const currentCheckedIds = treeRef.value.getCheckedKeys();
    const idsToRemoveSet = new Set(idsToChange);
    console.log(currentCheckedIds);
    
    console.log(idsToRemoveSet);
    
    const finalIds = currentCheckedIds.filter((id: any) => !idsToRemoveSet.has(id as number));
    console.log(finalIds);
    
    treeRef.value.setCheckedKeys(finalIds);
  }
}

function check(ids: number[], checked: boolean) {
  checkNodesByTarget(ids, checked)
}

defineExpose({ getCheckedNodes, check })

function get_check(node: any) {
  if (node.checked === true) {
    return 'check'
  } else {
    if (node.indeterminate) {
      return 'part'
    }
  }
  return 'none'
}

function changeCheck(node: any, data: any) {
  const wantChecked = !node.checked      // 想切换就取反
  // 第三个参数 deep：是否级联影响子孙。通常用 false。
  treeRef.value!.setChecked(data, wantChecked, true)
  emit('change_check', { data, wantChecked })
}

function traverseTree(nodes: any, processNode: any) {
  // 遍历当前层级的每一个节点
  for (const node of nodes) {
    // 1. 对当前节点执行您自定义的操作
    processNode(node);

    // 2. 如果当前节点有子节点，则递归地遍历子节点
    if (node.children && Array.isArray(node.children)) {
      traverseTree(node.children, processNode);
    }
  }
}


function check_is_reference(currentNode: any) {
  if (currentNode.target === props.case_id) {
    currentNode.disabled = true
  }
}

function get_show_tooltip(data: any) {
  if (showIdTooltip.value !== data.id) {
    return false
  }
  if (data.target === props.case_id) {
    return true
  }
  if (data.is_reference) return true
}


async function load_tree(search_range = [0, 1, 3], excluded_ids = []) {
  if (props.project === -1) return
  loading.value = true;
  dataSource.value = [];
  let data: any = {
    project: props.project,
    search_range: props.is_case ? [0, 1, 3].join(",") : [0, 1, 2].join(","),
    excluded_ids: excluded_ids.join(","),
    type: props.is_case ? 1 : 0
  };
  console.log(props.is_case);

  if (props.is_case === true) {
    data['current_case'] = props.case_id
  }
  await getTree(data).then(async (data: any) => {
    traverseTree(data, check_is_reference)
    dataSource.value.push(data[0]);
    firstLevelKeys.value.push(data[0].id)
    await tools.delay();

    loading.value = false;
  });
}
function randomStep() {
  const step = 10;
  const min = 50;
  const max = 75;
  return Math.floor(Math.random() * ((max - min) / step + 1)) * step + min;
}
function changeExpanded(node: any) {
  if (node.expanded) {
    node.collapse();
  } else {
    node.expand();
  }
}

function change_menu(data: any, node: any, event: any, event_object: any) {
  if (data.child_type === 2) {
    changeCheck(node, data)
  } else {
    changeExpanded(node)
  }
}
</script>

<style lang="scss" scoped>
.api-tree {
  overflow: auto;
}

.count-span {
  font-size: 12px;
  margin-left: 5px;
  color: var(--default-font-color);
}

.action-list {
  padding-top: 5px;
  display: flex;
  flex-direction: column;
  gap: 3px;

  .action-item:hover {
    background-color: var(--default-bg);
  }

  .action-delete-item:hover {
    background-color: var(--delete-bg-color) !important;
    color: var(--delete-font-color);
  }

  .action-delete-item {
    cursor: pointer;
    display: flex;
    justify-content: space-between !important;
    align-items: center;

    .delete-icon {
      padding-right: 10px;
    }
  }

  .delete-front-item {
    display: flex;
    align-items: center;
    justify-content: start;
    gap: 5px;
  }

  .action-item {
    cursor: pointer;
    padding-left: 10px;
    height: 2rem;
    font-size: 14px;
    font-weight: 400;
    border-radius: 5px;
    display: flex;
    justify-content: start;
    align-items: center;
    gap: 5px;

    .action-icon {
      width: 1.3rem;
      height: 1.3rem;

      svg {
        width: 1.3rem;
        height: 1.3rem;
      }
    }
  }
}

.action-icon {
  width: 1.2em;
  height: 1.2em;

  path {
    fill: white;
  }
}

.action-header {
  height: 30px;
  padding-left: 10px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  justify-content: start;
  align-items: center;
}

.change-name {
  padding: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.more-action-div {
  width: 300px;
}

.menu-btn {
  width: 1em !important;
  height: 1em !important;
}

.hover-menu-box {
  width: 1.4rem !important;
  height: 0.9rem !important;

  svg {
    width: 14px !important;
    height: 14px !important;
  }
}

.project-summary {
  font-size: 14px;
  padding: 5px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  color: black;
  font-weight: 600;
  background-color: #f9f9f9;
  cursor: pointer;
}

.tree-div {
  height: 100%;
  // overflow: scroll;
}

.red {
  background: linear-gradient(80deg, black 0%, #9c4c4c 30%);
}

.green {
  background: linear-gradient(80deg, black 0%, #4fa380 50%);
}

.blue {
  background: linear-gradient(80deg, black 0%, #504c9d 30%);
}

.orange {
  // color: #eead0e;
  background: linear-gradient(80deg, black 0%, #976b49 30%);
}

.gradient-text {
  /* 定义背景渐变 */
  /* 将背景裁剪到文字（仅 WebKit 内核生效）*/
  -webkit-background-clip: text;
  /* 文字本身透明，这样才能显示背景 */
  -webkit-text-fill-color: transparent;
  /* 对非 WebKit 浏览器，也可以加上普通 background-clip */
  background-clip: text;
  /* 如果希望支持 Firefox，需要开启 text-fill-color 的标准属性（目前仍需前缀或兼容写法） */
  color: transparent;
  font-weight: 800;
}


.purple {
  background: linear-gradient(to right, #7b42f6, #b01eff);
  /* 从左到右的渐变 */
  -webkit-background-clip: text;
  /* 背景裁剪为文字 */
  color: transparent;
  font-size: 12px !important;
}

.method-span {
  font-weight: 500;
  font-size: 10px;
  text-align: right;
}

.label-span {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  width: 80%;
  padding-left: 5px;
}

.label-span-method {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 400;
  // width: 100%;
  padding-left: 5px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  line-height: 28px;
  color: black;
  cursor: pointer;
  font-family: -apple-system, "BlinkMacSystemFont", "Segoe UI", roboto,
    "Helvetica Neue", arial, "Noto Sans", sans-serif, "Apple Color Emoji",
    "Segoe UI Emoji";
}

.inactive-label {
  color: #d3d3d3;
  /* 淡灰色 */
  text-decoration: line-through;
  /* 横线穿过文字 */
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;
}

.el-tree-node__expand-icon {
  color: var(--global-theme-color);
}

.tree-node {
  display: flex;
  justify-content: start;
  align-items: center;
  gap: 5px;
  width: 100%;
}
</style>

<style lang="scss">
.el-tree--highlight-current .el-tree-node.is-current>.el-tree-node__content {
  background-color: var(--greyLight-0);
}

.el-tree-node__content {
  border-radius: 5px;
}

.el-tree-node__label {
  width: 100%;

  .tree-node {
    width: 100%;
  }
}

.el-tree-node__expand-icon {
  display: none;
}

.icon-expanded {
  transform: rotate(90deg);
}

.private-icon {
  transition: transform 0.2s ease-in-out;
  padding: 5px;
}

.private-right-icon {
  transition: transform 0.2s ease-in-out;
  margin-left: 5px;
  margin-top: 3px;
}

.case-node {
  margin-left: 10px;
}

/* 禁用 el-tree 节点的展开/收起动画 */
.el-tree-node__children {
  transition: none !important;
}

.el-tree-node__expand-icon {
  transition: none !important;
}
</style>
