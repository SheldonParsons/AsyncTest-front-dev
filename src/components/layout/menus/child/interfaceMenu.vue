<template>
  <div class="custom-tree-container" style="height: 100%">
    <el-affix :offset="60">
      <div class="tree-search" style="display: flex; align-items: center; margin-bottom: 10px">
        <CButton style="width: 40px; display: inline-block"><el-icon>
            <CirclePlusFilled />
          </el-icon></CButton>
        <el-input v-model="filterText" style="margin-left: 10px" placeholder="Filter keyword" :suffix-icon="Filter" />
      </div>
    </el-affix>
    <div ref="header" class="project-summary g-unselect" @click="enter_project_summary" id="api-project-summery">
      <img style="width: 30px; height: 30px" src="@/assets/logo/bird-main-no-bg-1.png" alt="" />
      <span style="margin-left: 10px">接口概览</span>
    </div>
    <div class="tree-div no-scroll" id="api-tree-div" ref="container" style="overflow: scroll;">
      <el-tree style="margin-top: 10px;" class="api-tree" :key="treeKey" id="api-tree-core" ref="treeRef"
        :data="dataSource" node-key="id" icon="ArrowRightBold" @node-click="changeMenu" :highlight-current="true"
        :expand-on-click-node="false" :default-expanded-keys="firstLevelKeys" icon-class="none"
        :filter-node-method="filterNode">
        <template #default="{ node, data }">
          <div v-if="
            data.child_type === 0 ||
            data.child_type === 1 ||
            data.child_type === 2
          " class="tree-node g-unselect" @mouseenter="current_node = data.id" @mouseleave="current_node = -1">
            <el-icon v-if="data.child_type !== 2" :size="8" color="#606266" :class="node.expanded ? 'private-icon icon-expanded' : 'private-icon'
              " @click.stop="changeExpanded(node)">
              <ArrowRightBold />
            </el-icon>
            <div v-if="data.child_type !== 2" style="
                display: flex;
                justify-content: center;
                align-items: center;
              ">
              <Fold></Fold>
            </div>
            <span v-if="data.child_type === 2" class="method-span" :class="method_color[data.method]">{{
              data.method.toUpperCase() }}</span>
            <div class="label-span-method">
              <div class="g-ellipsis">{{ data.name }}</div>
              <span class="count-span" v-if="data.child_type < 2">({{ data.count }})</span>
            </div>
            <el-popover placement="right" v-if="show_popover" @show="set_awalys_show_popover(data.id)"
              @before-leave="set_leave_popover" :width="320" trigger="click">
              <template #reference>
                <MoreButton v-if="
                  current_node === data.id || awalys_show_popover === data.id
                " class="hover-menu-box" @click.stop></MoreButton>
                <div v-else></div>
              </template>
              <div class="more-action-div" style="width: 100%">
                <div class="action-header">修改信息</div>
                <el-divider></el-divider>
                <div class="change-name">
                  <div style="width: 100%">
                    <el-input :disabled="data.child_type === 0" v-model="data.name"></el-input>
                  </div>
                  <div>
                    <DoneButton style="width: 1rem; height: 1rem" @click="chang_node_name(data)"></DoneButton>
                  </div>
                </div>
                <el-divider></el-divider>
                <div class="action-header" style="margin-top: 5px">
                  更多操作
                </div>
                <el-divider></el-divider>
                <div class="action-list" style="padding-bottom: 5px">
                  <div v-if="data.child_type !== 2" class="action-item"
                    @click="action(1, 'create_interface_under_dir', data)">
                    <div class="action-icon">
                      <InterfaceIcon></InterfaceIcon>
                    </div>
                    <div>添加接口</div>
                  </div>
                  <div v-if="data.child_type !== 2" class="action-item" @click="action(0, 'create_child_dir', data)">
                    <div class="action-icon">
                      <FolderPlusIcon></FolderPlusIcon>
                    </div>
                    <div>添加子目录</div>
                  </div>
                  <div class="action-item" @click="action(2, 'copy_node', data)" v-if="data.child_type !== 0">
                    <div class="action-icon">
                      <CopyIcon></CopyIcon>
                    </div>
                    <div>复制</div>
                  </div>
                  <div class="action-item" @click="action(2, 'move_to', data)" v-if="data.child_type !== 0">
                    <div class="action-icon">
                      <MoveIcon></MoveIcon>
                    </div>
                    <div>移动到</div>
                  </div>
                </div>
                <el-divider></el-divider>
                <div class="action-list" v-if="data.child_type !== 0">
                  <div class="action-item action-delete-item" @click="action(2, 'delete_node', data)">
                    <div class="delete-front-item">
                      <div class="action-icon">
                        <DeleteIcon></DeleteIcon>
                      </div>
                      <div>删除</div>
                    </div>
                    <div class="action-icon delete-icon">
                      <DeleteBackIcon></DeleteBackIcon>
                    </div>
                  </div>
                </div>
              </div>
            </el-popover>
          </div>
        </template>
      </el-tree>
      <!-- <el-row v-else class="url-inputer">
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
      </el-row> -->
    </div>
  </div>
  <SimpleDialog v-model="show_dialog" @action="real_action" :title="dialog_title" :placeholder="dialog_placeholder"
    :action_title="'新建'"></SimpleDialog>
  <TreeDialog v-model="show_tree_dialog" v-if="show_tree_dialog" :excluded_id="excluded_id" :move_name="move_name"
    @action="move_node">
  </TreeDialog>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, getCurrentInstance, nextTick } from "vue";
