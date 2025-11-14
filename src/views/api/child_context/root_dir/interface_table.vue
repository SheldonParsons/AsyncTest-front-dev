<template>
  <div class="dir-table-container">
    <div class="header normal-type" v-if="multipleSelection.size === 0 && !loading">
      <div class="text" style="display: flex;align-items: center;gap: 5px;">
        {{ dir.name }}（<AnimationButton v-model="tableData.length"></AnimationButton>个接口）
      </div>
      <div class="search-input">
        <el-input v-model="search" style="max-width: 600px" placeholder="名称、请求路径进行搜索" class="input-with-select"
          @input="search_table">
          <template #append>
            <el-button :icon="Search" />
          </template>
        </el-input>
      </div>
    </div>
    <el-skeleton v-if="loading" animated style="
              width: 100%;
              display: flex;
              justify-content: start;
              align-items: center;
              flex-direction: column;
              margin-bottom: 20px;
            ">
      <template #template>
        <div v-for="item in 14" style="
                  width: 100%;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                  margin-top: 20px;
                ">
          <el-skeleton-item variant="h1" style="width: 2%; margin-left: 1%" />
          <el-skeleton-item variant="h1" style="width: 15%; margin-left: 5%" />
          <el-skeleton-item variant="h1" style="width: 15%; margin-left: 5%" />
          <el-skeleton-item variant="h1" style="width: 55%; margin-left: 0%" />
        </div>
      </template>
    </el-skeleton>
    <div class="header select-type" v-if="multipleSelection.size > 0 && !loading">
      <div class="text" style="display: flex;align-items: center;gap: 5px;">
        已选<AnimationButton v-model="multipleSelection.size"></AnimationButton>/
        <AnimationButton v-model="tableData.length"></AnimationButton>项
        <div class="cancel-btn" @click="clean_select">取消选择</div>
      </div>
      <div class="more-action">
        <div class="actions">
          <div class="action-icon" @click="show_delete_comfirm_dialog = true">
            <DeleteIcon></DeleteIcon>
            <div>删除</div>
          </div>
          <div class="action-icon" @click="show_update_status_dialog = true">
            <EditPen></EditPen>
            <div>修改状态</div>
          </div>
          <div class="action-icon" @click="action_tag('add')">
            <Tag></Tag>
            <div>新增标签</div>
          </div>
          <div class="action-icon" @click="action_tag('delete')">
            <TagDelete></TagDelete>
            <div>删除标签</div>
          </div>
          <div class="action-icon" @click="show_update_head_dialog = true">
            <EditUser></EditUser>
            <div>修改责任人</div>
          </div>
          <div class="action-icon" @click="show_tree_dialog = true">
            <Move></Move>
            <div>移动</div>
          </div>
        </div>
        <el-divider direction="vertical" />
        <el-button :icon="CloseBold" @click="clean_select" type="" text></el-button>
      </div>
    </div>
    <div class="table-header" v-if="!loading">
      <div class="header-item header-check">
        <CheckBox :check="galobalCheck" @change="globalCheckChange"></CheckBox>
      </div>
      <div class="header-item header-name">
        <div>接口名称</div>
      </div>
      <div class="header-item header-method">
        <FilterHeader :data="[
          { text: 'GET', value: 'get' },
          { text: 'POST', value: 'post' },
          { text: 'PUT', value: 'put' },
          { text: 'DELETE', value: 'delete' },
        ]" :label="'请求类型'" @reset="reset_field" @action="(target: any) => filter_field(target, 'method')">
        </FilterHeader>
      </div>
      <div class="header-item header-path">
        <div>接口路径</div>
      </div>
      <div class="header-item header-groups">
        <FilterHeader :data="get_groups_filter_list()" :label="'接口分组'" @reset="reset_field"
          @action="(target: any) => filter_field(target, 'groups')"></FilterHeader>
      </div>
      <div class="header-item header-status">
        <FilterHeader :data="get_status_filter_list()" :label="'接口状态'" @reset="reset_field"
          @action="(target: any) => filter_field(target, 'status')"></FilterHeader>
      </div>
      <div class="header-item header-tag">
        <FilterHeader :data="get_tags_filter_list()" :label="'接口标签'" @reset="reset_field" @action="filter_tag">
        </FilterHeader>
      </div>
      <div class="header-item header-head">
        <FilterHeader :data="get_head_filter_list()" :label="'负责人'" @reset="reset_field" @action="filter_head">
        </FilterHeader>
      </div>
    </div>
    <div class="table-content no-scroll">
      <div class="table-row" v-if="tableData.length === 0 && !loading" style="height: 100%;">
        <Empty></Empty>
      </div>
      <div class="table-row" v-for="(item, row_index) in tableData" :key="item.id">
        <div class="row-item header-check" style="justify-content: center;">
          <CheckBox :check="get_row_item_check(item)" @change="(_type: any) => change_singel_check(_type, item)">
          </CheckBox>
        </div>
        <div class="row-item header-name">
          <ScrollText :text="item.name"></ScrollText>
        </div>
        <div class="row-item header-method method" :style="{
          color: typingAttrMapping[item.method]['color'],
        }">{{ item.method.toUpperCase() }}</div>
        <div class="row-item header-path">
          <ScrollText :text="item.path"></ScrollText>
        </div>
        <div class="row-item header-groups">
          <ScrollText :text="item.groups"></ScrollText>
        </div>
        <div class="row-item header-status">
          <div v-for="(status_item, status_index) in get_status(item.status)" :key="status_index"
            style="display: flex;gap: 10px;align-items: center;">
            <Ripple :color="status_item.color"></Ripple>
            <div style="font-size: 0.85rem;">{{ status_item.name }}</div>
          </div>
        </div>
        <div class="row-item header-tag" style="display: flex;flex-direction: column;gap: 3px;">
          <template v-for="tagList in [get_tags(item.markers)]" :key="item.id">
            <div v-if="tagList?.length === 1">
              <div class="default-server-div">{{ tagList[0] }}</div>
            </div>
            <div v-if="tagList.length > 1" style="display: flex; gap: 3px;align-items: center;">
              <div class="default-server-div">{{ tagList[0] }}</div>
              <TooltipAnimation :isOpen="tagDetailNumber === item.id">
                <template #trigger>
                  <div class="default-server-div" @mouseenter="tagDetailNumber = item.id"
                    @mouseleave="tagDetailNumber = -1" style="cursor: pointer;">{{ tagList.length - 1 }}+</div>
                </template>
                <template #default>
                  <div style="display: flex;max-width: 200px;gap: 5px;flex-wrap: wrap;">
                    <div v-for="(tag, tag_index) in tagList" :key="tag_index">
                      <div class="default-server-div-tooltips">{{ tag }}</div>
                    </div>
                  </div>
                </template>
              </TooltipAnimation>

            </div>
          </template>
        </div>
        <div class="row-item header-head">{{ get_head(item.head) }}</div>
      </div>
    </div>
  </div>
  <!--dialog-->
  <el-dialog v-model="show_delete_comfirm_dialog" title="确定要删除这些接口吗？" width="500" class="delete-dialog"
    style="padding: 20px">
    <span>删除接口后您将无法维护它们，接口所绑定的Mock也将失效。</span>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="show_delete_comfirm_dialog = false">取消</el-button>
        <el-button type="primary" @click="delete_interface"> 确认 </el-button>
      </div>
    </template>
  </el-dialog>
  <el-dialog v-model="show_update_status_dialog" title="更新接口状态" width="500" class="delete-dialog" style="padding: 20px">
    <el-select class="doc-base-select" :empty-values="[null, undefined]" :value-on-clear="null" v-model="change_status"
      placeholder="请选择更新为的状态">
      <el-option class="doc-base-option" v-for="item in interface_status_list" :key="item.id" :label="item.name"
        :value="item.id">
        <div class="flex items-center">
          <Ripple :color="item.color"></Ripple>
          <span>{{ item.name }}</span>
        </div>
      </el-option>
      <template #label="row">
        <el-badge is-dot class="item" :color="row.color"></el-badge>
        <span>{{ row.label }}</span>
      </template>
    </el-select>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="show_update_status_dialog = false">取消</el-button>
        <el-button type="primary" @click="update_interface_status">
          更新
        </el-button>
      </div>
    </template>
  </el-dialog>
  <el-dialog v-model="add_tag_dialog" :title="batch_tag_title" width="500" class="delete-dialog" style="padding: 20px">
    <el-select multiple v-model="add_tag_list" placeholder="查找标签" class="regular-mul-select">
      <el-option class="doc-base-option-mul" v-for="item in interface_tag_list" :key="item.id" :label="item.name"
        :value="item.id">
        <div class="flex items-center">
          <span>{{ item.name }}</span>
        </div>
      </el-option>
      <template #header>
        <el-button v-if="!isFooterEnter" text bg size="small" @click="isFooterEnter = !isFooterEnter">
          添加标签
        </el-button>
        <template v-else>
          <el-input v-model="optionFooterName" class="option-input" placeholder="请输入标签名" size="small"
            style="padding-bottom: 10px;" />
          <el-button type="primary" size="small" @click="add_tag">
            添加
          </el-button>
          <el-button size="small" @click="isFooterEnter = !isFooterEnter">取消</el-button>
        </template>
      </template>
    </el-select>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="add_tag_dialog = false">取消</el-button>
        <el-button type="primary" @click="batch_add_tag"> 确定 </el-button>
      </div>
    </template>
  </el-dialog>
  <el-dialog v-model="show_update_head_dialog" title="更新接口负责人" width="500" class="delete-dialog" style="padding: 20px">
    <el-select class="doc-base-select" :empty-values="[null, undefined]" :value-on-clear="null" v-model="change_head"
      placeholder="请选择更新为的负责人">
      <el-option class="doc-base-option" v-for="item in interface_head_list" :key="item.id"
        :label="item.username + '(' + item.nick_name + ')'" :value="item.id">
        <div class="flex items-center">
          <span>{{ item.username + "(" + item.nick_name + ")" }}</span>
        </div>
      </el-option>
      <template #label="row">
        <span>{{ row.label }}</span>
      </template>
    </el-select>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="show_update_head_dialog = false">取消</el-button>
        <el-button type="primary" @click="update_interface_head">
          更新
        </el-button>
      </div>
    </template>
  </el-dialog>
  <TreeDialog v-model="show_tree_dialog" v-if="show_tree_dialog" :move_name="'批量移动'" @action="batch_move_interface">
  </TreeDialog>
