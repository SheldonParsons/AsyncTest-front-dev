<template>
  <div style="display: flex;flex-direction: column;height: 100%;min-width: 775px;">
    <div>
      <el-row v-if="loading === false" class="url-inputer">
        <el-col :offset="1" :span="3"><el-dropdown trigger="click" @command="handelMethod">
            <el-button type="primary" class="method-btn">
              {{ methodMapping[data.value.method]
              }}<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :command="key" v-for="(value, key) in methodMapping" :key="key">{{ value
                  }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown></el-col>
        <el-col :span="14">
          <SpecialInput height="40px" radius="0px 0px 0px 0px" v-model="data.value.path" placeholder="Enter Request URL"
            @clearData="clearUrl" :cleanTips="'清空请求路径'" :max="600" :isTransColor="false" :disableParams="true">
          </SpecialInput>
        </el-col>
        <el-col :span="3">
          <el-button class="send-btn" type="primary" @click="send">发送请求</el-button>
        </el-col>
        <el-col style="margin-left: 5px" :span="2">
          <MotionButton @click="save">
            <div style="display: flex;justify-content: space-between;align-items: center;gap: 3px;">
              <div style="font-size: 14px;">保存</div>
              <div v-if="!is_case"
                style="font-size: 0.7rem;background-color: black;color: white;padding: 1px 2px;border-radius: 4px;">{{
                  get_system_save() }}</div>
            </div>
          </MotionButton>
        </el-col>
      </el-row>
      <el-row v-else class="url-inputer">
        <el-col :span="22" :offset="1">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="h1" style="width: 10%" />
              <el-skeleton-item variant="h1" style="width: 50%; margin-left: 20px" />
              <el-skeleton-item variant="h1" style="width: 10%; margin-left: 20px" />
              <el-skeleton-item variant="h1" style="width: 10%; margin-left: 20px" />
              <el-skeleton-item variant="h1" style="width: 10%; margin-left: 20px" />
            </template>
          </el-skeleton>
        </el-col>
      </el-row>
    </div>
    <div class="content-detail no-scroll" ref="interfaceInfoRef">
      <div v-if="loading === false">
        <RegularInput v-model="data.value.name"></RegularInput>
        <el-row v-if="!is_outer_read_mode">
          <el-col :offset="1" :span="5">
            <RegularSelect label="状态" :showBadge="true" v-model="data.value.status" :optionList="testStatus"
              :selectedStatusLabel="selectedStatusLabel" :displayLabel="statusLabel"></RegularSelect>
          </el-col>
          <el-col :offset="1" :span="5">
            <RegularSelect label="责任人" :showBadge="false" v-model="data.value.head" :optionList="responsors"
              :selectedStatusLabel="selectedResponsorLabel" :displayLabel="responsorLabel"></RegularSelect>
          </el-col>
          <el-col :offset="1" :span="5">
            <RegularSelectMul label="标签" :showBadge="false" v-model="data.value.markers" :optionList="marker_list"
              :displayLabel="markerLabel" @footerEntry="addMarker"></RegularSelectMul>
          </el-col>
          <el-col :offset="1" :span="4">
            <RegularSelectGroup label="服务" :showBadge="false" v-model="data.value.server" :options="serverOptions">
            </RegularSelectGroup>
          </el-col>
        </el-row>
        <el-row>
          <el-col :offset="1" :span="22">
            <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
          ">
            </div>
          </el-col>
        </el-row>
        <el-row>
          <el-col :offset="1" :span="22" style="padding-top: 10px;">
            <motion.div ref="statementRef" :style="{ 'height': collapseStatement ? '150px' : '100%' }"
              class="statement">
              <!-- <el-input v-if="!show_markdown" v-model="data.value.statement" :autosize="{ minRows: 4 }" type="textarea"
                placeholder="用例描述信息（支持MarkDown格式）" /> -->
              <MultiInput @save="done_statement" :showMarkdown="show_markdown" v-model="data.value.statement">
              </MultiInput>
              <!-- <MarkDown v-else :data="data.value.statement"></MarkDown> -->
              <div ref="collapseRef" v-if="data.value.statement.split('\n').length > 4" class="collapse"
                :style="{ 'height': collapseStatement ? '100px' : '28px', 'position': collapseStatement ? 'absolute' : 'unset' }"
                @click="toggleCollapse" style="display: flex;justify-content: center;">
                <div style="display: flex;justify-content: center;align-items: center;min-width: 200px;">
                  <div class="content">
                    <ArrowDownIcon v-if="collapseStatement" style="width: 20px;"></ArrowDownIcon>
                    <ArrowUpIcon v-else style="width: 20px;"></ArrowUpIcon>展开说明
                  </div>
                </div>
              </div>
            </motion.div>
          </el-col>
        </el-row>
      </div>
      <el-row v-if="loading === true" style="margin-top: 10px;">
        <el-col :span="22" :offset="1">
          <el-skeleton :rows="8" animated />
        </el-col>
      </el-row>
      <el-row style="margin-top: 10px;">
        <el-col :span="22" :offset="1">
          <div class="ast-header-left">
            <span class="ast-block-icon"></span>
            <label class="ast-label">请求参数</label>
          </div>
        </el-col>
      </el-row>
      <div v-if="loading === false">
        <el-row style="margin-top: 10px;">
          <el-col :span="22" :offset="1">
            <ChoiceParamPosition :active_res_tab="active_res_tab" @change_tab="val => active_res_tab = val"
              :disable_index="4">
            </ChoiceParamPosition>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="22" :offset="1">
            <Params v-if="active_res_tab === 0" :tableData="data.value.query" :interface_id="interface_id"></Params>

            <Body v-show="active_res_tab === 1" :tableData="data.value.json_data"
              :wwwData="data.value.x_www_form_urlencoded" :formData="data.value.form_data" :code="data.value.raw"
              :bodyType="data.value.body_type" @change_body_type="handleChangeBodyType"
              @exchange_json_body_value="handleExchangeValue" @change_raw_body="handle_change_raw_body"
              :interface="interface_id" :inOuter="is_outer_read_mode"></Body>
            <Headers v-if="active_res_tab === 2" :canVar="true" :tableData="data.value.headers"
              :interface="interface_id">
            </Headers>
            <div class="body-tools" v-if="active_res_tab === 4">
              <div class="title">鉴权设置(暂不可用)</div>
            </div>
            <div v-if="active_res_tab === 4" class="auth-outside">
              <Auth :auth_setting="data.value.auth" ref="auth_ref" :offset="0" :hasParent="true"></Auth>
            </div>
            <PreAction ref="pre_action_ref" v-if="active_res_tab === 5" :offset="0" :span="24"
              v-model="data.value.pre_actions.elements" :father-actions="data.value.pre_actions.father_actions"
              :hasFatherActions="true" :interface="interface_id"></PreAction>
            <AfterAction ref="after_action_ref" v-if="active_res_tab === 6" :offset="0" :span="24"
              v-model="data.value.after_actions.elements" :father-actions="data.value.after_actions.father_actions"
              :hasFatherActions="true" :interface="interface_id"></AfterAction>
          </el-col>
        </el-row>
      </div>
      <el-row v-else style="margin-top: 10px;">
        <el-col :span="22" :offset="1">
          <el-skeleton :rows="5" animated />
        </el-col>
      </el-row>
      <div class="section-separator"></div>
      <div class="response-section" style="margin-bottom: 170px">
        <el-row style="margin-top: 0">
          <el-col :span="22" :offset="1">
            <div class="ast-header-left">
              <span class="ast-block-icon"></span>
              <label class="ast-label">返回响应示例</label>
            </div>
          </el-col>
        </el-row>
        <div v-if="loading === false">
          <el-row style="margin-top: 10px">
            <el-col :span="22" :offset="1">
              <ResponseTabs :response-options="responseOptions" :current-id="current_response.id"
                @change="change_response_tab" @add="add_response_handle" />
            </el-col>
          </el-row>
          <div>
            <el-row style="margin-top: 5px">
              <el-col :span="22" :offset="1">
                <ResponseLine v-model="current_response" @delete="delete_response(current_response)" />
              </el-col></el-row>
            <el-row style="margin-top: 10px">
              <el-col :span="22" :offset="1">
                <div class="process-dialog-content">
                  <div style="
                  width: 100%;
                  border: 1px solid #f3f5f6;
                  border-radius: 10px;
                ">
                    <div class="editor-header">
                      <div style="font-size: 14px; font-weight: 500">响应内容</div>
                      <div>
                        <ParamsTool @insert_action="insert_params" :showVariable="false"></ParamsTool>
                      </div>
                    </div>
                    <NewJsonEditor v-if="loading === false" ref="ediorText" v-model="current_response.content">
                    </NewJsonEditor>
                    <!-- <el-skeleton v-else :rows="10" animated /> -->
                  </div>
                </div>
              </el-col>
            </el-row>
            <el-row style="margin-top: 10px">
              <el-col :span="22" :offset="1">
                <Headers :canVar="false" :tableData="current_response.headers"></Headers>
              </el-col>
            </el-row>
          </div>
        </div>
        <el-row v-else style="margin-top: 10px;">
          <el-col :span="22" :offset="1">
            <el-skeleton :rows="5" animated />
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
  <TempLogDialog v-model="show_send_response_dialog" :log-data="send_response" />
  <NormalDialog v-model="show_has_change_dialog" @action="has_change_action">
  </NormalDialog>
  <NormalDialog v-model="show_has_change_dialog_on_tab" @action="has_change_action_on_tab">
  </NormalDialog>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  onBeforeUnmount,
  onMounted,
  getCurrentInstance,
  watch,
  reactive,
  toRaw,
  nextTick
} from "vue";
import { motion } from "motion-v"
import SpecialInput from "@/components/common/input/specialInput.vue";
import ParamsTool from "@/views/api/child_component/params.vue";
import RegularInput from "../child_component/ragular_input.vue";
import RegularSelect from "../child_component/regular_select.vue";
import RegularSelectMul from "../child_component/regular_select_mul.vue";
import RegularSelectGroup from "../child_component/regular_select_group.vue";
import Auth from "@/views/api/child_context/root_dir/auth.vue";
import PreAction from "@/views/api/child_context/root_dir/pre_action.vue";
import AfterAction from "@/views/api/child_context/root_dir/after_action.vue";
import NewJsonEditor from "@/components/common/editor/NewJsonEditor.vue";
import ChoiceParamPosition from '@/views/api/child_context/widget_cpm/choice_param_position.vue'
import Body from "./req/body.vue";
import Params from "./req/params.vue";
import Headers from "./req/headers.vue";
import MotionButton from '@/assets/motion/button.vue'
import ArrowDownIcon from '@/assets/logo/final/match_vue/arrow_down.vue'
import ArrowUpIcon from '@/assets/logo/final/match_vue/arrow_up.vue'
import MultiInput from '@/views/api/child_context/widget_cpm/multi_input.vue'
import ResponseLine from '@/views/api/child_context/widget_cpm/response_line.vue'
import ResponseTabs from '@/views/api/child_context/widget_cpm/response_tabs.vue'
import TempLogDialog from '@/views/api/child_context/widget_cpm/temp_log_dialog.vue'
import NormalDialog from '@/views/case/components/dialog.vue'
import _ from "lodash";
//debounce