import tools from "@/utils/tools";
import Fold from "@/assets/svg/tree/fold.vue";
import MoreButton from "@/assets/svg/common/edit_more_btn.vue";
import DoneButton from "@/assets/svg/common/done_btn.vue";
import { ElTree } from "element-plus";
import CButton from "@/components/common/button/CButton.vue";
import { Filter } from "@element-plus/icons-vue";
import { getTree, ApiActionApiTree } from "@/api/program/tree";
import { useRoute, useRouter } from "vue-router";
import CopyIcon from "@/assets/svg/common/copy.vue";
import MoveIcon from "@/assets/svg/common/move.vue";
import FolderPlusIcon from "@/assets/svg/common/fold_plus.vue";
import InterfaceIcon from "@/assets/svg/common/interface.vue";
import DeleteIcon from "@/assets/svg/common/delete.vue";
import DeleteBackIcon from "@/assets/svg/common/delete_back.vue";
import SimpleDialog from "@/views/api/public_dialog/simple_dialog.vue";
import TreeDialog from "@/views/api/public_dialog/tree_select_dialog.vue";
import { GlobalState } from "@/state/index";
const { proxy }: any = getCurrentInstance();
const route = useRoute();
const router = useRouter();
const method_color: any = {
  get: "green",
  post: "orange",
  put: "blue",
  delete: "red",
};
const emit = defineEmits(["changeMenu", "switchRouterAction"]);
const dataSource = ref<Tree[]>([]);
const treeRef: any = ref<InstanceType<typeof ElTree>>();
const filterText = ref("");
const current_node = ref(-1);
const show_popover = ref(true);
const awalys_show_popover = ref(-1);
const loading = ref(true);
const show_dialog = ref(false);
const show_tree_dialog = ref(false);
const dialog_title = ref("");
const dialog_placeholder = ref("");
const current_action_data: any = ref();
const firstLevelKeys: any = ref([]);
const excluded_id: any = ref([]);
const move_name = ref("");
const current_highlight_node = ref(-1);
const container: any = ref(null);
const header: any = ref(null);
const treeKey = ref(0)
onMounted(async () => {
  // 调整一次高度
  await load_tree();
});

async function load_tree(search_range = [0, 1, 2], excluded_ids = []) {
  loading.value = true;
  const data = {
    project: route.params.project,
    search_range: search_range.join(","),
    excluded_ids: excluded_ids.join(","),
  };
  await getTree(data).then(async (newData: any) => {
    const newRoot = newData[0];
    const existingRoot: any = dataSource.value[0];

    if (dataSource.value[0] === undefined) {
      dataSource.value[0] = newRoot;
      // 更新 firstLevelKeys（可选）
      firstLevelKeys.value.push(dataSource.value[0].id)
      // dataSource.value.forEach((rootNode) => {
      //   if (rootNode.children) {
      //     rootNode.children.forEach((child: any) => {
      //       firstLevelKeys.value.push(child.id);
      //     });
      //   }
      // });
    } else {
      // 只同步 children
      existingRoot.count = newRoot.count; // 可选同步计数
      syncChildren(existingRoot.children, newRoot.children);
    }
    await tools.delay();
    loading.value = false;
  });
  await nextTick(); // 确保 DOM 已全部挂载
}

