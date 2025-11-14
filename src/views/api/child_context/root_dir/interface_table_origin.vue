<template>
  <el-row
    style="margin-top: 20px"
    v-if="multipleSelection.length === 0 && !loading"
  >
    <el-col :offset="1" :span="22">
      <div class="header">
        <h3 style="font-weight: 600; margin: 0px; font-size: 14px">
          {{ dir.name }}（{{ tableData.length }} 个接口）
        </h3>
        <div class="table-header-right">
          <div class="mt-4">
            <el-input
              v-model="search"
              style="max-width: 600px"
              placeholder="名称、请求路径进行搜索"
              class="input-with-select"
              @input="search_table"
            >
              <template #append>
                <el-button :icon="Search" />
              </template>
            </el-input>
          </div>
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row style="margin-top: 20px" v-if="multipleSelection.length > 0">
    <el-col :offset="1" :span="22">
      <div class="header-2">
        <div class="table-header-left-2">
          <div style="color: #667085; font-size: 14px">
            已选
            <span style="font-weight: 600; color: #344054">{{
              multipleSelection.length
            }}</span
            >/{{ tableData.length }} 项
          </div>
          <span
            style="
              color: #039e74;
              margin-left: 0.5rem;
              cursor: pointer;
              font-size: 14px;
            "
            @click="clean_select"
            >取消选择</span
          >
        </div>
        <div class="table-header-right-2">
          <div class="right-2-inner-div">
            <div class="right-2-inner-div-div">
              <div
                class="action-icon"
                @click="show_delete_comfirm_dialog = true"
              >
                <DeleteIcon></DeleteIcon>
                <div>删除</div>
              </div>
              <div
                class="action-icon"
                @click="show_update_status_dialog = true"
              >
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
            <el-button
              :icon="CloseBold"
              @click="clean_select"
              type=""
              text
            ></el-button>
          </div>
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row style="margin-bottom: 100px">
    <el-col :offset="1" :span="22">
      <el-table
        border
        ref="multipleTableRef"
        :class="{ 'has-bottom-border': tableData.length === 0 }"
        :data="tableData"
        style="width: 100%"
        row-key="id"
        
        @selection-change="handleSelectionChange"
        :header-cell-style="{ color: 'black', 'font-size': '14px' }"
      >
        <template #empty>
          <el-skeleton
            v-if="loading"
            animated
            style="
              width: 100%;
              display: flex;
              justify-content: start;
              align-items: center;
              flex-direction: column;
              margin-bottom: 20px;
            "
          >
            <template #template>
              <div
                v-for="item in 5"
                style="
                  width: 100%;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                  margin-top: 20px;
                "
              >
                <el-skeleton-item
                  variant="h1"
                  style="width: 2%; margin-left: 1%"
                />
                <el-skeleton-item
                  variant="h1"
                  style="width: 15%; margin-left: 5%"
                />
                <el-skeleton-item
                  variant="h1"
                  style="width: 15%; margin-left: 5%"
                />
                <el-skeleton-item
                  variant="h1"
                  style="width: 45%; margin-left: 5%"
                />
              </div>
            </template>
          </el-skeleton>
          <div v-else>
            <Empty></Empty>
          </div>
        </template>
        <el-table-column type="selection" width="55" />
        <el-table-column label="接口名称">
          <template #default="scope">{{ scope.row.name }}</template>
        </el-table-column>
        <el-table-column v-if="!loading" width="120" label="请求类型">
          <template #header="{ column, index }">
            <FilterHeader
              :data="[
                { text: 'GET', value: 'get' },
                { text: 'POST', value: 'post' },
                { text: 'PUT', value: 'put' },
                { text: 'DELETE', value: 'delete' },
              ]"
              :column="column"
              @reset="reset_field"
              @action="(target:any) => filter_field(target,'method')"
            ></FilterHeader>
          </template>
          <template #default="scope"
            ><span
              :style="{
                color: typingAttrMapping[scope.row.method]['color'],
              }"
              class="typing-span"
              style="cursor: default"
              >{{ scope.row.method.toUpperCase() }}</span
            ></template
          >
        </el-table-column>
        <el-table-column label="接口路径">
          <template #default="scope"
            ><div>
              <div class="g-ellipsis">{{ scope.row.path }}</div>
            </div></template
          >
        </el-table-column>
        <el-table-column label="接口分组" width="200">
          <template #header="{ column, index }">
            <FilterHeader
              :data="get_groups_filter_list()"
              :column="column"
              @reset="reset_field"
              @action="(target:any) => filter_field(target,'groups')"
            ></FilterHeader>
          </template>
          <template #default="scope">
            <div class="g-ellipsis">
              <span>{{ scope.row.groups }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column v-if="!loading" label="接口状态" width="120">
          <template #header="{ column, index }">
            <FilterHeader
              :data="get_status_filter_list()"
              :column="column"
              @reset="reset_field"
              @action="(target:any) => filter_field(target,'status')"
            ></FilterHeader>
          </template>
          <template #default="scope">
            <div>
              <div
                style="
                  display: flex;
                  justify-content: start;
                  align-items: center;
                  gap: 5px;
                "
                v-for="(item, index) in get_status(scope.row.status)"
                :key="index"
              >
                <el-badge
                  is-dot
                  class="item"
                  style="display: flex; align-items: center"
                  :color="item.color"
                ></el-badge>
                <div>{{ item.name }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="标签">
          <template #header="{ column, index }">
            <FilterHeader
              :data="get_tags_filter_list()"
              :column="column"
              @reset="reset_field"
              @action="filter_tag"
            ></FilterHeader>
          </template>
          <template #default="scope">
            <div>
              <div class="table-tag">
                <div
                  v-for="(item, marker_index) in get_tags(scope.row.markers)"
                  :key="marker_index"
                >
                  <div class="default-server-div">{{ item }}</div>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="责任人" width="150">
          <template #default="scope"
            ><div class="g-ellipsis">
              {{ get_head(scope.row.head) }}
            </div></template
          >
        </el-table-column>
      </el-table>
    </el-col>
  </el-row>
  <el-dialog
    v-model="show_delete_comfirm_dialog"
    title="确定要删除这些接口吗？"
    width="500"
    class="delete-dialog"
    style="padding: 20px"
  >
    <span>删除接口后您将无法维护它们，接口所绑定的Mock也将失效。</span>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="show_delete_comfirm_dialog = false">取消</el-button>
        <el-button type="primary" @click="delete_interface"> 确认 </el-button>
      </div>
    </template>
  </el-dialog>
  <el-dialog
    v-model="show_update_status_dialog"
    title="更新接口状态"
    width="500"
    class="delete-dialog"
    style="padding: 20px"
  >
    <el-select
      class="doc-base-select"
      :empty-values="[null, undefined]"
      :value-on-clear="null"
      v-model="change_status"
      placeholder="请选择更新为的状态"
    >
      <el-option
        class="doc-base-option"
        v-for="item in interface_status_list"
        :key="item.id"
        :label="item.name"
        :value="item.id"
      >
        <div class="flex items-center">
          <el-badge is-dot class="item" :color="item.color"></el-badge>
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
  <el-dialog
    v-model="add_tag_dialog"
    :title="batch_tag_title"
    width="500"
    class="delete-dialog"
    style="padding: 20px"
  >
    <el-select
      multiple
      v-model="add_tag_list"
      placeholder="查找标签"
      class="regular-mul-select"
    >
      <el-option
        class="doc-base-option-mul"
        v-for="item in interface_tag_list"
        :key="item.id"
        :label="item.name"
        :value="item.id"
      >
        <div class="flex items-center">
          <span>{{ item.name }}</span>
        </div>
      </el-option>
      <template #header>
        <el-button
          v-if="!isFooterEnter"
          text
          bg
          size="small"
          @click="isFooterEnter = !isFooterEnter"
        >
          添加标签
        </el-button>
        <template v-else>
          <el-input
            v-model="optionFooterName"
            class="option-input"
            placeholder="请输入标签名"
            size="small"
          />
          <el-button type="primary" size="small" @click="add_tag">
            添加
          </el-button>
          <el-button size="small" @click="isFooterEnter = !isFooterEnter"
            >取消</el-button
          >
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
  <el-dialog
    v-model="show_update_head_dialog"
    title="更新接口负责人"
    width="500"
    class="delete-dialog"
    style="padding: 20px"
  >
    <el-select
      class="doc-base-select"
      :empty-values="[null, undefined]"
      :value-on-clear="null"
      v-model="change_head"
      placeholder="请选择更新为的负责人"
    >
      <el-option
        class="doc-base-option"
        v-for="item in interface_head_list"
        :key="item.id"
        :label="item.username + '(' + item.nick_name + ')'"
        :value="item.id"
      >
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
  <TreeDialog
    v-model="show_tree_dialog"
    v-if="show_tree_dialog"
    :move_name="'批量移动'"
    @action="batch_move_interface"
  >
  </TreeDialog>
</template>

<script lang="ts" setup>
import { ref, onMounted, getCurrentInstance } from "vue";
import { useRoute } from "vue-router";
import { GlobalState } from "@/state/index";
import DeleteIcon from "@/assets/svg/common/delete.vue";
import EditPen from "@/assets/svg/common/new_icon/edit_pen.vue";
import Tag from "@/assets/svg/common/new_icon/tag.vue";
import TagDelete from "@/assets/svg/common/new_icon/tag_delete.vue";
import EditUser from "@/assets/svg/common/new_icon/edit_user.vue";
import Move from "@/assets/svg/common/new_icon/move.vue";
import FilterHeader from "@/views/api/child_component/filter_table_header.vue";
import Empty from "@/views/api/child_component/params_child/comp/empty.vue";
import TreeDialog from "@/views/api/public_dialog/tree_select_dialog.vue";
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
const interface_status_list: any = ref();
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
onMounted(async () => {
  await load_data();
});

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
  for (let i = 0; i < multipleSelection.value.length; i++) {
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
  for (let i = 0; i < multipleSelection.value.length; i++) {
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
  for (let i = 0; i < multipleSelection.value.length; i++) {
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
  for (let i = 0; i < multipleSelection.value.length; i++) {
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
  for (let i = 0; i < multipleSelection.value.length; i++) {
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

function reset_field(target: Array<String>) {
  tableData.value = _.cloneDeep(origin_table.value);
}
function filter_field(target: Array<String>, field: string) {
  if (target.length === 0) {
    tableData.value = _.cloneDeep(origin_table.value);
    return;
  }
  tableData.value = origin_table.value.filter((item: any) => {
    if (target.includes(item[field])) {
      return item;
    }
  });
}

function filter_tag(target: Array<any>, field: string) {
  if (target.length === 0) {
    tableData.value = _.cloneDeep(origin_table.value);
    return;
  }
  tableData.value = origin_table.value.filter((item: any) => {
    const hasIntersection = target.some((target_item: any) => {
      return item.markers.includes(target_item);
    });
    if (hasIntersection) return item;
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
    console.log(res);
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

const multipleTableRef = ref<any>();
const multipleSelection = ref<any[]>([]);
const search = ref("");
const handleSelectionChange = (val: any) => {
  multipleSelection.value = val;
};

function clean_select() {
  multipleSelection.value = [];
  multipleTableRef.value!.clearSelection();
}

const filterMethodHandler = (value: string, row: any, column: any) => {
  return row.method === value;
};
</script>

<style scoped lang="scss">
.items-center {
  gap: 5px;
  display: flex;
  justify-content: start;
}
.table-tag {
  display: flex;
  align-items: center;
  justify-content: start;
  flex-wrap: wrap;
  gap: 5px;
}
.action-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 8px;
  color: var(--default-font-color);
  cursor: pointer;
  svg {
    width: 15px;
  }
}
.action-icon:hover {
  background-color: var(--default-bg);
  color: black;
}
.has-bottom-border {
  border-bottom: 1px solid var(--border-color-light);
}
.default-server-div {
  font-size: 12px;
  background-color: var(--default-bg);
  border-radius: 5px;
  padding: 0px 5px;
  color: var(--global-theme-color);
}
.typing-span {
  cursor: pointer;
  display: flex;
  justify-self: start;
  align-items: center;
  height: 20px;
  font-size: 12px;
  font-weight: 500;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f2f4f7;
  border-right: 1px solid #f2f4f7;
  border-left: 1px solid #f2f4f7;
  border-radius: 10px 10px 0 0;
  height: 48px;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}
.table-header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.header-2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f2f4f7;
  border-right: 1px solid #f2f4f7;
  border-left: 1px solid #f2f4f7;
  border-radius: 10px 10px 0 0;
  height: 48px;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}
.table-header-right-2 {
  min-width: 0px;
  display: flex;
  padding-left: 0.5rem;
  flex: 1;
  justify-content: flex-end;
  align-items: center;
  .right-2-inner-div {
    flex: 1;
    color: #344054;
    font-size: 14px;
    font-variant: tabular-nums;
    line-height: 1.57143;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    .right-2-inner-div-div {
      min-width: min-content;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      button {
        margin-left: 0px !important;
        padding: 8px !important;
      }
    }
  }
}
.table-header-left-2 {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.option-input {
  width: 100%;
  margin-bottom: 8px;
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
</style>