import {
  ApiGetInterfaceFiles,
  ApiGetSummarySource,
  ApiUpdateInterface,
  ApiGetSingleInterface,
  ApiGetSingleInterfaceList,
  ApiPostResponse,
  ApiGetResponse,
  ApiDeleteResponse,
  ApiUpdateResponse,
  ApiPostTag,
} from "@/api/interface/index";
import { StreamPostApi } from "@/api/sse/index";
import { ApiGetProjectServerParameters } from "@/api/interface/env";
import { useRoute } from "vue-router";
import { GlobalState, bus } from "@/state/index";
const route = useRoute();
const show_markdown = ref(false);
// 全局对象
const methodMapping: any = {
  get: "GET",
  post: "POST",
  put: "PUT",
  delete: "DELETE",
  patch: "PATCH"
};
const loading = ref(true);
const auth_ref: any = ref(null);
const pre_action_ref: any = ref(null);
const after_action_ref: any = ref(null);
const show_has_change_dialog = ref(false)
const show_has_change_dialog_on_tab = ref(false)
const activeTab = ref<"A" | "B">("B");
const hasShown = ref({ A: true, B: false });
const active_res_tab = ref(1);
const testStatus: any = ref([]);
const responsors: any = ref([]);
const marker_list: any = ref([]);
const serverOptions: any = ref([]);
const responseOptions: any = ref([]);
const collapseStatement = ref(true)
const isChange = ref(true)
const interfaceInfoRef: any = ref(null)
const current_response: any = ref({
  content: "",
  headers: [],
  id: 1,
  interface: 1,
  name: "",
  status: 200,
});
const ediorText: any = ref(null);
const file_list = ref([]);
const data: any = reactive({});
const cache_all_env: any = ref();
const cache_user_env: any = ref();
const enableWatch = ref(true); // 控制监听开关
const show_json_editor = ref(true);
const show_send_response_dialog = ref(false);
const send_response: any = ref([]);
const paste_interface_info_data: any = ref([])
const is_outer_read_mode = ref(false)
let stopWatchHandler: () => void;
let originalData: any = null;
let originalResponse: any = null;
import deepDiff from "deep-diff";
let pendingResolve: ((result: boolean) => void) | null = null