function syncChildren(targetChildren: any[], newChildren: any[]) {
  const targetMap = new Map(targetChildren.map((node: any) => [node.id, node]));
  const newMap = new Map(newChildren.map((node: any) => [node.id, node]));

  // 删除多余的节点
  for (let i = targetChildren.length - 1; i >= 0; i--) {
    const node = targetChildren[i];
    if (!newMap.has(node.id)) {
      targetChildren.splice(i, 1);
    }
  }

  // 插入新增的节点（保持顺序）
  newChildren.forEach((newNode, index) => {
    const existingNode = targetMap.get(newNode.id);
    if (!existingNode) {
      targetChildren.splice(index, 0, newNode);
    } else {
      // 同步 count 如果 child_type 是 0 或 2
      if (newNode.child_type === 0 || newNode.child_type === 1) {
        existingNode.count = newNode.count;
      }
      // 若子节点有 children，递归处理
      if (newNode.children && Array.isArray(newNode.children)) {
        existingNode.children = existingNode.children || [];
        syncChildren(existingNode.children, newNode.children);
      }
    }
  });
}


const props = defineProps({
  apiItem: {
    type: Object,
    default: () => {
      return {};
    },
  },
  activeLinkStyle: {
    type: String,
    default: "0",
  },
});

watch(filterText, (val: any) => {
  treeRef.value!.filter(val);
});
watch(
  () => props.apiItem,
  (val) => {
  }
);
watch(
  () => GlobalState.count,
  async (newCount) => {
    if (
      GlobalState.message === "change_dir_tab" ||
      GlobalState.message === "change_interface_tab"
    ) {
      const node_id: number = GlobalState.data.id;
      await highlightNodeById(node_id);
    } else if (GlobalState.message === "change_empty_tab") {
      await highlightNodeById(undefined);
    } else if (GlobalState.message === "update_interface_name") {
      const node = get_tree_node_by_id(
        dataSource.value[0],
        GlobalState.data.node_id
      );
      if (node) {
        node.name = GlobalState.data.name;
      }
    } else if (GlobalState.message === "update_interface_method") {
      const node = get_tree_node_by_id(
        dataSource.value[0],
        GlobalState.data.node_id
      );
      if (node) {
        node.method = GlobalState.data.method;
      }
    } else if (GlobalState.message === "create_interface_under_root") {
      const root_node = find_root();
      current_action_data.value = {
        type: 1,
        child_action_type: "create_interface_under_dir",
        content: {
          parent_node: root_node.id,
          name: "新建接口",
        },
      };
      const data: any = await send_action(current_action_data.value);
      tools.message("创建成功", proxy, "success");
      await load_tree();
      highlightNodeById(data.id);
      const _data = {
        id: data.id,
        name: data.name,
        method: data.target.method,
        target: data.target.id,
        child_type: data.child_type,
      };
      changeMenu(_data, null, null, null);
    } else if (GlobalState.message === "reload_tree") {
      save_current_hightlight();
      await load_tree();
      highlightNodeById(current_highlight_node.value);
    } else if (GlobalState.message === 'rollback_node_highlight') {
      highlightNodeById(GlobalState.data.id);
    }
  }
);

function find_root() {
  return treeRef.value?.root.data[0];
}

function get_tree_node_by_id(tree: Tree, target_id: number) {
  const stack = [tree];

  while (stack.length > 0) {
    const currentNode: any = stack.pop();

    if (currentNode.id === target_id) {
      return currentNode;
    }

    if (currentNode.children?.length) {
      stack.push(...[...currentNode.children].reverse());
    }
  }

  return false;
}

async function highlightNodeById(id: string | number | undefined) {
  await nextTick(async () => {
    // 强制重新渲染树组件
    treeKey.value += 1

    // 等组件重新渲染后设置高亮
    await nextTick(async () => {
      treeRef.value?.setCurrentKey(id)
      await nextTick(); // 确保 DOM 已全部挂载
    })
  })
}

function save_current_hightlight() {
  const currentNode = treeRef.value?.getCurrentNode();
  current_highlight_node.value = currentNode?.id;
}

async function chang_node_name(data: any) {
  if (data.child_type === 0) {
    tools.message("全局管理节点名称无法修改", proxy, "info");
    return;
  }
  const _data = {
    type: 2,
    child_action_type: "change_name",
    content: {
      node: data.id,
      name: data.name,
    },
  };
  await send_action(_data);
  tools.message("更新成功", proxy, "success");
  GlobalState.sendMessage(
    "change_name_from_tree",
    (data = {
      node_id: data.id,
      name: data.name,
    })
  );
}

async function send_action(data: any) {
  return await ApiActionApiTree(data).then((data: any) => {
    if (result_check(data) === false) return;
    current_node.value = -1;
    awalys_show_popover.value = -1;
    show_popover.value = false;
    setTimeout(() => {
      show_popover.value = true;
    }, 200);
    return data;
  });
}

