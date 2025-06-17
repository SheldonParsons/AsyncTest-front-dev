<template>
  <el-dialog
    v-model="dialogVisible"
    :show-close="false"
    width="80%"
    style="border-radius: 12px; margin-top: 40px"
    class="env-dialog"
    ref="env_dialog"
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
            >环境设置</span
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
    <div class="setting-outside">
      <div class="setting-main-content">
        <div class="setting-main-content-left">
          <div class="setting-main-content-left-title">环境</div>
          <div class="setting-main-content-left-env-list">
            <div
              v-for="(data, index) in env_list"
              class="setting-main-content-left-env-list-item"
              :class="{ 'focus-item': focus_node === data.id }"
              @mouseenter="current_node = data.id"
              @mouseleave="current_node = -1"
              @click="get_env(data)"
            >
              <div class="env-name"><EnvBtn />{{ data.name }}</div>
              <div>
                <el-popover
                  placement="right"
                  v-if="show_popover"
                  @show="set_awalys_show_popover(data.id)"
                  @before-leave="awalys_show_popover = -1"
                  :width="320"
                  trigger="click"
                >
                  <template #reference>
                    <MoreButton
                      v-if="
                        current_node === data.id ||
                        awalys_show_popover === data.id
                      "
                      class="hover-menu-box"
                    ></MoreButton>
                    <div v-else></div>
                  </template>
                  <div class="more-action-div" style="width: 100%">
                    <div class="action-header">修改信息</div>
                    <el-divider></el-divider>
                    <div class="change-name">
                      <div style="width: 100%">
                        <el-input v-model="data.name"></el-input>
                      </div>
                      <div>
                        <DoneButton
                          style="width: 1rem; height: 1rem"
                          @click="chang_node_name(data)"
                        ></DoneButton>
                      </div>
                    </div>
                    <el-divider></el-divider>
                    <div class="action-header" style="margin-top: 5px">
                      更多操作
                    </div>
                    <!-- <el-divider></el-divider>
                    <div class="action-list" style="padding-bottom: 5px">
                      <div
                        class="action-item"
                        @click="action('copy_foler', data)"
                      >
                        <div class="action-icon"><CopyIcon></CopyIcon></div>
                        <div>复制</div>
                      </div>
                    </div> -->
                    <el-divider></el-divider>
                    <div class="action-list" @click="delete_env(data)">
                      <div class="action-item action-delete-item">
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
            </div>
          </div>
          <el-divider></el-divider>

          <div class="setting-main-content-left-env-list-new">
            <div
              @click="visit_add_env_dialog"
              class="setting-main-content-left-env-list-item"
              style="margin-top: 10px"
            >
              <div class="env-name"><Plus />新建环境</div>
            </div>
          </div>
          <el-divider></el-divider>
          <div class="setting-main-content-left-title">接口临时变量</div>
          <div class="setting-main-content-left-env-list">
            <TreeNode @change_menu="get_temp"></TreeNode>
          </div>
        </div>
        <div
          v-if="content_type === 'server'"
          class="setting-main-content-right"
        >
          <div
            style="
              padding: 10px;
              font-size: 14px;
              font-weight: 500;
              color: black;
            "
          >
            服务列表
          </div>
          <el-divider></el-divider>
          <div style="padding: 10px">
            <div class="body-tools">
              <div class="title">服务前缀管理（推荐：协议+域名）</div>
              <div class="tools">
                <div @click="add_server">+新增服务</div>
              </div>
            </div>
            <div class="private-table-outside">
              <el-table
                v-if="loading === false"
                v-model:data="server_table"
                style="width: 100%"
                row-key="key"
                default-expand-all
                class="main-table"
              >
                <template #empty>
                  <div v-if="loading">
                    <Loading></Loading>
                  </div>
                  <SpecialButton v-else @click="add_server"
                    >点击添加您的数据</SpecialButton
                  >
                </template>
                <el-table-column label="服务名" min-width="30%">
                  <template #default="scope">
                    <div
                      class="g-ellipsis"
                      v-show="scope.row.key !== current_server?.key"
                      style="font-size: 14px; font-weight: 500;display: flex;align-items: center;gap: 5px;"
                    >
                      <div class="g-ellipsis">{{ scope.row.name }}</div> <span v-if="scope.row.is_default" class="default-server-div">默认服务</span>
                    </div>
                    <el-input
                      v-show="scope.row.key === current_server?.key"
                      v-model="scope.row.name"
                    ></el-input>
                  </template>
                </el-table-column>
                <el-table-column label="URL前缀">
                  <template #default="scope">
                    <div
                      class="path-div g-ellipsis"
                      style="font-size: 14px; font-weight: 500"
                      v-show="scope.row.key !== current_server?.key"
                    >
                      <span>{{ scope.row.prefix }}</span>
                    </div>
                    <div
                      v-show="scope.row.key === current_server?.key"
                      class="core-value"
                    >
                      <div style="width: 100%">
                        <CodeMirror
                          :canVar="false"
                          v-model="scope.row.prefix"
                          :enableNewLine="false"
                        ></CodeMirror>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="操作" min-width="15%">
                  <template #default="scope">
                    <EditButton
                      style="width: 1.5rem; height: 1.5rem"
                      v-show="scope.row.key !== current_server?.key"
                      @click="edit_server(scope.row, scope.$index)"
                    ></EditButton>
                    <div
                      v-show="scope.row.key === current_server?.key"
                      style="
                        display: flex;
                        align-items: center;
                        justify-content: start;
                        gap: 4px;
                      "
                    >
                      <DoneButton @click="save_server(scope.row)"></DoneButton>
                      <DeleteButton
                        @click="delete_server(scope.row)"
                      ></DeleteButton>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
              <el-row v-else>
                <el-col :span="24">
                  <el-skeleton animated>
                    <template #template>
                      <el-skeleton-item
                        v-for="_ in 4"
                        variant="h1"
                        style="width: 100%; height: 30px; margin-top: 10px"
                      />
                    </template>
                  </el-skeleton>
                </el-col>
              </el-row>
            </div>
          </div>
          <div
            style="
              padding: 10px;
              font-size: 14px;
              font-weight: 500;
              color: black;
            "
          >
            环境变量列表
          </div>
          <el-divider></el-divider>
          <div style="padding: 10px">
            <div class="body-tools">
              <div class="title">当前项目环境变量</div>
              <div class="tools">
                <div @click="open_add_env_variable_dialog">+新增变量</div>
              </div>
            </div>
            <div class="private-table-outside">
              <el-table
                v-if="loading === false"
                v-model:data="env_variable_table"
                style="width: 100%"
                row-key="id"
                default-expand-all
                class="main-table"
              >
                <template #empty>
                  <SpecialButton @click="open_add_env_variable_dialog"
                    >点击添加您的数据</SpecialButton
                  >
                </template>
                <el-table-column label="变量名" min-width="30%">
                  <template #default="scope">
                    <div
                      class="g-ellipsis"
                      v-show="scope.row.key !== current_variable?.key"
                      style="font-size: 14px; font-weight: 500"
                    >
                      {{ scope.row.name }}
                    </div>
                    <el-input
                      v-show="scope.row.key === current_variable?.key"
                      v-model="scope.row.name"
                    ></el-input>
                  </template>
                </el-table-column>
                <el-table-column label="变量值">
                  <template #default="scope">
                    <div
                      class="path-div g-ellipsis"
                      style="font-size: 14px; font-weight: 500"
                      v-show="scope.row.key !== current_variable?.key"
                    >
                      <span>{{ scope.row.value }}</span>
                    </div>
                    <div
                      v-show="scope.row.key === current_variable?.key"
                      class="core-value"
                    >
                      <div style="width: 100%">
                        <CodeMirror
                          :canVar="false"
                          v-model="scope.row.value"
                          :enableNewLine="false"
                        ></CodeMirror>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="描述">
                  <template #default="scope">
                    <div
                      class="path-div g-ellipsis"
                      style="font-size: 14px; font-weight: 500"
                      v-show="scope.row.key !== current_variable?.key"
                    >
                      <span>{{ scope.row.statement }}</span>
                    </div>
                    <div
                      v-show="scope.row.key === current_variable?.key"
                      class="core-value"
                    >
                      <div style="width: 100%">
                        <CodeMirror
                          :disableVar="true"
                          v-model="scope.row.statement"
                          :enableNewLine="false"
                        ></CodeMirror>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="操作" min-width="20%">
                  <template #default="scope">
                    <EditButton
                      style="width: 1.5rem; height: 1.5rem"
                      v-show="scope.row.key !== current_variable?.key"
                      @click="edit_env_variable(scope.row, scope.$index)"
                    ></EditButton>
                    <div
                      v-show="scope.row.key === current_variable?.key"
                      style="
                        display: flex;
                        align-items: center;
                        justify-content: start;
                        gap: 4px;
                      "
                    >
                      <DoneButton
                        @click="save_env_variable(scope.row)"
                      ></DoneButton>
                      <DeleteButton
                        @click="delete_env_variable(scope.row)"
                      ></DeleteButton>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
              <el-row v-else="loading">
                <el-col :span="24">
                  <el-skeleton animated>
                    <template #template>
                      <el-skeleton-item
                        v-for="_ in 4"
                        variant="h1"
                        style="width: 100%; height: 30px; margin-top: 10px"
                      />
                    </template>
                  </el-skeleton>
                </el-col>
              </el-row>
            </div>
          </div>
        </div>
        <div v-if="content_type === 'temp'" class="setting-main-content-right">
          <div
            style="
              padding: 10px;
              font-size: 14px;
              font-weight: 500;
              color: black;
            "
          >
            临时变量列表
          </div>
          <el-divider></el-divider>
          <div style="padding: 10px">
            <div class="body-tools">
              <div class="title">
                接口临时变量管理
                <el-tooltip placement="right" effect="customized">
                  <template #content>
                    <div
                      style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: start;
                      "
                    >
                      <div
                        style="
                          padding-top: 5px;
                          padding-bottom: 5px;
                          width: 100%;
                          border-bottom: 1px solid var(--border-color);
                        "
                      >
                        临时变量的使用和规则
                      </div>
                      <div
                        style="
                          padding-top: 5px;
                          padding-bottom: 5px;
                          width: 100%;
                        "
                      >
                        1.
                        临时变量的优先级非常高，但请放心，它仅会在您运行接口时才会生效，用例中它将被隔离。
                      </div>
                      <div
                        style="
                          padding-top: 5px;
                          padding-bottom: 5px;
                          width: 100%;
                        "
                      >
                        2.
                        您可以通过接口的后置操作中设置全局变量、环境变量、临时变量来覆盖该变量的动态值。
                      </div>
                      <div
                        style="
                          padding-top: 5px;
                          padding-bottom: 5px;
                          width: 100%;
                        "
                      >
                        3.
                        使用建议：和普通变量的同名策略，通过它的强制优先级来帮助您调试接口，运行用例时通过自动隔离来调用您的普通变量。
                      </div>
                    </div>
                  </template>
                  <el-icon style="cursor: pointer"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="tools">
                <div @click="add_temp">+新增变量</div>
              </div>
            </div>
            <div class="private-table-outside">
              <el-table
                v-if="loading === false"
                v-model:data="temp_variable_table"
                style="width: 100%"
                row-key="key"
                default-expand-all
                class="main-table"
              >
                <template #empty>
                  <div v-if="loading">
                    <Loading></Loading>
                  </div>
                  <SpecialButton v-else @click="add_temp"
                    >点击添加您的数据</SpecialButton
                  >
                </template>
                <el-table-column label="变量名" min-width="30%">
                  <template #default="scope">
                    <div
                      class="g-ellipsis"
                      v-show="scope.row.id !== current_temp?.id"
                      style="font-size: 14px; font-weight: 500"
                    >
                      {{ scope.row.name }}
                    </div>
                    <el-input
                      v-show="scope.row.id === current_temp?.id"
                      v-model="scope.row.name"
                      placeholder="变量名"
                    ></el-input>
                  </template>
                </el-table-column>
                <el-table-column label="固定值" min-width="30%">
                  <template #default="scope">
                    <div
                      class="path-div g-ellipsis"
                      style="font-size: 14px; font-weight: 500"
                      v-show="scope.row.id !== current_temp?.id"
                    >
                      <span>{{ scope.row.fixed_value }}</span>
                    </div>
                    <div
                      v-show="scope.row.id === current_temp?.id"
                      class="core-value"
                    >
                      <div style="width: 100%">
                        <CodeMirror
                          :canVar="false"
                          v-model="scope.row.fixed_value"
                          :enableNewLine="false"
                        ></CodeMirror>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="动态值(自动填充)" min-width="30%">
                  <template #default="scope">
                    <div
                      class="path-div g-ellipsis"
                      style="font-size: 14px; font-weight: 500"
                      v-show="scope.row.id !== current_temp?.id"
                    >
                      <span>{{ scope.row.dynamic_value }}</span>
                    </div>
                    <div
                      v-show="scope.row.id === current_temp?.id"
                      class="core-value"
                    >
                      <div style="width: 100%">
                        <CodeMirror
                          :disableVar="true"
                          :disable="true"
                          v-model="scope.row.dynamic_value"
                          :enableNewLine="false"
                        ></CodeMirror>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="启用固定" min-width="15%">
                  <template #default="scope">
                    <div
                      class="g-ellipsis"
                      style="font-size: 14px; font-weight: 500"
                    >
                      <el-switch
                        v-model="scope.row.is_fixed"
                        @change="change_temp_is_fixed(scope.row)"
                        inline-prompt
                        active-text="固定值"
                        inactive-text="动态值"
                      />
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="操作" min-width="15%">
                  <template #default="scope">
                    <EditButton
                      style="width: 1.5rem; height: 1.5rem"
                      v-show="scope.row.id !== current_temp?.id"
                      @click="edit_temp(scope.row, scope.$index)"
                    ></EditButton>
                    <div
                      v-show="scope.row.id === current_temp?.id"
                      style="
                        display: flex;
                        align-items: center;
                        justify-content: start;
                        gap: 4px;
                      "
                    >
                      <DoneButton @click="save_temp(scope.row)"></DoneButton>
                      <DeleteButton
                        @click="delete_temp(scope.row)"
                      ></DeleteButton>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
              <el-row v-else>
                <el-col :span="24">
                  <el-skeleton animated>
                    <template #template>
                      <el-skeleton-item
                        v-for="_ in 4"
                        variant="h1"
                        style="width: 100%; height: 30px; margin-top: 10px"
                      />
                    </template>
                  </el-skeleton>
                </el-col>
              </el-row>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="process-dialog-footer">
        <button class="process-dialog-btn cancel-btn" @click="handleClose">
          <span>取消</span>
        </button>
      </div>
    </template>
  </el-dialog>
  <SimpleDialog
    v-model="show_add_env_dialog"
    @action="add_env"
    :title="'新建环境'"
    :placeholder="'请输出环境名'"
    :action_title="'新建'"
  ></SimpleDialog>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance, computed, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import EnvBtn from "@/assets/svg/common/env_btn.vue";