onMounted(async () => {
  console.log(props.interface_id);

  console.log(typeof props.interface_id === 'string');

  if (typeof props.interface_id === 'string') {
    is_outer_read_mode.value = true
    window.addEventListener("keydown", addAltS);
    justGetReadData()
  } else {
    is_outer_read_mode.value = false
    // 添加全局事件监听
    window.addEventListener("keydown", addAltS);

    await get_source();
    GlobalState.sendMessage("clean_interface_change", {
      node_id: props.node_id,
    });
    setupWatch();
    setupWatchResponse();
    if (data.value.statement.length === 0) {
      show_markdown.value = false
      collapseStatement.value = false
    }
    try_paste_interface_info()
  }
  // const handler = (e: Event) => {
  //   console.log("in handler");

  //   const { resolve } = (e as CustomEvent).detail
  //   pendingResolve = resolve
  //   show_has_change_dialog.value = true
  // }

  // bus.addEventListener('get_interface_close_valid', handler)

  // onBeforeUnmount(() => {
  //   bus.removeEventListener('get_interface_close_valid', handler)
  // })
});

async function has_change_action_on_tab(action_name: string) {
  if (action_name === 'pass') {
    show_has_change_dialog_on_tab.value = false
  } else if (action_name === 'save') {
    show_has_change_dialog_on_tab.value = false
    await save()
    GlobalState.sendMessage('commit_change_tab')
  } else if (action_name === 'nosave') {
    show_has_change_dialog_on_tab.value = false
    GlobalState.sendMessage('commit_change_tab')
  }
}