</template>

<script lang="ts" setup>
import { ref, onMounted, getCurrentInstance, computed } from "vue";
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import CheckBox from '@/assets/motion/checkbox.vue'
import { useRoute } from "vue-router";
import { GlobalState } from "@/state/index";
import AnimationButton from '@/components/layout/special/animation_btn.vue'
import DeleteIcon from "@/assets/svg/common/delete.vue";
import EditPen from "@/assets/svg/common/new_icon/edit_pen.vue";
import Tag from "@/assets/svg/common/new_icon/tag.vue";
import TagDelete from "@/assets/svg/common/new_icon/tag_delete.vue";
import EditUser from "@/assets/svg/common/new_icon/edit_user.vue";
import Move from "@/assets/svg/common/new_icon/move.vue";
import FilterHeader from "@/views/api/child_component/filter_table_header.vue";
import Empty from "@/views/api/child_component/params_child/comp/empty.vue";
import TreeDialog from "@/views/api/public_dialog/tree_select_dialog.vue";
import ScrollText from '@/components/layout/special/scroll_text.vue'
import Ripple from '@/components/layout/special/ripple.vue'
import {
  ApiGetSummarySource,
  ApiUpdateDir,
  ApiUpdateInterface,
  ApiPostTag,
} from "@/api/interface/index";
import tools from "@/utils/tools";
import GlobalStatus from "@/global";
import _ from "lodash";
import { Search, CloseBold } from "@element-plus/icons-vue";
const props = defineProps({
  target_type: {
    type: Number,
    default: -1,
  },
  dir: {
    type: Object,
    default: null,
  },
  node_id: {
    type: Number,
    default: null,
  },
});
const tableData: any = ref([]);
const route = useRoute();
const { proxy }: any = getCurrentInstance();
const typingAttrMapping: any = GlobalStatus.regular_reqeust_method_info_map();
const interface_status_list: any = ref({});
const interface_head_list: any = ref();
const interface_tag_list: any = ref([]);
const loading = ref(true);
const origin_table: any = ref([]);
const show_delete_comfirm_dialog: any = ref(false);
const show_update_status_dialog: any = ref(false);
const show_update_head_dialog: any = ref(false);
const show_tree_dialog: any = ref(false);
const add_tag_dialog: any = ref(false);
const change_status = ref(null);
const change_head = ref(null);
const add_tag_list = ref([]);
const isFooterEnter = ref(false);
const optionFooterName = ref("");
const current_action_tag_type = ref("add");
const batch_tag_title = ref("");
const multipleSelection: any = ref(new Set());
const search = ref("");
const tagDetailNumber = ref(-1)
onMounted(async () => {
  await load_data();
});