import Plus from "@/assets/svg/common/plus.vue";
import MoreButton from "@/assets/svg/common/edit_more_btn.vue";
import DeleteIcon from "@/assets/svg/common/delete.vue";
import DeleteBackIcon from "@/assets/svg/common/delete_back.vue";
import DoneButton from "@/assets/svg/common/done_btn.vue";
import SimpleDialog from "@/views/api/public_dialog/simple_dialog.vue";
import EditButton from "@/assets/svg/common/edit_btn.vue";
import DeleteButton from "@/assets/svg/common/delete_btn.vue";
import SpecialButton from "@/components/common/button/special_button.vue";
import CodeMirror from "@/views/api/child_context/code_mirror.vue";
import Loading from "@/views/api/child_component/params_child/comp/loading.vue";
import tools from "@/utils/tools";
import TreeNode from "@/views/api/child_component/tree_content.vue";
import { ApiGetProjectServerParameters, ApiPostEnv } from "@/api/interface/env";
import {
  ApiGetTempVariable,
  ApiPostTempVariable,
  ApiUpdateTempVariable,
  ApiDeleteTempVariable,
} from "@/api/interface/index";
import { GlobalState } from "@/state";
const content_type = ref("server");
const { proxy }: any = getCurrentInstance();
const route = useRoute();
const show_popover = ref(true);
const current_node = ref(-1);
const focus_node = ref(1);
const awalys_show_popover: any = ref(-1);
const show_add_env_dialog = ref(false);
const loading = ref(false);
const current_server: any = ref(null);
const current_temp: any = ref(null);
const current_variable: any = ref(null);
const current_env_variable_index = ref(-1);
const origin_server_name = ref("");
const origin_server_prefix = ref("");
const origin_env_variable_name = ref("");
const origin_env_variable_value = ref("");
const origin_env_variable_statement = ref("");
const origin_temp_variable: any = ref(null);
const env_list: any = ref([]);
const server_table: any = ref([]);
const current_server_type = ref("add");
const current_variable_type = ref("add");
const current_temp_variable_type = ref("add");
const env_variable_table: any = ref([]);
const env_dialog: any = ref(null);
const current_interface: any = ref(-1);
const temp_variable_table: any = ref([]);