async function has_change_action(action_name: string) {
  GlobalState.sendMessage("change_leave_dialog", { action_name: action_name });
  if (action_name === 'pass') {
    show_has_change_dialog.value = false
    if (!pendingResolve) return
    pendingResolve(false)
  } else if (action_name === 'save') {
    show_has_change_dialog.value = false
    if (!pendingResolve) return
    await save()
    pendingResolve(true)
  } else if (action_name === 'nosave') {
    show_has_change_dialog.value = false
    if (!pendingResolve) return
    pendingResolve(true)
  }
}


async function justGetReadData() {
  const _data = {
    interface_key: props.interface_id,
    project: route.params.project
  }
  await ApiGetSingleInterfaceList(_data).then(async (res: any) => {
    if (res.hasOwnProperty("result") && res.result === 0) {
      window.$toast({ title: res.data, type: 'error' })
      return false;
    }
    data.value = res;
    if (data.value.statement.length !== 0) {
      show_markdown.value = true;
    } else {
      show_markdown.value = false;
    }
    loading.value = false;
  });
}

async function try_paste_interface_info() {
  if (paste_interface_info_data.value && paste_interface_info_data.value.url) {
    cover_headers(paste_interface_info_data.value.headers)
    const url_object = parseUrl(paste_interface_info_data.value.url)
    cover_path(url_object.path)
    cover_query_params(url_object.query_params)
    cover_method(paste_interface_info_data.value.method)
    await cover_body(paste_interface_info_data.value.body)
  }
  paste_interface_info_data.value = null
}



async function cover_body(value: any) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    await handleExchangeValue(JSON.stringify(value), convertRoot)
    data.value.body_type = 'json'
  } else if (typeof value === 'string') {
    data.value.raw = value
    data.value.body_type = 'raw'
  }
}

function cover_method(method: string) {
  data.value.method = method.toLowerCase()
}

function cover_path(path: string) {
  data.value.path = path
}

function cover_query_params(obj: any) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      console.log(key, obj[key]);
      data.value.query.push({
        t: 'string',
        id: getRandomInt(1000000, 10000000),
        name: key,
        default: obj[key],
        statement: ''
      })
    }
  }
}

function cover_headers(obj: any) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      console.log(key, obj[key]);
      data.value.headers.push({
        t: 'string',
        id: getRandomInt(1000000, 10000000),
        name: key,
        default: obj[key],
        statement: ''
      })
    }
  }
}

function parseUrl(urlString: string) {
  const url = new URL(urlString);

  // 1. domain（协议 + 主机 + 端口）
  const domain = `${url.protocol}//${url.host}`;

  // 2. path（不含 query）
  const path = url.pathname;

  // 3. query_params（转为普通对象）
  const query_params: any = {};
  for (const [key, value] of url.searchParams.entries()) {
    query_params[key] = value ?? '';
  }

  return { domain, path, query_params };
}

const props = defineProps({
  node_id: {
    type: Number,
    default: null,
  },
  interface_id: {
    type: null,
    default: null,
  },
  is_case: {
    type: Boolean,
    default: false
  }
});

watch(activeTab, (val) => {
  hasShown.value[val] = true;
});

watch(
  () => GlobalState.count,
  async (newCount) => {
    if (GlobalState.message === "set_user_env") {
      const data = {
        project: route.params.project,
      };
      cache_user_env.value = GlobalState.user_env;
      await ApiGetProjectServerParameters(data).then((res: any) => {
        search_and_set_env_by_name(res, cache_user_env.value);
        cache_user_env.value = null;
      });
    } else if (GlobalState.message === "change_name_from_tree") {
      if (GlobalState.data.node_id === props.node_id) {
        enableWatch.value = false;
        data.value.name = GlobalState.data.name;
        originalData.name = GlobalState.data.name;
        setTimeout(() => {
          enableWatch.value = true;
        }, 0);
      }
    } else if (GlobalState.message === "add_env_server") {
      serverOptions.value[1].options = GlobalState.data.data.server_mappings;
    } else if (GlobalState.message === "update_env_server") {
      update_env_and_interface_env();
    } else if (GlobalState.message === "save_interface") {
      await save()
      GlobalState.sendMessage('save_done', true)
    } else if (GlobalState.message === 'paste_interface_info') {
      paste_interface_info_data.value = GlobalState.data.data
    } else if (GlobalState.message === 'interface_close_commit') {
      if (isChange.value) {
        show_has_change_dialog.value = true
      }
    } else if (GlobalState.message === 'interface_close_commit_on_tab') {
      if (isChange.value) {
        show_has_change_dialog_on_tab.value = true
      } else {
        GlobalState.sendMessage('commit_change_tab')
      }
    }
  }
);

function get_system_save() {
  if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
    return '⌘+S'
  }
  return 'Ctrl+S'
}


