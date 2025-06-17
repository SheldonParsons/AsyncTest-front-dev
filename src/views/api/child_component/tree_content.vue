<template>
  <div v-if="loading === false">
    <el-tree
      class="api-tree no-scoll"
      id="api-tree"
      ref="treeRef"
      style="margin-top: 10px"
      :data="dataSource"
      node-key="id"
      icon="ArrowRightBold"
      @node-click="change_menu"
      :highlight-current="true"
      :expand-on-click-node="false"
      :default-expanded-keys="firstLevelKeys"
      icon-class="none"
    >
      <template #default="{ node, data }">
        <div
          v-if="
            data.child_type === 0 ||
            data.child_type === 1 ||
            data.child_type === 2
          "
          class="tree-node g-unselect"
        >
          <el-icon
            v-if="data.child_type !== 2"
            :size="8"
            color="#606266"
            :class="
              node.expanded ? 'private-icon icon-expanded' : 'private-icon'
            "
            @click.stop="changeExpanded(node)"
            ><ArrowRightBold
          /></el-icon>
          <div
            v-if="data.child_type !== 2"
            style="display: flex; justify-content: center; align-items: center"
          >
            <Fold></Fold>
          </div>
          <span
            v-if="data.child_type === 2"
            class="method-span"
            :class="method_color[data.method]"
            >{{ data.method.toUpperCase() }}</span
          >
          <div class="label-span-method">
            <div class="g-ellipsis">{{ data.name }}</div>
            <span class="count-span" v-if="data.child_type === 1"
              >({{ data.count }})</span
            >
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
            <el-skeleton-item
              variant="h1"
              :style="{ width: randomStep() + '%' }"
              style="margin-left: 5%"
            />
          </div>
        </template>
      </el-skeleton>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from "vue";
import { useRoute } from "vue-router";
import tools from "@/utils/tools";
import { getTree } from "@/api/program/tree";
import Fold from "@/assets/svg/tree/fold.vue";
const emit = defineEmits(["change_menu"]);
const { proxy }: any = getCurrentInstance();
const route = useRoute();
const dataSource: any = ref([]);
const loading = ref(true);
const firstLevelKeys: any = ref([]);
const method_color: any = {
  get: "green",
  post: "orange",
  put: "blue",
  delete: "red",
};

onMounted(async () => {
  // 调整一次高度
  await load_tree();
});
async function load_tree(search_range = [0, 1, 2], excluded_ids = []) {
  loading.value = true;
  dataSource.value = [];
  const data = {
    project: route.params.project,
    search_range: search_range.join(","),
    excluded_ids: excluded_ids.join(","),
  };
  await getTree(data).then(async (data: any) => {
    dataSource.value.push(data[0]);
    dataSource.value.forEach((rootNode: any) => {
      if (rootNode.children) {
        rootNode.children.forEach((child: any) => {
          firstLevelKeys.value.push(child.id);
        });
      }
    });
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
    emit("change_menu", data);
  } else {
    tools.message("请选择接口节点", proxy, "info");
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
  color: #ff6a6a;
}
.green {
  color: #3cb371;
}
.blue {
  color: #1e90ff;
}
.orange {
  color: #eead0e;
}
.purple {
  background: linear-gradient(to right, #7b42f6, #b01eff); /* 从左到右的渐变 */
  -webkit-background-clip: text; /* 背景裁剪为文字 */
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
.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content {
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