onMounted(async () => {
  const window_height = window.innerHeight;
  await nextTick();
  await nextTick();
  if (env_dialog.value) {
    const dialog: any = document.getElementsByClassName("env-dialog")[0];
    dialog.style.height = window_height * 0.85 + "px";
    const content: any = document.getElementsByClassName(
      "setting-main-content"
    )[0];
    content.style.height = window_height * 0.85 - 60 - 70 + "px";
  }
  await get_envs();
});

// watch(loading, (new_value) => {
//   if (new_value === true) {
//     tools.message("加载环境数据中...", proxy, "info");
//   } else {
//     tools.message("加载完成", proxy, "success");
//   }
// });

async function get_envs() {
  loading.value = true;
  content_type.value = "server";
  const data = {
    simple: 1,
    get_first_detail: 1,
    project: route.params.project,
  };
  ApiGetProjectServerParameters(data).then((res: any) => {
    console.log(res);
    loading.value = false;
    env_list.value = res;
    focus_node.value = res[0].id;
    server_table.value = res[0].info.server_mappings;
    env_variable_table.value = res[0].info.env_variables_mappings;
  });
}

function get_temp(tree_node: any) {
  reset_current_temp();
  focus_node.value = -1;
  content_type.value = "temp";
  current_interface.value = tree_node.target;
  const _data = {
    interface: tree_node.target,
  };
  send_temp_variable_list(_data).then((res: any) => {
    if (res === false) return;
    temp_variable_table.value = res;
  });
}