const galobalCheck = computed(() => {
  if (multipleSelection.value.size === tableData.value.length) {
    return 'check'
  } else if (multipleSelection.value.size === 0) {
    return 'none'
  } else {
    return 'part'
  }
})

function get_row_item_check(item: any) {
  if (multipleSelection.value.has(item.id)) {
    return 'check'
  } else {
    return 'none'
  }
}

const globalCheckChange = (type: string) => {
  if (type === 'check') {
    for (let item of tableData.value) {
      multipleSelection.value.add(item.id)
    }
  } else if (type === 'none') {
    clean_select()
  }
}

const change_singel_check = (type: string, item: any) => {
  if (type === 'check') {
    multipleSelection.value.add(item.id)
  } else if (type === 'none') {
    multipleSelection.value.delete(item.id)
  }
}

async function load_data() {
  loading.value = true;
  await get_source();
  const result = await get_interface_list();
  if (result === false) return;
  tools.message("获取接口列表成功", proxy, "success");
  tableData.value = result;
  origin_table.value = _.cloneDeep(result);
  loading.value = false;
}

async function add_tag() {
  const has_marker = interface_tag_list.value.filter((item: any) => {
    return item.name === optionFooterName.value;
  });
  if (has_marker.length > 0) {
    return;
  } else {
    const _data = {
      name: optionFooterName.value,
      project: route.params.project,
      type: 1,
    };
    ApiPostTag(_data).then((res: any) => {
      interface_tag_list.value.unshift({
        id: res.id,
        name: optionFooterName.value,
      });
      tools.message("添加成功", proxy, "success");
    });
  }
}

