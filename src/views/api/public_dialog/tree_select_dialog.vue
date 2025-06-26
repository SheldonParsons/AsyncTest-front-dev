<template>
  <el-dialog
    v-model="dialogVisible"
    :show-close="false"
    width="550"
    style="border-radius: 12px"
    class="process-dialog"
    :append-to-body="true"
  >
    <template #header="{ close, titleId, titleClass }">
      <el-row style="padding: 24px 24px 14px">
        <el-col :span="23"
          ><span
            style="
              color: rgba(16, 24, 40, 0.8);
              font-weight: 500;
              font-size: 16px;
              margin: 0px;
            "
            >{{ title }}({{ move_name }})</span
          ></el-col
        >
        <el-col
          :span="1"
          style="display: flex; justify-content: end; align-items: center"
          ><div class="del-process" @click="close">
            <el-icon :size="12"><CloseBold /></el-icon></div
        ></el-col>
      </el-row>
      <el-divider></el-divider>
    </template>
    <div style="margin: 20px">
      <el-dropdown
        ref="treeDropdown"
        trigger="click"
        style="width: 100%"
        popper-class="tree-dropdown"
      >
        <el-input v-model="target_name" :disabled="loading"></el-input>
        <template #dropdown>
          <el-tree
            ref="treeRef"
            style="margin-top: 10px"
            :data="dataSource"
            node-key="id"
            icon="ArrowRightBold"
            @node-click="choice_node"
            :highlight-current="true"
            :expand-on-click-node="false"
            icon-class="none"
            default-expand-all
            class="tree-content-dropdown"
          >
            <template #default="{ node, data }">
              <div
                v-if="
                  data.child_type === 0 ||
                  data.child_type === 1 ||
                  data.child_type === 2
                "
                class="tree-node g-unselect"
                :class="{ 'unselect-row': is_disable(data.id) }"
              >
                <el-icon
                  v-if="data.child_type !== 2"
                  :size="8"
                  color="#606266"
                  :class="
                    node.expanded
                      ? 'private-icon icon-expanded'
                      : 'private-icon'
                  "
                  @click.stop="changeExpanded(node)"
                  ><ArrowRightBold
                /></el-icon>
                <div
                  style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  "
                >
                  <Fold></Fold>
                </div>
                <div class="label-span-method g-ellipsis">
                  {{ data.name }}
                </div>
              </div>
            </template>
          </el-tree>
        </template>
      </el-dropdown>
    </div>
    <template #footer>
      <div class="process-dialog-footer">
        <button class="process-dialog-btn cancel-btn" @click="handleClose">
          <span>取消</span>
        </button>
        <button
          class="process-dialog-btn add-btn"
          style="margin-left: 8px"
          @click="action()"
        >
          {{ action_title }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getTree } from "@/api/program/tree";
import Fold from "@/assets/svg/tree/fold.vue";
import tools from "@/utils/tools";
const { proxy }: any = getCurrentInstance();
const core_value = ref("");
const route = useRoute();
const target_name = ref("");
const target_node: any = ref();
const treeDropdown = ref();
const loading = ref(false);
interface Tree {
  id: number;
  name: string;
  child_type: Number;
  m?: Number;
  children?: Tree[];
}
const dataSource = ref<Tree[]>([]);
// 使用v-model的props定义
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: "移动到目录",
  },
  action_title: {
    type: String,
    default: "选择",
  },
  placeholder: {
    type: String,
    default: "请选择目标目录",
  },
  excluded_id: {
    type: Number,
    default: -1,
  },
  move_name: {
    type: String,
    default: "",
  },
  type: {
    type: Number,
    default: 0,
  },
});

function is_disable(id: number) {
  if (props.excluded_id === -1) {
    return false;
  }
  return tools.isChild(dataSource.value, props.excluded_id, id);
}

function action() {
  if (!target_node || target_name.value === "") {
    tools.message("请选择目标目录", proxy, "info");
  }
  emit("action", target_node.value);
}
onMounted(() => {
  loading.value = true;
  dataSource.value = [];
  const data = {
    project: route.params.project,
    search_range: "0,1",
    excluded_ids: "",
    type: props.type,
  };
  console.log(data);

  getTree(data).then((data: any) => {
    dataSource.value.push(data[0]);
    loading.value = false;
  });
});
// 使用计算属性实现双向绑定
const dialogVisible = computed({
  get: () => {
    if (props.modelValue) {
      core_value.value = "";
    }
    return props.modelValue;
  },
  set: (value) => emit("update:modelValue", value),
});

// 统一关闭处理方法
const handleClose = () => {
  dialogVisible.value = false;
};
function choice_node(data: any, node: any, event: any, event_object: any) {
  if (is_disable(data.id)) {
    return;
  }
  target_name.value = data.name;
  target_node.value = data;
  treeDropdown.value.handleClose();
}
// 定义emit事件
const emit = defineEmits(["update:modelValue", "action"]);
function changeExpanded(node: any) {
  if (node.expanded) {
    node.collapse();
  } else {
    node.expand();
  }
}
</script>

<style scoped lang="scss">
.tree-content-dropdown {
  max-height: 500px;
  overflow: scroll;
  margin-bottom: 20px;
}
.unselect-row {
  .label-span-method {
    color: var(--primary-dark) !important;
    cursor: not-allowed !important;
  }
}
.process-dialog-footer {
  padding-top: 0px;
  padding-right: 24px;
  padding-left: 24px;
  padding-bottom: 24px;
  .process-dialog-btn {
    -webkit-appearance: button;
    outline: 0;
    white-space: nowrap;
    text-align: center;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
    height: 32px;
    padding: 4px 15px 4px 15px;
    font-size: 14px;
    border-radius: 8px;
  }
  .cancel-btn:hover {
    background-color: #fff;
    border-color: #d0d5dd;
    color: #344054;
  }
  .cancel-btn {
    color: #344054;
    background-color: #fff;
    border-color: #eaecf0;
  }
  .add-btn {
    color: #fff;
    background-color: black;
    border-color: #eaecf0;
  }
  .add-btn:hover {
    background-color: rgb(46, 46, 46);
  }
  .disabled-btn {
    color: rgba(16, 24, 40, 0.24);
    background-color: #f9fafb;
    border-color: #f9fafb;
    cursor: not-allowed;
  }
}

.process-dialog-content {
  padding: 24px;
  font-size: 14px;
  .editor-header {
    height: 2.5rem;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    flex-flow: wrap;
    min-width: 0;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    flex-wrap: nowrap;
    border-bottom: 1px solid #f3f5f6;
  }
}
.del-process {
  padding: 3px;
  color: black;
  width: 12px;
  background-color: #fff;
  height: 12px;
  display: flex;
  align-items: center;
  border-radius: 3px;
  cursor: pointer;
}
.del-process:hover {
  background-color: #f3f3f3;
}
.tree-node {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 100%;
}
.el-tree-node__expand-icon {
  color: var(--global-theme-color);
}
.label-span-method {
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
</style>

<style lang="scss">
.process-dialog {
  .el-dialog__header {
    padding: 0px;
  }
}
.tree-dropdown {
  width: 500px;
}
/* 禁用 el-tree 节点的展开/收起动画 */
.el-tree-node__children {
  transition: none !important;
}

.el-tree-node__expand-icon {
  transition: none !important;
}
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
</style>