async function change_temp_is_fixed(row: any) {
  const _data = {
    name: row.name,
    fixed_value: row.fixed_value,
    is_fixed: row.is_fixed,
  };
  const res = await send_temp_variable_update(row.id, _data);
  if (res === false) return;
  if (row.is_fixed === true) {
    tools.message("已启用", proxy, "success");
  } else {
    tools.message("已禁用", proxy, "success");
  }
}

async function delete_temp(row: any) {
  if (current_temp_variable_type.value === "add") {
    temp_variable_table.value.splice(temp_variable_table.value.length - 1, 1);
    reset_current_temp();
    return;
  }
  const result = await send_temp_variable_delete(row.id);
  if (result === false) return;
  temp_variable_table.value = temp_variable_table.value.filter(
    (item: any) => item.id !== row.id
  );
  reset_current_temp();
  tools.message("删除成功", proxy, "success");
}

async function save_temp(row: any) {
  if (current_temp_variable_type.value === "add") {
    const _data = {
      name: row.name,
      fixed_value: row.fixed_value,
      is_fixed: row.is_fixed,
      interface: current_interface.value,
    };
    const res = await send_temp_variable_add(_data);
    if (res === false) return;
    temp_variable_table.value[temp_variable_table.value.length - 1].id = res.id;
    tools.message("添加成功", proxy, "success");
  } else {
    if (
      origin_temp_variable.value.name === row.name &&
      origin_temp_variable.value.fixed_value === row.fixed_value &&
      origin_temp_variable.value.is_fixed === row.is_fixed
    ) {
      reset_current_temp();
      return;
    }
    const _data = {
      name: row.name,
      fixed_value: row.fixed_value,
      is_fixed: row.is_fixed,
    };
    const res = await send_temp_variable_update(row.id, _data);
    if (res === false) return;
    tools.message("修改成功", proxy, "success");
  }
  reset_current_temp();
}
async function edit_temp(row: any, index: number) {
  if (current_temp.value !== null) {
    tools.message("请先保存当前编辑中的变量", proxy);
    return;
  }
  current_temp_variable_type.value = "edit";
  current_temp.value = row;
  origin_temp_variable.value = JSON.parse(JSON.stringify(row));
}

