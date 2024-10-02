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
    <div class="tree-div" :style="{ height: tree_height + 'px' }">
      <el-tree
        ref="treeRef"
        style="max-width: 600px"
        :data="dataSource"
        node-key="id"
        icon="ArrowRightBold"
        :expand-on-click-node="true"
        :default-expanded-keys="[999]"
        icon-class="none"
        :filter-node-method="filterNode"
      >
        <template #default="{ node, data }">
          <div v-if="data.t === 0" class="tree-node g-unselect">
            <el-icon
              :size="8"
              color="#606266"
              :class="
                node.expanded ? 'private-icon icon-expanded' : 'private-icon'
              "
              ><ArrowRightBold
            /></el-icon>
            <Fold></Fold>
            <span class="label-span-method">{{ data.label }}</span>
          </div>
          <div v-if="data.t === 1" class="tree-node g-unselect">
            <span class="method-span" :class="method_color[data.m]">{{
              method_list[data.m]
            }}</span>
            <span class="label-span">{{ data.label }}
              <span v-if="data.children" class="label-span-icon"
                ><el-icon
                  :size="8"
                  color="#606266"
                  :class="
                    node.expanded
                      ? 'private-right-icon icon-expanded'
                      : 'private-right-icon'
                  "
                  ><ArrowRightBold /></el-icon
              ></span>
            </span>
          </div>
          <div v-if="data.t === 2" class="tree-node top-tree-node g-unselect">
            <Fold></Fold>
            <span class="label-span-method"
              >{{ data.label }}
              <span class="label-span-icon"
                ><el-icon
                  :size="8"
                  color="#606266"
                  :class="
                    node.expanded
                      ? 'private-icon icon-expanded'
                      : 'private-icon'
                  "
                  ><ArrowRightBold /></el-icon
              ></span>
            </span>
          </div>
          <div v-if="data.t === 3" class="tree-node g-unselect">
            <Fold></Fold>
            <span class="label-span-method">{{ data.label }}</span>
          </div>
          <div v-if="data.t === 4" class="tree-node case-node g-unselect">
            <span class="method-span purple">case</span>
            <span class="label-span-method">{{ data.label }}</span>
          </div>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from "vue";
import Fold from "@/assets/svg/tree/fold.vue";
import { ElTree } from "element-plus";
import CButton from "@/components/common/button/CButton.vue";
import { Filter } from "@element-plus/icons-vue";
const method_list = ["GET", "POST", "PUT", "DEL"];
const method_color = ["green", "orange", "blue", "red"];

const treeRef = ref<InstanceType<typeof ElTree>>();
const filterText = ref("");

const tree_height = ref(0);

const filterNode = (value: any, data: any) => {
  if (!value) return true;
  return data.label.includes(value);
};
interface Tree {
  id: number;
  label: string;
  t: Number;
  m?: Number;
  children?: Tree[];
}

onMounted(() => {
  tree_height.value = window.innerHeight * 1.27;
});

watch(filterText, (val: any) => {
  console.log(val);

  treeRef.value!.filter(val);
});

const dataSource = ref<Tree[]>([
  {
    id: 777,
    label: "项目概览",
    t: 3,
  },
  {
    id: 999,
    label: "接口",
    t: 2,
    children: [
      {
        id: 1,
        label: "测试目录",
        t: 0,
        children: [
          {
            id: 4,
            label: "Level two 1-1",
            t: 0,
            children: [
              {
                id: 9,
                label: "Level three 1-1-1",
                t: 1,
                m: 0,
                children: [
                  {
                    id: 91,
                    label: "在售宠物",
                    t: 4
                  }
                ]
              },
              {
                id: 10,
                label: "Level three 1-1-2",
                t: 1,
                m: 0,
              },
              {
                id: 10,
                label: "Level three 1-1-2",
                t: 0,
                children: [
                  {
                    id: 9,
                    label: "Level three 1-1-1",
                    t: 1,
                    m: 0,
                  },
                  {
                    id: 10,
                    label: "Level three 1-1-2",
                    t: 1,
                    m: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 1,
        label: "测试目录",
        t: 0,
        children: [
          {
            id: 4,
            label: "Level two 1-1",
            t: 0,
            children: [
              {
                id: 9,
                label: "Level three 1-1-1",
                t: 1,
                m: 0,
              },
              {
                id: 10,
                label: "Level three 1-1-2",
                t: 1,
                m: 0,
              },
              {
                id: 10,
                label: "Level three 1-1-2",
                t: 0,
                children: [
                  {
                    id: 9,
                    label: "Level three 1-1-1",
                    t: 1,
                    m: 0,
                  },
                  {
                    id: 10,
                    label: "Level three 1-1-2",
                    t: 1,
                    m: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 2,
        label: "Level one 2",
        t: 0,
        children: [
          {
            id: 5,
            label: "Level two 2-1",
            t: 1,
            m: 1,
          },
          {
            id: 6,
            label: "Level two 2-2",
            t: 1,
            m: 2,
          },
        ],
      },
      {
        id: 3,
        label: "Level one 3",
        t: 0,
        children: [
          {
            id: 7,
            label: "Level two 3-1",
            t: 1,
            m: 3,
          },
          {
            id: 8,
            label: "Level two 3-2",
            t: 1,
            m: 1,
          },
        ],
      },
      {
        id: 1,
        label: "测试目录",
        t: 0,
        children: [
          {
            id: 4,
            label: "Level two 1-1",
            t: 0,
            children: [
              {
                id: 9,
                label: "Level three 1-1-1",
                t: 1,
                m: 0,
              },
              {
                id: 10,
                label: "Level three 1-1-2",
                t: 1,
                m: 0,
              },
              {
                id: 10,
                label: "Level three 1-1-2",
                t: 0,
                children: [
                  {
                    id: 9,
                    label: "Level three 1-1-1",
                    t: 1,
                    m: 0,
                  },
                  {
                    id: 10,
                    label: "Level three 1-1-2",
                    t: 1,
                    m: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 2,
        label: "Level one 2",
        t: 0,
        children: [
          {
            id: 5,
            label: "Level two 2-1",
            t: 1,
            m: 1,
          },
          {
            id: 6,
            label: "Level two 2-2",
            t: 1,
            m: 2,
          },
        ],
      },
      {
        id: 3,
        label: "Level one 3",
        t: 0,
        children: [
          {
            id: 7,
            label: "Level two 3-1",
            t: 1,
            m: 3,
          },
          {
            id: 8,
            label: "Level two 3-2",
            t: 1,
            m: 1,
          },
        ],
      },
    ],
  },
]);

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
  font-size: 12px!important;
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
  font-size: 12px;
  font-weight: 500;
  width: 100%;
  padding-left: 5px;
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
  margin-left: 10px
}

/* 禁用 el-tree 节点的展开/收起动画 */
.el-tree-node__children {
  transition: none !important;
}

.el-tree-node__expand-icon {
  transition: none !important;
}
</style>