async function action_tag(type: any) {
  current_action_tag_type.value = type;
  batch_tag_title.value = type === "add" ? "批量添加标签" : "批量移除标签";
  add_tag_dialog.value = true;
}

async function batch_add_tag() {
  let cache_interface_list = [];
  for (let i = 0; i < multipleSelection.value.size; i++) {
    cache_interface_list.push(multipleSelection.value[i].id);
  }
  if (current_action_tag_type.value === "add") {
    const _data = {
      type: 1,
      child_action_type: "batch_add_interface_tag",
      content: {
        interface_ids: cache_interface_list,
        markers: add_tag_list.value,
      },
    };
    ApiUpdateInterface(_data).then((res: any) => {
      const checking = tools.result_check(res, proxy);
      if (checking === true) {
        add_tag_list.value = [];
        add_tag_dialog.value = false;
        tools.message("更新成功", proxy, "success");
        load_data();
      }
    });
  } else {
    const _data = {
      type: 1,
      child_action_type: "batch_delete_interface_tag",
      content: {
        interface_ids: cache_interface_list,
        markers: add_tag_list.value,
      },
    };
    ApiUpdateInterface(_data).then((res: any) => {
      const checking = tools.result_check(res, proxy);
      if (checking === true) {
        add_tag_list.value = [];
        add_tag_dialog.value = false;
        tools.message("更新成功", proxy, "success");
        load_data();
      }
    });
  }
}

async function update_interface_head() {
  let cache_interface_list = [];
  for (let i = 0; i < multipleSelection.value.size; i++) {
    cache_interface_list.push(multipleSelection.value[i].id);
  }
  const _data = {
    type: 1,
    child_action_type: "batch_update_interface_head",
    content: {
      interface_ids: cache_interface_list,
      head: change_head.value,
    },
  };
  ApiUpdateInterface(_data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      show_update_head_dialog.value = false;
      tools.message("更新成功", proxy, "success");
      load_data();
    }
  });
}