function toggleCollapse() {
  collapseStatement.value = !collapseStatement.value
  const element = interfaceInfoRef.value;
  if (element) {
    // 使用 scrollTo 滚动元素内部的内容
    element.scrollTo({
      top: 0, // 滚动到内容的总高度，即最底部
      behavior: 'smooth'
    });
  }
  show_markdown.value = true
}

function send() {
  if (is_outer_read_mode.value) {
    window.$toast({ title: 'IntelliJ IDEA 接口暂不支持调试，请同步到普通接口' })
    return
  }
  const _data = {
    type: "run",
    content: {
      interface: props.interface_id,
      project: route.params.project,
    },
  };
  show_send_response_dialog.value = true;
  send_response.value = [];
  StreamPostApi("api/interface/run/", _data, async (res: any) => {
    send_response.value.push(res);
  });
}

function update_env_and_interface_env() {
  const _data = {
    project: route.params.project,
    update_env_source: props.interface_id,
  };
  ApiGetSummarySource(_data).then((res: any) => {
    enableWatch.value = false;
    search_and_set_env_by_name(res.envs, GlobalState.user_env);
    data.value.server = res.interface_server;
    setTimeout(() => {
      enableWatch.value = true;
    }, 0);
  });
}

function search_and_set_env_by_name(all_env: any, env_name: string | null) {
  for (let i = 0; i < all_env.length; i++) {
    if (all_env[i].name === env_name) {
      set_server_options(all_env[i].server_mappings);
      break;
    }
  }
}

// 监听data.value的深度变化
// 初始化动态监听
const setupWatch = () => {
  stopWatchHandler = watch(
    () => data.value,
    () => {
      if (!enableWatch.value) return;

      // 触发变化提示
      showChangeIndicator(); // 你的红色图标提示方法

      // 立即关闭监听
      enableWatch.value = false;
      stopWatchHandler(); // 停止监听
    },
    { deep: true }
  );
};

const setupWatchResponse = () => {
  stopWatchHandler = watch(
    () => responseOptions.value,
    () => {
      if (!enableWatch.value) return;
      // 触发变化提示
      showChangeIndicator(); // 你的红色图标提示方法
      // 立即关闭监听
      enableWatch.value = false;
      stopWatchHandler(); // 停止监听
    },
    { deep: true }
  );
};

function change_response_tab(item: any) {
  current_response.value = item;
  show_json_editor.value = false;
  setTimeout(() => {
    show_json_editor.value = true;
  }, 300);
}

// 发送修改提示
function showChangeIndicator() {
  isChange.value = true
  GlobalState.sendMessage("change_interface_content", {
    node_id: props.node_id,
  });
}

async function get_source() {
  const res_data = {
    interface: props.interface_id,
  };

  await ApiGetResponse(res_data).then((res: any) => {
    responseOptions.value = res;
    if (responseOptions.value.length > 0) {
      current_response.value = responseOptions.value[0];
    }
    originalResponse = _.cloneDeep(responseOptions.value);
  });
  await ApiGetSingleInterface(props.interface_id, {}).then(async (res: any) => {
    await ApiGetSummarySource({
      project: res.project,
    }).then((res: any) => {
      testStatus.value = res.markers;
      responsors.value = res.members;
      marker_list.value = res.tag;
      cache_all_env.value = res.params;
    });
    if (res.hasOwnProperty("result") && res.result === 0) {
      window.$toast({ title: res.data, type: 'error' })
      return false;
    }
    data.value = res;
    originalData = _.cloneDeep(data.value);
    search_and_set_env_by_name(cache_all_env.value, GlobalState.user_env);
    cache_all_env.value = null;
    // await check_file_legal_and_fixed(data.value.form_data);
    if (data.value.statement.length !== 0) {
      show_markdown.value = true;
    } else {
      show_markdown.value = false;
    }
    loading.value = false;
  });
}

function set_server_options(server_mappings: any) {
  serverOptions.value = [
    {
      label: "默认设置",
      options: [
        {
          id: 0,
          name: "继承父类",
          server: "跟随父级目录设置（推荐）",
        },
      ],
    },
    {
      label: "手动指定",
      options: server_mappings,
    },
  ];
}

function done_statement(value: boolean) {
  if (data.value.statement === "") {
    window.$toast({ title: "转 Markdown 内容不能为空", type: 'info' })
  } else {
    show_markdown.value = value;
  }
}

async function check_file_legal_and_fixed(data: any) {
  const _file_list = await get_file_list();
  // 使用 Set 数据结构存储所有文件 ID，实现 O(1) 复杂度查询
  const fileIdSet = new Set(_file_list.map((file: any) => file.id));

  // 使用 for...of 替代 forEach 提升循环性能（尤其在大型数据集时）
  const _data = data.data;

  for (const item of _data) {
    if (item.t === "files") {
      // 使用提前声明避免重复访问对象属性
      const fileList = item.file_list;
      // 优先使用基础循环而非高阶函数
      for (let i = 0; i < fileList.length; i++) {
        const server_file = fileList[i];
        if (server_file.lose && server_file.lose === true) {
          continue;
        }
        if (!fileIdSet.has(server_file.id)) {
          server_file["lose"] = true;
        }
      }
    }
  }
}

