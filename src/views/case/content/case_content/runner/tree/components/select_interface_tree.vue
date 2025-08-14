<template>
  <div v-if="loading === false">
    <el-tree class="api-tree no-scroll" id="api-tree" ref="treeRef" style="margin-top: 10px" :data="dataSource"
      node-key="id" icon="ArrowRightBold" @node-click="change_menu" :highlight-current="true"
      :expand-on-click-node="false" :default-expanded-keys="firstLevelKeys" icon-class="none">
      <template #default="{ node, data }">
        <div v-if="
          data.child_type === 0 ||
          data.child_type === 1 ||
          data.child_type === 2
        " class="tree-node g-unselect">
          <el-icon v-if="data.child_type !== 2" :size="8" color="#606266" :class="node.expanded ? 'private-icon icon-expanded' : 'private-icon'
            " @click.stop="changeExpanded(node)">
            <ArrowRightBold />
          </el-icon>
          <div v-else style="padding: 5px;">
            <div style="width: 8px;height: 8px;"></div>
          </div>
          <CheckBox :check="get_check(node)" @change="changeCheck(node, data)"></CheckBox>
          <div v-if="data.child_type !== 2"
            style="display: flex; justify-content: center; align-items: center;color: black;">
            <FoldExpend v-if="node.expanded"></FoldExpend>
            <Fold v-else></Fold>
          </div>
          <span v-if="data.child_type === 2" class="method-span gradient-text" :class="method_color[data.method]">{{
            data.method.toUpperCase() }}</span>
          <div class="label-span-method">
            <div class="g-ellipsis">{{ data.name }}</div>
            <span class="count-span" v-if="data.child_type === 1">({{ data.count }})</span>
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
import { ref, watch, onMounted, getCurrentInstance } from "vue";
import { useRoute } from "vue-router";
import tools from "@/utils/tools";
import { getTree } from "@/api/program/tree";
import Fold from "@/assets/svg/tree/fold.vue";
import FoldExpend from '@/assets/svg/tree/fold_expend.vue'
import CheckBox from '@/assets/motion/checkbox.vue'
const emit = defineEmits(["change_menu"]);
const { proxy }: any = getCurrentInstance();
const route = useRoute();
const dataSource: any = ref([]);
const treeRef: any = ref(null)
const loading = ref(true);
const firstLevelKeys: any = ref([]);
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
  }
})

onMounted(async () => {
  // 调整一次高度
  await load_tree();
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

defineExpose({ getCheckedNodes })

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
}

async function load_tree(search_range = [0, 1, 2], excluded_ids = []) {
  loading.value = true;
  dataSource.value = [];
  const data = {
    project: props.project,
    search_range: search_range.join(","),
    excluded_ids: excluded_ids.join(","),
  };
  await getTree(data).then(async (data: any) => {
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
  width: 100%;
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
  justify-content: center;
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