async function update_interface_status() {
  let cache_interface_list = [];
  for (let i = 0; i < multipleSelection.value.size; i++) {
    cache_interface_list.push(multipleSelection.value[i].id);
  }
  const _data = {
    type: 1,
    child_action_type: "batch_update_interface_status",
    content: {
      interface_ids: cache_interface_list,
      status: change_status.value,
    },
  };
  ApiUpdateInterface(_data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      show_update_status_dialog.value = false;
      tools.message("更新成功", proxy, "success");
      load_data();
    }
  });
}

async function batch_move_interface(node: any) {
  let cache_interface_list = [];
  for (let i = 0; i < multipleSelection.value.size; i++) {
    cache_interface_list.push(multipleSelection.value[i].id);
  }
  const _data = {
    type: 2,
    child_action_type: "batch_move_interface",
    content: {
      interface_ids: cache_interface_list,
      node: node.id,
    },
  };
  return await ApiUpdateDir(_data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      show_tree_dialog.value = false;
      tools.message("移动成功", proxy, "success");
      load_data();
      GlobalState.sendMessage("reload_tree");
    }
  });
}

async function delete_interface() {
  let cache_interface_list = [];
  for (let i = 0; i < multipleSelection.value.size; i++) {
    cache_interface_list.push(multipleSelection.value[i].id);
  }
  const _data = {
    type: 2,
    child_action_type: "batch_delete_interface",
    content: {
      interface_ids: cache_interface_list,
    },
  };
  return await ApiUpdateDir(_data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      show_delete_comfirm_dialog.value = false;
      tools.message("删除成功", proxy, "success");
      load_data();
      GlobalState.sendMessage("reload_tree");
    }
  });
}

function reset_field(target: any) {
  tableData.value = _.cloneDeep(origin_table.value);
}
function filter_field(target: any, field: string) {
  if (target.length === 0) {
    tableData.value = _.cloneDeep(origin_table.value);
    return;
  }
  tableData.value = origin_table.value.filter((item: any) => {
    if (target.has(item[field])) {
      return item;
    }
  });
}

function filter_tag(target: any, field: string) {
  if (target.length === 0) {
    tableData.value = _.cloneDeep(origin_table.value);
    return;
  }
  tableData.value = origin_table.value.filter((item: any) => {
    for (const element of item.markers) {
      if (target.has(element)) {
        return item; // 找到重合元素，立即返回 true
      }
    }
  });
}

function filter_head(target: any, _: any) {
  if (target.length === 0) {
    tableData.value = _.cloneDeep(origin_table.value);
    return;
  }
  tableData.value = origin_table.value.filter((item: any) => {
    if (target.has(item.head)) {
      return item; // 找到重合元素，立即返回 true
    }
  });
}

function search_table(value: string) {
  tableData.value = origin_table.value.filter((item: any) => {
    return (
      item.name.toLowerCase().includes(value.toLowerCase()) ||
      item.path.toLowerCase().includes(value.toLowerCase())
    );
  });
}

async function get_source() {
  await ApiGetSummarySource({
    project: route.params.project,
  }).then((res: any) => {
    interface_status_list.value = res.markers;
    interface_head_list.value = res.members;
    interface_tag_list.value = res.tag;
  });
}

function get_status(id: number) {
  for (let i = 0; i < interface_status_list.value.length; i++) {
    if (interface_status_list.value[i].id === id) {
      return [interface_status_list.value[i]];
    }
  }
}

function get_head(id: number) {
  for (let i = 0; i < interface_head_list.value.length; i++) {
    if (interface_head_list.value[i].id === id) {
      return `${interface_head_list.value[i].nick_name}(${interface_head_list.value[i].username})`;
    }
  }
}

function get_tags(tag_list: any) {
  let result = [];
  for (let i = 0; i < interface_tag_list.value.length; i++) {
    if (tag_list.includes(interface_tag_list.value[i].id)) {
      result.push(interface_tag_list.value[i].name);
    }
  }
  return result;
}

function get_status_filter_list() {
  const result = interface_status_list.value.map((obj: any) => {
    return {
      text: obj.name,
      value: obj.id,
    };
  });
  console.log(result);
  return result;
}