async function get_file_list() {
  return await ApiGetInterfaceFiles({}).then((res: any) => {
    file_list.value = res;
    return file_list.value;
  });
}

function handleChangeBodyType(label: string) {
  data.value.body_type = label;
  window.$toast({ title: `您变更了请求类型为：${label.toUpperCase()}，注意保存` })
}

function insert_params(text: string) {
  ediorText.value?.insertText(text);
}

function delete_response(_current_response: any) {
  console.log(_current_response);

  ApiDeleteResponse(_current_response.id).then((res: any) => {
    console.log(res);

    if (result_check(res) === false) return;
    enableWatch.value = false;
    responseOptions.value = responseOptions.value.filter(
      (item: any) => item.id !== _current_response.id
    );
    originalResponse = originalResponse.filter(
      (item: any) => item.id !== _current_response.id
    );
    current_response.value = responseOptions.value[0];
    setTimeout(() => {
      enableWatch.value = true;
    }, 0);
    window.$toast({ title: "删除成功" })
  });
}

function getRandomInt(min: any, max: any) {
  min = Math.ceil(min); // 确保min是整数
  max = Math.floor(max); // 确保max是整数
  return Math.floor(Math.random() * (max - min + 1)) + min; // 返回介于min和max之间的整数
}

function add_response_handle() {
  const new_response = {
    name: "成功",
    status: 200,
    content: "",
    headers: [],
    interface: props.interface_id,
  };
  ApiPostResponse(new_response).then((res: any) => {
    enableWatch.value = false;
    responseOptions.value.push(_.cloneDeep(res));
    originalResponse.push(_.cloneDeep(res));
    current_response.value =
      responseOptions.value[responseOptions.value.length - 1];
    setTimeout(() => {
      enableWatch.value = true;
    }, 0);
  });
}

function handle_change_raw_body(value: string) {
  data.value.raw = value;
}

async function optimizedUpdate(_data: any[]) {
  // 使用文档片段优化
  data.value.json_data = [...data.value.json_data, ..._data];
}

async function handleExchangeValue(
  json_string: string,
  exchange_func: Function
) {
  const newData = await Promise.resolve().then(() =>
    exchange_func(json_string)
  );
  data.value.json_data = [];
  setTimeout(async () => {
    await optimizedUpdate([newData]);
    // data.value.json_data = [newData]
  }, 50);
}

function convertRoot(jsonString: string) {
  try {
    const data = JSON.parse(jsonString);
    const root = createRootNode(data);
    return root;
  } catch (error) {
    throw new Error("Invalid JSON input");
  }

  function createRootNode(value: any) {
    const rootNode: any = {
      id: getRandomInt(1000000, 10000000),
      name: "",
      statement: "",
      default: "",
    };

    if (value === null) {
      rootNode.t = "null";
      rootNode.default = "null";
    } else if (Array.isArray(value)) {
      rootNode.t = "array";
      rootNode.default = "[]";
      rootNode.children = convertArrayElements(value);
    } else if (typeof value === "object") {
      rootNode.t = "object";
      rootNode.default = "{}";
      rootNode.children = convertObjectProperties(value);
    } else {
      handlePrimitiveType(value, rootNode);
    }

    return rootNode;
  }

  function convertObjectProperties(obj: any) {
    return Object.entries(obj).map(([key, value]) => convertNode(value, key));
  }

  function convertArrayElements(arr: any) {
    return arr.map((item: any) => convertNode(item, ""));
  }

  function convertNode(value: any, name: any) {
    const node: any = {
      id: getRandomInt(1000000, 10000000),
      name,
      statement: "",
    };

    if (value === null) {
      node.t = "null";
      node.default = "null";
    } else if (Array.isArray(value)) {
      node.t = "array";
      node.default = "[]";
      node.children = convertArrayElements(value);
    } else if (typeof value === "object") {
      node.t = "object";
      node.default = "{}";
      node.children = convertObjectProperties(value);
    } else {
      handlePrimitiveType(value, node);
    }

    return node;
  }

  function handlePrimitiveType(value: any, node: any) {
    switch (typeof value) {
      case "string":
        node.t = "string";
        node.default = value;
        break;
      case "number":
        node.t = Number.isInteger(value) ? "integer" : "number";
        node.default = String(value);
        break;
      case "boolean":
        node.t = "boolean";
        node.default = String(value);
        break;
      default:
        node.t = "unknown";
        node.default = "";
    }
  }
}

onBeforeUnmount(() => {
  window.removeEventListener("keydown", addAltS);
});