async function clean_popover() {
  awalys_show_popover.value = -1;
  show_popover.value = false;
  setTimeout(() => {
    show_popover.value = true;
  }, 0);
}

function result_check(data: any) {
  if (data.hasOwnProperty("result") && data.result === 0) {
    tools.message(data.data, proxy, "error");
    return false;
  }
  return true;
}

function set_awalys_show_popover(id: number) {
  awalys_show_popover.value = id;
}

function set_leave_popover() {
  awalys_show_popover.value = -1;
}

async function action(father: number, action_type: string, data: any) {
  clean_popover()
  if (action_type === "create_child_dir") {
    show_dialog.value = true;
    dialog_title.value = "新建子目录";
    dialog_placeholder.value = "请输入子目录名称";
    current_action_data.value = {
      type: father,
      child_action_type: action_type,
      content: {
        parent_node: data.id,
      },
    };
    save_current_hightlight();
  }
  if (action_type === "create_interface_under_dir") {
    show_dialog.value = true;
    dialog_title.value = "新建接口";
    dialog_placeholder.value = "请输入接口名称";
    current_action_data.value = {
      type: father,
      child_action_type: action_type,
      content: {
        parent_node: data.id,
      },
    };
  }
  if (action_type === "copy_node") {
    current_action_data.value = {
      type: father,
      child_action_type: action_type,
      content: {
        node: data.id,
      },
    };
    await send_action(current_action_data.value);
    tools.message("复制成功", proxy, "success");
    save_current_hightlight();
    await load_tree();
    await highlightNodeById(current_highlight_node.value);
  }
  if (action_type === "move_to") {
    current_action_data.value = {
      type: father,
      child_action_type: action_type,
      content: {
        node: data.id,
      },
    };
    show_tree_dialog.value = true;
    excluded_id.value = data.id;
    move_name.value = data.name;
    save_current_hightlight();
  }
  if (action_type === "delete_node") {
    current_action_data.value = {
      type: father,
      child_action_type: action_type,
      content: {
        node: data.id,
      },
    };
    const delete_all_nodes = collectAllIds(data);

    await send_action(current_action_data.value);
    tools.message("删除成功", proxy, "success");
    await load_tree();
    // 如果为接口节点，更新全局缓存接口节点
    if (data.child_type === 2) {
      GlobalState.deleteCacheInterface(delete_all_nodes);
    }
    GlobalState.sendMessage("delete_nodes", { ids: delete_all_nodes });
  }
}

function collectAllIds(treeNode: any) {
  const result: Array<any> = [];

  function traverse(node: any) {
    result.push(node.id);
    if (Array.isArray(node.children)) {
      node.children.forEach(traverse);
    }
  }

  traverse(treeNode);
  return result;
}

async function move_node(data: any) {
  if (data === undefined) {
    tools.message("请正确选择目标节点", proxy, "error");
    return;
  }
  current_action_data.value.content.target_node = data.id;
  await send_action(current_action_data.value);
  tools.message("移动成功", proxy, "success");
  show_tree_dialog.value = false;
  await load_tree();
  highlightNodeById(current_highlight_node.value);
}

async function real_action(name: string) {
  current_action_data.value.content.name = name;
  const data: any = await send_action(current_action_data.value);
  tools.message("创建成功", proxy, "success");
  show_dialog.value = false;
  await load_tree();
  highlightNodeById(data.id);
  const _data = {
    id: data.id,
    name: data.name,
    method: data.target.method,
    target: data.target.id,
    child_type: data.child_type,
  };
  changeMenu(_data, null, null, null);
}

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
  if (data.child_type === 1) {
    send_message_to_tab("click_dir", data, node);
  } else if (data.child_type === 2) {
    send_message_to_tab("click_interface", data, node);
  } else if (data.child_type === 0) {
    send_message_to_tab("click_root_dir", data, node);
  }
}

function send_message_to_tab(type = "", core_data: any, node: any) {
  const data = {
    type: type,
    data: core_data,
    node: node,
  };
  emit("changeMenu", data);
}

function enter_project_summary() {
  tools.message("暂未开放，敬请期待", proxy, "info");
}

function changeExpanded(node: any) {
  let child_count = 0
  if (node.expanded) {
    node.collapse();
    child_count = -1 * node.childNodes.length
    const index = firstLevelKeys.value.indexOf(node.data.id);
    if (index !== -1) {
      firstLevelKeys.value.splice(index, 1);
    }
  } else {
    node.expand();
    child_count = node.childNodes.length
    firstLevelKeys.value.push(node.data.id)
  }
}
</script>

<style lang="scss" scoped>
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
  height: calc(100vh - 283px);
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