function add_temp() {
  if (current_temp.value !== null) {
    tools.message("请先保存当前编辑中的变量", proxy);
    return;
  }
  current_temp_variable_type.value = "add";
  const _data = {
    name: "",
    fixed_value: "",
    dynamic_value: "",
    is_fixed: false,
    interface: current_interface.value,
  };
  current_temp.value = _data;
  temp_variable_table.value.push(_data);
}

async function send_temp_variable_delete(id: number) {
  return await ApiDeleteTempVariable(id).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

async function send_temp_variable_list(data: any) {
  return await ApiGetTempVariable(data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

async function send_temp_variable_add(data: any) {
  return await ApiPostTempVariable(data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

async function send_temp_variable_update(id: number, data: any) {
  return await ApiUpdateTempVariable(id, data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

function get_env(env: any) {
  content_type.value = "server";
  if (focus_node.value === env.id) {
    return;
  }
  loading.value = true;
  server_table.value = [];
  env_variable_table.value = [];
  focus_node.value = env.id;
  const data = {
    env_name: env.name,
    project: route.params.project,
  };
  reset_current_server();
  current_variable.value = null;
  ApiGetProjectServerParameters(data).then(async (res: any) => {
    console.log(res);
    await tools.delay(300);
    loading.value = false;
    server_table.value = res[0].server_mappings;
    env_variable_table.value = res[0].env_variables_mappings;
  });
}

// 使用v-model的props定义
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
});

// 使用计算属性实现双向绑定
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

function visit_add_env_dialog() {
  show_add_env_dialog.value = true;
}

// 统一关闭处理方法
const handleClose = () => {
  dialogVisible.value = false;
};

// 定义emit事件
const emit = defineEmits(["update:modelValue"]);

function set_awalys_show_popover(id: number) {
  awalys_show_popover.value = id;
}

async function chang_node_name(data: any) {
  const _data = {
    type: 0,
    child_action_type: "edit_server_parameter",
    content: {
      id: data.id,
      project: route.params.project,
      name: data.name,
    },
  };
  const result = await post_env(_data);
  if (result === false) return;
  GlobalState.sendMessage("change_env_name", {
    id: data.id,
    name: data.name,
  });
  clean_popover();
  tools.message("修改成功", proxy, "success");
}

async function post_env(data: any) {
  return await ApiPostEnv(data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

async function delete_env(data: any) {
  const _data = {
    type: 0,
    child_action_type: "delete_server_parameter",
    content: {
      id: data.id,
    },
  };
  const result = await post_env(_data);
  if (result === false) return;
  env_list.value = env_list.value.filter((item: any) => item.id !== data.id);
  GlobalState.sendMessage("delete_env", { data: data.id });
  tools.message("删除成功", proxy, "success");
  clean_popover();
  if (focus_node.value !== data.id) {
    return;
  } else {
    await get_env(env_list.value[0]);
  }
}

async function add_env(name: string) {
  console.log(name);

  if (name.length === 0) {
    tools.message("环境名不能为空", proxy, "error");
    return;
  }
  const _data = {
    type: 0,
    child_action_type: "add_server_parameter",
    content: {
      project: route.params.project,
      name: name,
    },
  };
  const res = await post_env(_data);
  if (res === false) return;
  env_list.value.push(res);
  show_add_env_dialog.value = false;
  GlobalState.sendMessage("add_env", { data: res });
  tools.message("添加成功", proxy, "success");
}

function clean_popover() {
  show_popover.value = false;
  awalys_show_popover.value = -1;
  setTimeout(() => {
    show_popover.value = true;
  }, 0);
}

function add_server() {
  if (current_server.value !== null) {
    tools.message("请先保存当前编辑中的服务", proxy);
    return;
  }
  current_server_type.value = "add";
  const new_server = {
    is_default: false,
    key: tools.getRandomInt(1000000, 9999999),
    name: "",
    prefix: "",
  };
  current_server.value = new_server;
  server_table.value.push(new_server);
}

function open_add_env_variable_dialog() {
  if (current_variable.value !== null) {
    tools.message("请先保存当前编辑中的变量", proxy);
    return;
  }
  current_variable_type.value = "add";
  const _data = {
    key: tools.getRandomInt(1000000, 9999999),
    name: "",
    statement: "",
    value: "",
  };
  current_variable.value = _data;
  env_variable_table.value.push(_data);
}

async function save_env_variable(row: any) {
  if (current_variable_type.value === "add") {
    const _data = {
      type: 0,
      child_action_type: "add_env_mapping",
      content: {
        id: focus_node.value,
        name: row.name,
        key: row.key,
        value: row.value,
        statement: row.statement,
      },
    };
    const res = await post_env(_data);
    if (res === false) return;
    tools.message("添加成功", proxy, "success");
  } else {
    if (
      origin_env_variable_name.value === row.name &&
      origin_env_variable_value.value === row.value &&
      origin_env_variable_statement.value === row.statement
    ) {
      reset_current_variable();
      return;
    }
    const _data = {
      type: 0,
      child_action_type: "edit_env_mapping",
      content: {
        id: focus_node.value,
        name: row.name,
        key: row.key,
        value: row.value,
        statement: row.statement,
      },
    };
    const res = await post_env(_data);
    if (res === false) return;
    tools.message("修改成功", proxy, "success");
  }
  reset_current_variable();
}
async function delete_env_variable(row: any) {
  if (current_variable_type.value === "edit") {
    const _data = {
      type: 0,
      child_action_type: "delete_env_mapping",
      content: {
        id: focus_node.value,
        name: row.name,
      },
    };
    const result = await post_env(_data);
    if (result === false) return;
  }

  env_variable_table.value = env_variable_table.value.filter(
    (item: any) => item.key !== row.key
  );
  reset_current_variable();
  tools.message("删除成功", proxy, "success");
}
function edit_server(row: any, index: any) {
  if (current_server.value !== null) {
    tools.message("请先保存当前编辑中的服务", proxy);
    return;
  }
  current_server_type.value = "edit";
  current_server.value = row;
  origin_server_name.value = row.name;
  origin_server_prefix.value = row.prefix;
}

function edit_env_variable(row: any, index: any) {
  if (current_variable.value !== null) {
    tools.message("请先保存当前编辑中的环境变量", proxy);
    return;
  }
  current_variable_type.value = "edit";
  current_variable.value = row;
  origin_env_variable_name.value = row.name;
  origin_env_variable_value.value = row.value;
  origin_env_variable_statement.value = row.statement;
  current_env_variable_index.value = index;
}

async function save_server(row: any) {
  if (current_server_type.value === "add") {
    const _data = {
      type: 0,
      child_action_type: "add_server_mapping",
      content: {
        id: focus_node.value,
        name: row.name,
        key: row.key,
        prefix: row.prefix,
      },
    };
    const res = await post_env(_data);
    if (res === false) return;
    GlobalState.sendMessage("add_env_server", {
      data: res,
    });
    tools.message("添加成功", proxy, "success");
  } else {
    if (
      origin_server_prefix.value === row.prefix &&
      origin_server_name.value === row.name
    ) {
      reset_current_server();
      return;
    }
    const _data = {
      type: 0,
      child_action_type: "edit_server_mapping",
      content: {
        id: 1,
        origin_name: origin_server_name.value,
        name: row.name,
        prefix: row.prefix,
      },
    };
    const res = await post_env(_data);
    if (res === false) return;
    GlobalState.sendMessage("update_env_server", null);
    tools.message("修改成功", proxy, "success");
  }
  reset_current_server();
}

function reset_current_server() {
  origin_server_name.value = "";
  current_server.value = null;
}

function reset_current_temp() {
  origin_temp_variable.value = null;
  current_temp.value = null;
}

function reset_current_variable() {
  origin_env_variable_name.value = "";
  origin_env_variable_value.value = "";
  origin_env_variable_statement.value = "";
  current_variable.value = null;
}

async function delete_server(row: any) {
  if (current_server_type.value === "add") {
    server_table.value = server_table.value.filter(
      (item: any) => item.key !== row.key
    );
    reset_current_server();
    return;
  }
  const _data = {
    type: 0,
    child_action_type: "delete_server_mapping",
    content: {
      id: focus_node.value,
      project: route.params.project,
      name: row.name,
    },
  };
  const result = await post_env(_data);
  if (result === false) return;
  server_table.value = server_table.value.filter(
    (item: any) => item.key !== row.key
  );
  GlobalState.sendMessage("update_env_server", null);
  reset_current_server();
  tools.message("删除成功", proxy, "success");
}
</script>

<style scoped lang="scss">
.default-server-div {
  font-size: 12px;
  background-color: var(--default-bg);
  border-radius: 5px;
  padding: 0px 5px;
  color: var(--global-theme-color);
}
.body-tools {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--border-color);
  border-left: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  padding: 7px 12px;
  .title {
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
  }
  .tools {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    div {
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 4px 8px;
      gap: 4px;
      border-radius: 8px;
    }
    div:hover {
      background-color: var(--hover-bg);
    }
  }
}
.setting-outside {
  display: flex;
  justify-content: start;
  align-items: center;
  // padding: 0px 20px 0px 0px;
  border-bottom: 1px solid var(--border-color-light);
  .setting-main-content {
    width: 100%; // 改成 100%
    // max-width: calc(100% - 20px);
    display: flex;
    .setting-main-content-left {
      border-right: 1px solid var(--border-color-light);
      flex: 20;
      display: flex;
      flex-direction: column;
      .setting-main-content-left-title {
        font-size: 12px;
        color: var(--font-default-color);
        height: 24px;
        padding: 8px 10px;
        display: flex;
        align-items: center;
      }
      .setting-main-content-left-env-list-new {
        padding: 0px 10px;
        .focus-item,
        .setting-main-content-left-env-list-item:hover {
          background-color: black;
          .env-name {
            color: white !important;
          }
        }
        .setting-main-content-left-env-list-item {
          cursor: pointer;
          margin: 4px 0px;
          padding: 4px;
          height: 28px;
          display: flex;
          align-items: center;
          gap: 5px;
          border-radius: 8px;
          justify-content: space-between;
          .box {
            font-size: 12px;
            width: 20px;
            height: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 4px;
            background-color: var(--dark-default-bg);
          }
          .env-name {
            font-size: 14px;
            font-weight: 500;
            color: black;
            display: flex;
            align-items: center;
            gap: 5px;
          }
        }
      }
      .setting-main-content-left-env-list {
        flex: 1;
        padding: 0px 10px;
        overflow: scroll;
        .focus-item,
        .setting-main-content-left-env-list-item:hover {
          background-color: black;
          .env-name {
            color: white !important;
          }
        }
        .setting-main-content-left-env-list-item {
          cursor: pointer;
          margin: 4px 0px;
          padding: 4px;
          height: 28px;
          display: flex;
          align-items: center;
          gap: 5px;
          border-radius: 8px;
          justify-content: space-between;
          .box {
            font-size: 12px;
            width: 20px;
            height: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 4px;
            background-color: var(--dark-default-bg);
          }
          .env-name {
            font-size: 14px;
            font-weight: 500;
            color: black;
            display: flex;
            align-items: center;
            gap: 5px;
          }
        }
      }
    }
    .setting-main-content-right {
      flex: 80;
      overflow: scroll;
    }
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
  width: 1.1rem !important;
  height: 0.9rem !important;
  svg {
    width: 14px !important;
    height: 14px !important;
  }
}
</style>

<style lang="scss">
.env-dialog {
  height: 90%;
  .el-dialog__header {
    padding: 0px;
  }
}
.el-popper.is-customized {
  /* Set padding to ensure the height is 32px */
  padding: 6px 12px;
  background: linear-gradient(90deg, rgb(234, 243, 208), rgb(225, 225, 225));
}
.el-popper.is-customized .el-popper__arrow::before {
  background: linear-gradient(45deg, #ffffff, #bce689);
  right: 0;
}
</style>