function addAltS(event: any) {
  if (
    (event.metaKey || event.ctrlKey) &&
    (event.key === "s" || event.code === "KeyS")
  ) {
    event.preventDefault(); // 阻止浏览器默认行为
    if (is_outer_read_mode.value) {
      window.$toast({ title: 'IntelliJ IDEA 接口无法保存，请同步到 AsyncTest 接口' })
    } else {
      save();
    }
  }
}
// 计算属性获取当前选中的标签值
const selectedStatusLabel = computed(() => {
  const selectedItem = testStatus.value.find(
    (item: any) => item.id === data.value.status
  );
  return selectedItem ? selectedItem.name : "";
});

function statusLabel(item: any) {
  return item.name;
}
// Responsor-------------------------------------------
function responsorLabel(item: any) {
  return item.username + "(" + item.nick_name + ")";
}
// 计算属性获取当前选中的标签值
const selectedResponsorLabel = computed(() => {
  const selectedItem: any = responsors.value.find(
    (item: any) => item.id === data.value.head
  );
  return selectedItem
    ? selectedItem.username + "(" + selectedItem.nick_name + ")"
    : "";
});

// marker-------------------------------------------

async function addMarker(value: any) {
  const has_marker = marker_list.value.filter((item: any) => {
    return item.name === value;
  });
  if (has_marker.length > 0) {
    return;
  } else {
    const _data = {
      name: value,
      project: route.params.project,
      type: 1,
    };
    ApiPostTag(_data).then((res: any) => {
      marker_list.value.unshift({
        id: res.id,
        name: value,
      });
      window.$toast({ title: "添加成功" })
    });
  }
}

function markerLabel(item: any) {
  return item.name;
}

function handelMethod(command: any) {
  data.value.method = command;
}

function clearUrl() {
  data.value.path = "";
}

const emit = defineEmits(['change_method'])

async function save() {
  if (is_outer_read_mode.value) {
    window.$toast({ title: 'IntelliJ IDEA 接口无法修改，请同步到普通接口' })
    return
  }
  const content = getChangedTopLevelFields(data.value, originalData);
  const response_content = getChangedTopLevelFields(
    responseOptions.value,
    originalResponse
  );
  isChange.value = false
  setupWatch();
  setupWatchResponse();
  enableWatch.value = true;
  emit("change_method", data.value.method)
  if (content === null && response_content === null) {
    GlobalState.sendMessage("clean_interface_change", {
      node_id: props.node_id,
    });
    window.$toast({ title: "接口内容已保存" })
    return;
  }
  let result = true;
  if (content !== null) {
    result = await updateInterface(content);
  }
  if (result === false) return;

  if (response_content !== null) {
    result = await updateResponse(response_content);
  }
  if (result === false) return;
  GlobalState.sendMessage("clean_interface_change", {
    node_id: props.node_id,
  });
  window.$toast({ title: "接口内容已保存" })
  return true
}

async function updateInterface(content: any) {
  content["id"] = props.interface_id;
  const _data = {
    type: 1,
    child_action_type: "update_interface",
    content: content,
  };
  return await ApiUpdateInterface(_data).then((res: any) => {
    if (result_check(res) === false) return false;
    if (content.hasOwnProperty("name")) {
      GlobalState.sendMessage("update_interface_name", {
        node_id: props.node_id,
        name: content.name,
      });
    }
    if (content.hasOwnProperty("method")) {
      GlobalState.sendMessage("update_interface_method", {
        node_id: props.node_id,
        method: content.method,
      });
    }
    originalData = _.cloneDeep(data.value);
    return true;
  });
}

async function updateResponse(content: any) {
  const _data = content;
  return await ApiUpdateResponse(_data).then((res: any) => {
    if (result_check(res) === false) return false;
    originalResponse = _.cloneDeep(responseOptions.value);
    return true;
  });
}

function result_check(data: any) {
  if (data.hasOwnProperty("result") && data.result === 0) {
    window.$toast({ title: data.data, type: 'error' })
    return false;
  }
  return true;
}

// 防抖检测变化（300ms内多次变化合并为一次）
const checkChanges = _.debounce(() => {
  const changes = getChangedTopLevelFields(data.value, originalData);
  if (changes) {
    // 触发自定义事件或调用回调，传递变化的字段
    console.log("数据变化，变化的字段:", Object.keys(changes));
    // 示例：emit('data-change', changes)
  }
}, 300);

const getChangedTopLevelFields = (data: any, original_data: any) => {
  const current = toRaw(data);
  const differences = deepDiff.diff(original_data, current);

  if (!differences) return null;

  const changedFields = new Set<string>();

  differences.forEach(({ path }: any) => {
    // 提取一级字段名（path[0]）
    // 示例：path = ['profile', 'age'] → 提取 'profile'
    if (path?.length > 0) {
      const topLevelField = path[0].toString();
      changedFields.add(topLevelField);
    }
  });

  if (changedFields.size === 0) return null;

  // 构建包含最新值的对象
  return Array.from(changedFields).reduce((acc, field) => {
    acc[field] = current[field]; // 直接取当前最新值
    return acc;
  }, {} as Record<string, unknown>);
};
</script>
<style lang="scss" scoped>
.doc-base-title-statement {
  color: gray;
  font-size: 0.9em;
  font-weight: 500;
  margin-top: 10px;
  ;
  margin-bottom: 5px;
}

