<template>
  <div class="custom-tree-container" style="height: 100%">
    <el-affix :offset="60">
      <div class="tree-search" style="display: flex; align-items: center; margin-bottom: 10px">
        <el-input v-model="filterText" placeholder="搜索" :suffix-icon="Filter" />
      </div>
    </el-affix>
    <div ref="header" class="project-summary g-unselect" @click="enter_project_summary" id="api-project-summery">
      <ResourceFrom :t="current_source">
        <div v-if="current_source == 'inner'">IntelliJ IDEA Interface</div>
        <div v-if="current_source == 'outer'">AsyncTest Interface</div>
      </ResourceFrom>
    </div>
    <div class="tree-div no-scroll" id="api-tree-div" ref="container" style="overflow: scroll;"
      v-if="current_source == 'inner'">
      <InterfaceTree @changeMenu="data => emit('changeMenu', data)"></InterfaceTree>
      <DataStructureTree @changeMenu="data => emit('changeMenu', data)"></DataStructureTree>
    </div>
    <div class="tree-div no-scroll" id="api-tree-div" ref="container" style="overflow: scroll;"
      v-if="current_source == 'outer'">
      <OuterInterfaceTree @changeMenu="data => emit('changeMenu', data)"></OuterInterfaceTree>
      <OuterDataStructureTree @changeMenu="data => emit('changeMenu', data)"></OuterDataStructureTree>
    </div>
  </div>

</template>

<script lang="ts" setup>
import { ref, getCurrentInstance } from "vue";
import InterfaceTree from '@/components/layout/menus/child/interface_menu_child/interface_tree.vue'
import OuterInterfaceTree from '@/components/layout/menus/child/interface_menu_child/outer_interface_tree.vue'
import DataStructureTree from '@/components/layout/menus/child/interface_menu_child/data_structure_tree.vue'
import OuterDataStructureTree from '@/components/layout/menus/child/interface_menu_child/outer_data_structure_tree.vue'
import tools from "@/utils/tools";
import { Filter } from "@element-plus/icons-vue";
import ResourceFrom from '@/components/layout/menus/child/interface_menu_child/resource_from.vue'
import _ from 'lodash'
const { proxy }: any = getCurrentInstance();
const emit = defineEmits(["changeMenu", "switchRouterAction"]);
const filterText = ref("");

const current_source = ref("inner")

const container: any = ref(null);
const header: any = ref(null);

function enter_project_summary() {
  current_source.value = current_source.value === 'inner' ? 'outer' : 'inner'
}


</script>

<style lang="scss" scoped>
.expand-icon {
  box-sizing: border-box;
  border-radius: 4px;
  cursor: pointer;
}

.expand-icon:hover {
  background-color: #e6e6e6;
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
  width: 2rem;
  height: 1.5rem;
  margin-right: 5px;
}

.project-summary {
  font-size: 14px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  color: black;
  font-weight: 600;
  // background-color: #f9f9f9;
  cursor: pointer;
}

.tree-div {
  height: calc(100vh - 313px);
}

.red {
  background: linear-gradient(180deg, black 0%, #9c4c4c 30%);
}

.green {
  background: linear-gradient(180deg, black 0%, #4fa380 50%);
}

.blue {
  background: linear-gradient(180deg, black 0%, #504c9d 30%);
}

.orange {
  // color: #eead0e;
  background: linear-gradient(180deg, black 0%, #b87e52 50%);
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
  font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
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
  padding-left: 3px;
  box-sizing: border-box;
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
