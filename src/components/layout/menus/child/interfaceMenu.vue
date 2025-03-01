<template>
  <div class="custom-tree-container">
    <el-affix :offset="60">
      <div
        class="tree-search"
        style="display: flex; align-items: center; margin-bottom: 10px"
      >
        <CButton style="width: 40px; display: inline-block"
          ><el-icon><CirclePlusFilled /></el-icon
        ></CButton>
        <el-input
          v-model="filterText"
          style="width: 200px; margin-left: 10px"
          placeholder="Filter keyword"
          :suffix-icon="Filter"
        />
      </div>
    </el-affix>
    <div class="tree-div" :style="{ 'margin-bottom': '200px' }">
      <div class="project-summary g-unselect" @click="enter_project_summary">
        <Circle></Circle>
        <span style="margin-left: 10px">项目概览</span>
      </div>
      <el-tree
        ref="treeRef"
        style="max-width: 600px; margin-top: 10px"
        :data="dataSource"
        node-key="id"
        icon="ArrowRightBold"
        @node-click="changeMenu"
        :default-expand-all="true"
        :highlight-current="true"
        :expand-on-click-node="false"
        :default-expanded-keys="[999]"
        icon-class="none"
        :filter-node-method="filterNode"
      >
        <template #default="{ node, data }">
          <div v-if="data.child_type === 0" class="tree-node g-unselect">
            <el-icon
              :size="8"
              color="#606266"
              :class="
                node.expanded ? 'private-icon icon-expanded' : 'private-icon'
              "
              @click.stop="changeExpanded(node)"
              ><ArrowRightBold
            /></el-icon>
            <Fold></Fold>
            <span class="label-span-method">{{ data.name }}</span>
          </div>
          <div
            v-if="data.child_type === 1"
            class="tree-node top-tree-node g-unselect"
          >
            <span class="label-span-icon"
              ><el-icon
                :size="8"
                color="#606266"
                :class="
                  node.expanded ? 'private-icon icon-expanded' : 'private-icon'
                "
                @click.stop="changeExpanded(node)"
                ><ArrowRightBold /></el-icon
            ></span>
            <Fold></Fold>
            <span class="label-span-method">{{ data.name }} </span>
          </div>
          <div v-if="data.child_type === 2" class="tree-node g-unselect">
            <span class="method-span" :class="method_color[data.m]">{{
              method_list[data.m]
            }}</span>
            <span class="label-span"
              >{{ data.name }}
              <span v-if="data.children" class="label-span-icon"
                ><el-icon
                  :size="8"
                  color="#606266"
                  :class="
                    node.expanded
                      ? 'private-right-icon icon-expanded'
                      : 'private-right-icon'
                  "
                  @click.stop="changeExpanded(node)"
                  ><ArrowRightBold /></el-icon
              ></span>
            </span>
          </div>
          <div
            v-if="data.child_type === 4"
            class="tree-node case-node g-unselect"
          >
            <span class="method-span purple">case</span>
            <span class="label-span-method">{{ data.name }}</span>
          </div>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from "vue";
import Fold from "@/assets/svg/tree/fold.vue";
import Circle from "@/assets/svg/tree/circle.vue";
import { ElTree } from "element-plus";
import CButton from "@/components/common/button/CButton.vue";
import { Filter } from "@element-plus/icons-vue";
import { getTree } from "@/api/program/tree";
import { useRoute, useRouter } from "vue-router";
const route = useRoute();
const router = useRouter();
const method_list = ["GET", "POST", "PUT", "DEL"];
const method_color = ["green", "orange", "blue", "red"];
const emit = defineEmits(["changeMenu"]);
const treeRef = ref<InstanceType<typeof ElTree>>();
const filterText = ref("");

const props = defineProps({
  apiItem: {
    type: Object,
    default: () => {
      return {};
    },
  },
});

watch(
  () => props.apiItem,
  (val) => {
    console.log(val);
  }
);

const filterNode = (value: any, data: any) => {
  if (!value) return true;
  return data.name.includes(value);
};
interface Tree {
  id: number;
  name: string;
  child_type: Number;
  m?: Number;
  children?: Tree[];
}

function changeMenu(data: any, node: any, event: any, event_object: any) {
  console.log(data);
  console.log(node);
  console.log(event);
  console.log(event_object);
  emit("changeMenu", data, node);
}

function enter_project_summary() {
  treeRef.value!.setCurrentKey(undefined);
}

onMounted(() => {
  const data = {
    project: route.params.project,
  };
  getTree(data).then((data: any) => {
    dataSource.value.push(data[0]);
    console.log(dataSource.value);
  });
});

watch(filterText, (val: any) => {
  treeRef.value!.filter(val);
});

const dataSource = ref<Tree[]>([]);

function changeExpanded(node: any) {
  console.log(node);
  if (node.expanded) {
    node.collapse();
  } else {
    node.expand();
  }
}
</script>

<style lang="scss" scoped>
.project-summary {
  font-size: 14px;
  padding: 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  color: black;
  font-weight: 600;
  // background-color: var(--greyLight-0);
  cursor: pointer;
}
.tree-div {
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