.statement {
  overflow: hidden;
  position: relative;

  .collapse {
    padding-top: 10px;
    bottom: 0;
    left: 0;
    width: 100%;
    font-size: 0.9rem;
    cursor: pointer;
    background: linear-gradient(180deg, #fff0 0%, #fff 66.07%);

    .content {
      animation: blink 5s infinite;
      display: flex;
      width: 100%;
      justify-content: center;
      align-items: center;
      color: black;
    }
  }
}

@keyframes blink {

  0%,
  50%,
  100% {
    opacity: 1;
  }

  25%,
  75% {
    opacity: 0;
  }
}

.content-detail {
  overflow: auto;
}

.error-span {
  color: rgba(#f89898, 1);
}

.hover-menu-box {
  width: 1.4rem !important;
  height: 0.9rem !important;

  svg {
    width: 14px !important;
    height: 14px !important;
  }
}

.process-dialog-content {
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
    justify-content: space-between;
    flex-shrink: 0;
    align-items: center;
    flex-wrap: nowrap;
    border-bottom: 1px solid #f3f5f6;
  }
}

.body-tools {
  margin-top: 10px;
  ;
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
}

.auth-outside {
  border: 1px solid var(--border-color);
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  padding: 10px;
}

.switch-tab {
  display: flex;
  justify-content: start;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 10px;
  margin-left: 20px;
  gap: 5px;

  .active {
    background-color: black;
    color: white;
  }

  div {
    padding: 3px 10px;
    color: #667085;
    font-size: 14px;
    cursor: pointer;
    border-radius: 8px;
  }

  .active {
    background-color: black !important;
    color: white !important;
  }

  div:hover {
    background-color: rgba(16, 24, 40, 0.05);
  }
}

.url-inputer {
  padding: 10px 0px;
  border-top: 1px solid var(--border-color-light);
  border-bottom: 1px solid var(--border-color-light);
}

.typing-span {
  cursor: pointer;
}

.typing-span:hover {
  color: var(--primary);
}

.el-dropdown,
.method-btn,
.send-btn {
  width: 100%;
  height: 100%;
}

.method-btn {
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
}

.send-btn {
  border-radius: 0px 5px 5px 0px;
}

.el-tag {
  border: none;
  aspect-ratio: 1;
}

.custom-mini {
  width: 20px;
  height: 20px;
}

.custom-mini:hover {
  background-color: white;
  border-radius: 3px;
  cursor: pointer;
}

.coll-span {
  font-size: 1.1em;
  margin-left: 1%;
}

.ast-header-left {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 0 4px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0) 100%);
  border-radius: 4px;
}

.ast-block-icon {
  width: 4px !important;
  height: 18px !important;
  background: linear-gradient(180deg, #10b981 0%, #34d399 100%) !important;
  border-radius: 2px !important;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 2px 12px rgba(16, 185, 129, 0.4) !important;
  flex-shrink: 0;
  transform: scaleY(1.1);
}

.ast-label {
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #0a0a0a !important;
  letter-spacing: -0.01em !important;
  line-height: 1;
}

.section-separator {
  height: 40px;
  background: linear-gradient(180deg, transparent 0%, rgba(243, 244, 246, 0.8) 50%, transparent 100%);
  position: relative;
  margin-top: 20px;

  &::before {
    content: '';
    position: absolute;
    left: 4.16%;
    right: 4.16%;
    top: 50%;
    transform: translateY(-50%);
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(209, 213, 219, 0.4) 20%, rgba(209, 213, 219, 0.4) 80%, transparent 100%);
  }

  &::after {
    content: '···';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: rgba(156, 163, 175, 0.5);
    font-size: 20px;
    letter-spacing: 8px;
    background: white;
    padding: 0 16px;
    border-radius: 10px;
  }
}

.response-section {
  background: linear-gradient(180deg, rgba(249, 250, 251, 0.6) 0%, rgba(249, 250, 251, 0.3) 100px, transparent 200px);
  padding-top: 32px;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.02);
}
</style>

<style lang="scss">
.main-table {
  .cell {
    display: flex;
    align-items: center;
    padding-left: 12px;
    padding-right: 5px;
    width: 100%;

    >div {
      width: 100%;
    }
  }
}

.doc-base-title {
  color: gray;
  font-size: 0.9em;
  margin: 10px 0px !important;
  font-weight: 500;
}

.el-collapse-item__wrap,
.el-collapse {
  border: none;
}

/* .el-collapse-item__header {
  border: 2px dashed var(--el-color-primary);
  border-radius: 5px;
  border-color:var(--el-color-primary)!important;
  margin-bottom: 5px;
} */
.el-tabs--border-card>.el-tabs__header {
  background-color: #ffffff;
  border-radius: 5px;
}

.el-tabs__nav-wrap,
.el-tabs--border-card {
  border-radius: 5px;
}
</style>