function get_groups_filter_list() {
  let result_list: any = [];
  let cache_name_list: any = [];
  const result = origin_table.value.map((obj: any) => {
    if (cache_name_list.includes(obj.groups) === false) {
      cache_name_list.push(obj.groups);
      result_list.push({
        text: obj.groups,
        value: obj.groups,
      });
    }
  });
  cache_name_list = undefined;
  return result_list;
}

function get_head_filter_list() {
  let result_list: any = [];
  let cache_name_list: any = [];
  const result = origin_table.value.map((obj: any) => {
    if (cache_name_list.includes(obj.head) === false) {
      cache_name_list.push(obj.head);
      const _head = interface_head_list.value.filter((head_item: any) => head_item.id === obj.head)
      result_list.push({
        text: `${_head[0].nick_name}(${_head[0].username})`,
        value: obj.head,
      });
    }
  });
  cache_name_list = undefined;
  return result_list;
}

function get_tags_filter_list() {
  const result = interface_tag_list.value.map((obj: any) => {
    return {
      text: obj.name,
      value: obj.id,
    };
  });
  console.log(result);
  return result;
}

async function get_interface_list() {
  const _data = {
    type: 0,
    child_action_type: "get_child_interface",
    content: {
      node: props.node_id,
    },
  };
  return await ApiUpdateDir(_data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}


const handleSelectionChange = (val: any) => {
  multipleSelection.value = val;
};

function clean_select() {
  multipleSelection.value = new Set();
}

const filterMethodHandler = (value: string, row: any, column: any) => {
  return row.method === value;
};
</script>

<style scoped lang="scss">
.default-server-div-tooltips {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #3ed0a4;
  background-color: rgba(67, 217, 173, 0.1);
  border: 1px solid rgba(67, 217, 173, 0.2);
  border-radius: 4px;
  transition: all 0.2s ease-in-out;
}

.dir-table-container {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  .method {
    font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
  }

  .header-check {
    flex: 5;
  }

  .header-method {
    flex: 10;
  }

  .header-name {
    flex: 15;
  }

  .header-path {
    flex: 25;
  }

  .header-groups {
    flex: 25;
  }

  .header-status {
    flex: 10;
  }

  .header-tag {
    flex: 15;
  }

  .header-head {
    flex: 15;
  }

  .table-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;

    .table-row {
      display: flex;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: 500;
      border: 1px solid #f0f0f0;
      border-top: 0px;

      .row-item {
        display: flex;
        align-items: center;
        justify-content: start;
        padding: 8px;
        box-sizing: border-box;
        border-right: 1px solid #f0f0f0;
        min-width: 0;
      }
    }
  }

  .default-server-div {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    font-size: 0.75rem;
    font-weight: 500;
    color: #39a988;
    background-color: rgba(67, 217, 173, 0.1);
    border: 1px solid rgba(67, 217, 173, 0.2);
    border-radius: 4px;
    transition: all 0.2s ease-in-out;
  }

  .table-header {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 500;
    border: 1px solid #f0f0f0;
    border-top: 0px;
    background-color: #f0f0f0;

    .header-item {
      padding: 8px;
      border-right: 1px solid #f0f0f0;
    }
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #f0f0f0;
    padding: 8px 10px;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    height: 30px;
    background-color: black;
    color: white;

    .text {
      font-size: 0.9rem;
      font-weight: 500;

      .cancel-btn {
        color: #039e74;
        margin-left: 0.5rem;
        cursor: pointer;
        font-size: 14px;
        padding: 5px;
        border-radius: 4px;
      }

      .cancel-btn:hover {
        background-color: #f0f0f0;
      }
    }

    .more-action {
      display: flex;
      align-items: center;
      justify-content: end;


      .actions {
        display: flex;
        align-items: center;


        .action-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 5px;
          font-size: 14px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 4px;
          color: white;
          cursor: pointer;

          svg {
            width: 15px;
          }
        }

        .action-icon:hover {
          background-color: var(--default-bg);
          color: black;
        }
      }
    }
  }
}
</style>

<style lang="scss">
.regular-mul-select {
  .el-select__wrapper {
    min-height: 32px;
    padding: 4px 12px;
    height: auto;
  }
}

.el-dialog__title {
  font-size: 1rem;
}
</style>
