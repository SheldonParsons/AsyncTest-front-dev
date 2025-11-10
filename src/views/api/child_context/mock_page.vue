<template>
  <el-row style="padding-top:20px;border-top: 1px solid #f0f0f0;">
    <el-col :span="22" :offset="1"
      ><span style="font-size: 14px; font-weight: 500">Mock 请求</span></el-col
    >
  </el-row>
  <el-row>
    <el-col :span="22" :offset="1">
      <div style="margin-top: 20px">
        <el-divider></el-divider>
      </div>
    </el-col>
  </el-row>
  <el-row v-if="loading === false" style="margin-top: 20px">
    <el-col :span="22" :offset="1">
      <div class="body-tools">
        <div class="title">Mock接口列表 <el-divider direction="vertical" />{{ mock_domain }}</div>
        <div class="tools">
          <div @click="open_review_dialog">+新增Mock</div>
        </div>
      </div>
      <div class="private-table-outside">
        <el-table
          v-model:data="tableData"
          style="width: 100%"
          row-key="id"
          default-expand-all
          class="main-table"
        >
          <template #empty>
            <div v-if="loading">
              <Loading></Loading>
            </div>
            <SpecialButton v-else @click="open_review_dialog"
              >添加数据</SpecialButton
            >
          </template>
          <el-table-column label="响应来源" min-width="20%">
            <template #default="scope">
              <div
                class="g-ellipsis"
                v-show="scope.row.id !== current_mock?.id"
                style="font-size: 14px; font-weight: 500"
              >
                {{ get_response_name(scope.row.response) }}
              </div>
              <el-select
                v-show="scope.row.id === current_mock?.id"
                v-model="scope.row.response"
                filterable
                placeholder="响应来源"
                :empty-values="[null, undefined]"
                :value-on-clear="null"
                clearable
              >
                <el-option :key="null" label="暂不设置" :value="null" />
                <el-option
                  v-for="item in responses"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="请求方法" min-width="15%">
            <template #default="scope">
              <span
                v-show="scope.row.id !== current_mock?.id"
                :style="{
                  color: typingAttrMapping[scope.row.method]['color'],
                }"
                class="typing-span"
                style="cursor: default"
                >{{ scope.row.method.toUpperCase() }}</span
              >
              <el-select
                v-show="scope.row.id === current_mock?.id"
                v-model="scope.row.method"
                filterable
                placeholder="请求方法"
                :empty-values="[null, undefined]"
                :value-on-clear="null"
                clearable
              >
                <el-option
                  v-for="item in options"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="请求路径">
            <template #default="scope">
              <div
                class="path-div"
                @click="copy_url(mock_domain + scope.row.path)"
                style="font-size: 14px; font-weight: 500"
                v-show="scope.row.id !== current_mock?.id"
              >
                <span>{{ scope.row.path }}</span>
              </div>
              <div
                v-show="scope.row.id === current_mock?.id"
                class="core-value"
              >
                <div style="width: 100%">
                  <CodeMirror
                    :disableVar="true"
                    v-model="scope.row.path"
                    :enableNewLine="false"
                  ></CodeMirror>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="10%">
            <template #default="scope">
              <EditButton
                style="width: 1.5rem; height: 1.5rem"
                v-show="scope.row.id !== current_mock?.id"
                @click="edit_mock(scope.row, scope.$index)"
              ></EditButton>
              <div
                v-show="scope.row.id === current_mock?.id"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: start;
                  gap: 4px;
                "
              >
                <DoneButton @click="save(scope.row)"></DoneButton>
                <DeleteButton
                  @click="show_delete_notice(scope.row)"
                ></DeleteButton>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-col>
  </el-row>
  <el-row v-else style="margin-top: 20px">
    <el-col :span="22" :offset="1">
      <el-skeleton :rows="5" animated />
    </el-col>
  </el-row>
  <el-row style="margin-top: 20px">
    <el-col :span="22" :offset="1"
      ><span style="font-size: 14px; font-weight: 500">Mock 期望</span></el-col
    >
  </el-row>
  <el-row>
    <el-col :span="22" :offset="1">
      <div style="margin-top: 20px">
        <el-divider></el-divider>
      </div>
    </el-col>
  </el-row>
  <el-row
    v-if="loading === false"
    style="margin-top: 20px; margin-bottom: 170px"
  >
    <el-col :span="22" :offset="1">
      <div class="body-tools">
        <div class="title">条件过滤器</div>
        <div class="tools">
          <div @click="open_expct_drawer(false)">+新增期望</div>
        </div>
      </div>
      <div class="private-table-outside" style="overflow: hidden">
        <table
          style="
            width: 100%;
            overflow: hidden;
            table-layout: fixed;
            border-collapse: collapse;
          "
          class="expect-table"
        >
          <div
            v-if="expects.length == 0"
            style="
              height: 60px;
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 0.8rem;
            "
          >
            <SpecialButton @click="open_expct_drawer(false)"
              >添加数据</SpecialButton
            >
          </div>
          <draggable
            :list="expects"
            tag="tbody"
            item-key="id"
            handle=".drag-handle"
            :animation="200"
            @end="handleDragEnd"
            @start="handleDragStart"
            :class="{ 'disabled-style': isProcessing }"
          >
            <template #item="{ element, index }">
              <tr :key="element.id" class="expect-tr">
                <td style="width: 3%">
                  <div
                    style="
                      width: 100%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    "
                  >
                    <el-icon class="drag-handle" :size="16">
                      <Rank />
                    </el-icon>
                  </div>
                </td>
                <td style="width: 15%">
                  <div
                    style="font-size: 14px; font-weight: 500"
                    class="g-ellipsis"
                  >
                    {{ element.name }}
                  </div>
                </td>
                <td style="width: 67%; overflow: hidden">
                  <div style="display: flex; flex-direction: column; gap: 5px">
                    <div
                      class="g-ellipsis expect-item"
                      v-for="(item, index) in element.conditions"
                      :key="index"
                    >
                      <div>{{ positionMapping[item.position] }} 参数</div>
                      <div class="ex-expression">{{ item.expression }}</div>
                      <div>{{ operatorMapping[item.rule] }}</div>
                      <div class="ex-value g-ellipsis">{{ item.value }}</div>
                    </div>
                  </div>
                </td>
                <td style="width: 7%">
                  <div
                    style="
                      width: 100%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    "
                  >
                    <el-switch
                      class="script-action-switch"
                      v-model="element.enable"
                      @click.stop="change_expect_enable(element)"
                      size="small"
                    />
                  </div>
                </td>
                <td style="width: 7%">
                  <div
                    style="
                      width: 100%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    "
                  >
                    <EditButton
                      style="width: 1rem; height: 1rem"
                      @click="open_expct_drawer(true, element, index)"
                    ></EditButton>
                  </div>
                </td>
              </tr>
            </template>
          </draggable>
        </table>
      </div>
    </el-col>
  </el-row>
  <el-row v-else style="margin-top: 20px">
    <el-col :span="22" :offset="1">
      <el-skeleton :rows="5" animated />
    </el-col>
  </el-row>
  <el-dialog
    v-model="show_delete_comfirm_dialog"
    title="要删除Mock吗？"
    width="500"
    class="delete-dialog"
    style="padding: 20px"
  >
    <span>删除Mock后其他服务将无法访问该接口。</span>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="show_delete_comfirm_dialog = false">取消</el-button>
        <el-button type="primary" @click="delete_mock"> 确认 </el-button>
      </div>
    </template>
  </el-dialog>
  <el-drawer
    v-if="setting_drawer"
    v-model="setting_drawer"
    :show-close="false"
    class="drawer-mock-expect"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="drawer-header">
        <div class="drawer-header-title">
          <div class="close-btn" @click="close">
            <el-icon><CloseBold /></el-icon>
          </div>
          <div class="title-div">
            <div class="title-div-inner">
              {{ is_edit ? "修改" : "新建" }}Mock期望
              <div class="title-div-submit">
                <el-button @click="close">取消</el-button>
                <el-button
                  v-if="is_edit"
                  @click="delete_expect(close)"
                  type="danger"
                  >删除</el-button
                >
                <el-button @click="save_expect(close)" type="primary"
                  >保存</el-button
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div class="g-col-flex" style="gap: 20px">
      <div class="g-col-flex" style="gap: 5px">
        <div style="display: flex; justify-content: start; font-size: 14px">
          名称<span
            style="
              font-size: 20px;
              color: red;
              margin-left: 3px;
              margin-right: 3px;
            "
            >*</span
          >
        </div>
        <div><el-input v-model="expect_data.name"></el-input></div>
      </div>
      <div class="g-col-flex" style="gap: 5px">
        <div style="display: flex; justify-content: start; font-size: 14px">
          绑定Mock<el-popover
            class="box-item"
            title="关联Mock解释"
            placement="top"
            :width="350"
            trigger="click"
          >
            <div>1、设置该值后，该期望将只对该Mock请求生效</div>
            <div>2、否则，该期望将对当前接口下的所有Mock生效</div>
            <template #reference>
              <el-icon style="cursor: pointer"><InfoFilled /></el-icon>
            </template>
          </el-popover>
        </div>
        <div>
          <el-select
            v-model="expect_data.mock"
            filterable
            placeholder="绑定Mock"
            :empty-values="[null, undefined]"
            :value-on-clear="null"
            clearable
          >
            <el-option :key="null" label="暂不设置" :value="null"></el-option>
            <el-option
              v-for="item in tableData"
              :key="item.id"
              :label="mock_domain + item.path"
              :value="item.id"
            >
              <div class="flex items-center">
                <span>{{ mock_domain + item.path }}</span>
                <span
                  class="items-server"
                  :style="{
                    color: typingAttrMapping[item.method]['color'],
                  }"
                >
                  {{ item.method }}
                </span>
              </div>
            </el-option>
          </el-select>
        </div>
      </div>
      <div class="g-col-flex" style="gap: 10px">
        <div>
          <div class="body-tools">
            <div class="title">
              参数条件<el-divider direction="vertical" /><el-switch
                v-model="expect_data.logical"
                inline-prompt
                active-value="all"
                inactive-value="or"
                active-text="全部通过"
                inactive-text="其一通过"
              />
            </div>
            <div class="tools">
              <div @click="add_empty_rule">+新增条件</div>
            </div>
          </div>
          <div class="private-table-outside">
            <table
              style="
                width: 100%;
                overflow: hidden;
                table-layout: fixed;
                border-collapse: collapse;
              "
              class="expect-table"
            >
              <div
                v-if="expect_data.conditions.length == 0"
                style="
                  height: 60px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  font-size: 0.8rem;
                "
              >
                <SpecialButton @click="add_empty_rule">添加数据</SpecialButton>
              </div>
              <draggable
                :list="expect_data.conditions"
                tag="tbody"
                item-key="id"
                handle=".drag-handle"
                :animation="200"
              >
                <template #item="{ element, index }">
                  <tr :key="element.id" class="expect-tr-condition">
                    <td style="width: 3%">
                      <div
                        style="
                          width: 100%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                        "
                      >
                        <el-icon class="drag-handle" :size="16">
                          <Rank />
                        </el-icon>
                      </div>
                    </td>
                    <td style="width: 10%">
                      <el-select
                        v-model="element.position"
                        filterable
                        placeholder="参数位置"
                        :empty-values="[null, undefined]"
                        :value-on-clear="null"
                        clearable
                      >
                        <el-option
                          v-for="(value, key) in positionMapping"
                          :key="key"
                          :label="value"
                          :value="key"
                        />
                      </el-select>
                    </td>
                    <td style="width: 20%">
                      <div class="core-value">
                        <div style="width: 90%">
                          <CodeMirror
                            :disableVar="true"
                            v-model="element.expression"
                            :enableNewLine="false"
                          ></CodeMirror>
                        </div>
                        <div
                          style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                          "
                        >
                          <el-popover
                            class="box-item"
                            title="参数值"
                            placement="top"
                            :width="500"
                            trigger="click"
                            effect="customized"
                          >
                            <div
                              style="
                                width: 100%;
                                border-top: 1px solid var(--border-color);
                                padding-top: 10px;
                                display: flex;
                                flex-direction: column;
                                gap: 5px;
                              "
                            >
                              <div>
                                1、当参数为Query、Header时，该值为参数的Key
                              </div>
                              <div>
                                2、当参数为Path时，该值为变量名，例如:/api/{user_id}/，可填入变量名:user_id
                              </div>
                              <div>
                                3、当参数为Body时，请填写Jsonpath表达式，如果为非Json字符串，可填写
                                all 来选取所有内容
                              </div>
                            </div>
                            <template #reference>
                              <el-icon style="cursor: pointer"
                                ><InfoFilled
                              /></el-icon>
                            </template>
                          </el-popover>
                        </div>
                      </div>
                    </td>
                    <td style="width: 15%; overflow: hidden">
                      <el-select
                        v-model="element.rule"
                        filterable
                        placeholder="比较"
                        :empty-values="[null, undefined]"
                        :value-on-clear="null"
                        clearable
                      >
                        <el-option
                          v-for="(value, key) in operatorMapping"
                          :key="key"
                          :label="value"
                          :value="key"
                        />
                      </el-select>
                    </td>
                    <td style="width: 20%">
                      <div class="core-value">
                        <div style="width: 100%">
                          <CodeMirror
                            :disableVar="true"
                            v-model="element.value"
                            :enableNewLine="false"
                          ></CodeMirror>
                        </div>
                      </div>
                    </td>
                    <td style="width: 5%">
                      <div
                        style="
                          width: 100%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                        "
                      >
                        <el-switch
                          class="script-action-switch"
                          v-model="element.enable"
                          @click.stop
                          size="small"
                        />
                      </div>
                    </td>
                    <td style="width: 5%">
                      <DeleteButton
                        style="width: 1rem; height: 1rem"
                        @click="delete_mock_expect(index)"
                      ></DeleteButton>
                    </td>
                  </tr>
                </template>
              </draggable>
            </table>
          </div>
        </div>
      </div>
      <div style="font-size: 14px; font-weight: 500">响应设置</div>
      <div>
        <div class="tab-core g-unselect">
          <div style="display: flex; gap: 5px; font-size: 14px; width: 100%">
            <div
              :class="{ 'active-tab': active_res_tab === 0 }"
              @click="active_res_tab = 0"
              class="un-active-tab"
            >
              <span>Body</span>
            </div>
            <div
              :class="{ 'active-tab': active_res_tab === 1 }"
              @click="active_res_tab = 1"
              class="un-active-tab"
            >
              <span>Headers</span>
            </div>
            <div
              :class="{ 'active-tab': active_res_tab === 2 }"
              @click="active_res_tab = 2"
              class="un-active-tab"
            >
              <span>更多设置</span>
            </div>
          </div>
        </div>
        <div>
          <Headers
            v-if="active_res_tab === 1"
            :canVar="false"
            :tableData="expect_data.headers"
          ></Headers>
          <div style="margin-top: 20px">
            <RawBody
              v-if="active_res_tab === 0"
              :code="expect_data.body"
              :showPreView="true"
              :showVariable="false"
              @update="change_raw_body"
            ></RawBody>
          </div>
          <div v-if="active_res_tab === 2">
            <div class="g-col-flex" style="gap: 20px">
              <div style="display: flex; align-items: center; gap: 10px">
                <div class="info-select">
                  <div class="info-select-left">
                    响应码<span
                      style="
                        font-size: 20px;
                        color: red;
                        margin-left: 3px;
                        margin-right: 3px;
                      "
                      >*</span
                    >
                  </div>
                  <div class="info-select-right">
                    <el-dropdown @command="handleStatusCommand" trigger="click">
                      <el-input
                        v-model="expect_data.status"
                        type="number"
                        maxlength="3"
                      ></el-input>
                      <template #dropdown>
                        <el-dropdown-menu class="response-status-dropdown">
                          <el-dropdown-item
                            v-for="([code, message], index) in Object.entries(
                              GlobalStatus.regular_response_status_map()
                            )"
                            :command="code"
                          >
                            <div
                              style="
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 5px;
                              "
                            >
                              <div>{{ code }}</div>
                              <div>{{ message }}</div>
                            </div>
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px">
                <div>
                  <el-input
                    type="number"
                    v-model="expect_data.delay"
                    placeholder="延迟时间"
                  >
                    <template #prepend
                      >响应延迟<span
                        style="
                          font-size: 20px;
                          color: red;
                          margin-left: 3px;
                          margin-right: 3px;
                        "
                        >*</span
                      ></template
                    >
                    <template #append>毫秒</template>
                  </el-input>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, toRefs, getCurrentInstance, onMounted, toRaw } from "vue";
import { useRoute } from "vue-router";
import Loading from "@/views/api/child_component/params_child/comp/loading.vue";
import CodeMirror from "@/views/api/child_context/code_mirror.vue";
import SpecialButton from "@/components/common/button/special_button.vue";
import EditButton from "@/assets/svg/common/edit_btn.vue";
import DoneButton from "@/assets/svg/common/done_btn.vue";
import DeleteButton from "@/assets/svg/common/delete_btn.vue";
import useClipboard from "vue-clipboard3/dist/esm/index.js";
import { InfoFilled } from "@element-plus/icons-vue";
import Headers from "./req/headers.vue";
import RawBody from "@/views/api/child_context/req/body_child/raw_body.vue";
import GlobalStatus from "@/global";
import tools from "@/utils/tools";
import draggable from "vuedraggable";
import {
  ApiGetResponse,
  ApiPostMock,
  ApiGetMock,
  ApiUpdateMock,
  ApiDeleteMock,
  ApiGetMockExpect,
  ApiGetMockExpectSingle,
  ApiPostMockExpect,
  ApiUpdateMockExpect,
  ApiDeleteMockExpect,
  ApiPostStaticInfo,
  ApiUpdateMockExpectPriority,
} from "@/api/interface/index";
import _ from "lodash";
const route = useRoute();
const { proxy }: any = getCurrentInstance();
const tableData: any = ref([]);
const loading = ref(true);
const current_mock: any = ref(null);
const current_mock_index: any = ref(-1);
const show_delete_comfirm_dialog = ref(false);
const responses: any = ref({});
const expects: any = ref([]);
const setting_drawer = ref(false);
const is_edit = ref(false);
const expect_data: any = ref(null);
const active_res_tab = ref(1);
const isProcessing = ref(false);
const current_mock_type = ref("add");
const original_mock_expect: any = ref(null);
const mock_domain = ref("");

onMounted(async () => {
  await get_system_info();
  await interface_get_responses();
  const mock_data = {
    interface: props.interface_id,
  };
  await ApiGetMock(mock_data).then((res: any) => {
    console.log(res);
    tableData.value = res;
  });
  await interface_get_expects();
  loading.value = false;
});
const props = defineProps({
  interface_id: {
    type: Number,
    default: null,
  },
});

async function get_system_info() {
  const _data = {
    keys: ["mock_server_host", "mock_prefix"],
  };
  ApiPostStaticInfo(_data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      let mock_server_host = ""
      let mock_prefix = ""
      console.log(res);
      res.forEach((item:any) => {
        if (item.key === "mock_server_host") {
          mock_server_host = item.value
        }
        if (item.key === "mock_prefix") {
          mock_prefix = item.value
        }
      })
      mock_domain.value = "http://" + mock_server_host + mock_prefix
    } else {
      return checking;
    }
  });
}

async function interface_get_responses() {
  const _data = {
    interface: props.interface_id,
    simple: true,
  };
  await ApiGetResponse(_data).then((res: any) => {
    responses.value = res;
  });
}

function handleStatusCommand(command: string | number | object) {
  expect_data.value.status = command;
}

function delete_expect(close: any) {
  ApiDeleteMockExpect(expect_data.value.id).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      expects.value = expects.value.filter((item: any) => {
        return item.id !== expect_data.value.id;
      });
      close();
      tools.message("删除成功", proxy, "success");
    } else {
      return checking;
    }
  });
}

function change_expect_enable(expect:any) {
  const _data = {
    enable: expect.enable,
  }
  ApiUpdateMockExpect(expect.id,_data).then((res: any) => {
    if (expect.enable === true) {
      tools.message("期望已启用", proxy, "success");
    } else {
      tools.message("期望已禁用", proxy, "success");
    }
  })
}

// 处理拖拽结束事件
const handleDragEnd = (evt: { oldIndex: number; newIndex: number }) => {
  if (expects.value.length === 1) {
    return
  }
  const ordered_ids = expects.value.map((item: any) => item.id);
  console.log(ordered_ids);
  const _data = {
    priority_list: ordered_ids
  }
  ApiUpdateMockExpectPriority(_data).then((res: any) => {
    isProcessing.value = false;
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      tools.message("已更新排序", proxy, "success");
      original_mock_expect.value = null
    } else {
      expects.value = original_mock_expect.value;
    }
  })
};

function handleDragStart() {
  if (expects.value.length === 1) {
    return
  }
  original_mock_expect.value = _.cloneDeep(expects.value);
  isProcessing.value = true;
}

function get_expect_origin_data() {
  return {
    project: route.params.project,
    interface: props.interface_id,
    mock: null,
    name: "",
    enable: true,
    conditions: [],
    logical: "all",
    headers: [
      {
        id: getRandomInt(1000000, 9999999),
        name: "Content-Type",
        t: "string",
        default: "application/json",
        statement: "内容格式类型",
      },
    ],
    body: "",
    status: 200,
    delay: 0,
  };
}

function get_rule_origin_data() {
  return {
    enable: true,
    position: "query",
    expression: "",
    rule: "eq",
    value: "",
  };
}
function add_empty_rule() {
  expect_data.value.conditions.push(get_rule_origin_data());
}

async function interface_get_expects() {
  const _data = {
    interface: props.interface_id,
  };
  await ApiGetMockExpect(_data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      expects.value = res;
    } else {
      return checking;
    }
  });
}

async function interface_get_single_expect(id: number) {
  return await ApiGetMockExpectSingle(id).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

const options = [
  {
    value: "get",
    label: "GET",
  },
  {
    value: "post",
    label: "POST",
  },
  {
    value: "put",
    label: "PUT",
  },
  {
    value: "delete",
    label: "DELETE",
  },
  {
    value: "patch",
    label: "PATCH",
  },
];

const positionMapping: any = {
  query: "Query",
  header: "Header",
  body: "Body",
  path: "Path",
};

const operatorMapping: any = {
  eq: "等于",
  neq: "不等于",
  gt: "大于",
  gte: "大于或等于",
  lt: "小于",
  lte: "小于或等于",
  contains: "包含",
  notContains: "不包含",
  regex: "正则匹配",
  exists: "存在",
  notExists: "不存在",
};

const typingAttrMapping: any = GlobalStatus.regular_reqeust_method_info_map();
function open_review_dialog() {
  current_mock_type.value = "add";
  if (current_mock.value !== null) {
    tools.message("请先保存当前编辑中的Mock", proxy);
    return;
  }
  addData();
}

function change_raw_body(value: string) {
  expect_data.value.body = value;
}

function delete_mock_expect(index: number) {
  expect_data.value.conditions.splice(index, 1);
}

async function open_expct_drawer(
  isEdit: boolean,
  row: any = null,
  index: number = -1
) {
  is_edit.value = isEdit;
  if (isEdit === false) {
    expect_data.value = get_expect_origin_data();
  } else {
    tools.message("正在获取期望信息", proxy, "info");
    const res = await interface_get_single_expect(row.id);
    if (res === false) return;
    expect_data.value = res;
    original_mock_expect.value = _.cloneDeep(res);
    expects.value[index] = expect_data.value
    tools.message("获取成功", proxy, "info");
  }
  setting_drawer.value = true;
}

function handleSourceChange(row: any) {
  const result = responses.value.filter((item: any) => {
    return item.id === row.source;
  });
  if (result.length === 0) {
    row.source = null;
  }
}

function get_response_name(id: number) {
  const result = responses.value.filter((item: any) => {
    return item.id === id;
  });
  if (result.length === 0) {
    return "未设置";
  } else {
    return result[0].name;
  }
}

function edit_mock(row: any, index: number) {
  if (current_mock.value !== null) {
    tools.message("请先保存当前编辑中的Mock", proxy);
    return;
  }
  current_mock.value = row;
  current_mock_index.value = index;
  current_mock_type.value = "edit";
}
async function copy_url(path: string) {
  const { toClipboard } = useClipboard();
  await toClipboard(path);
  tools.message("已复制", proxy, "success");
}
async function save_expect(close: any) {
  if (is_edit.value === false) {
    const res = await create_expect(expect_data.value);
    if (res === false) return;
    expect_data.value.id = res.id;
    expects.value.unshift(res);
    window.$toast({title:'创建成功', type:'success'})
  } else {
    const differences_content = tools.getChangedTopLevelFields(
      expect_data.value,
      original_mock_expect.value,
      toRaw
    );
    const res = await update_expect(expect_data.value.id, differences_content);
    if (res === false) return;
    original_mock_expect.value = _.cloneDeep(expect_data.value);
    tools.message("更新成功", proxy, "success");
  }
  close();
}

async function update_expect(id: number, differences_content: any) {
  return await ApiUpdateMockExpect(id, differences_content).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

async function create_expect(data: any) {
  return await ApiPostMockExpect(data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}
async function save(row: any) {
  if (current_mock_type.value === "add") {
    const _data = {
      project: route.params.project,
      interface: props.interface_id,
      response: row.response,
      path: row.path.startsWith("/") ? row.path : "/" + row.path,
      method: row.method,
    };
    const res = await add_mock(_data);
    if (res === false) return;
    row.id = res.id;
    row.path = row.path.startsWith("/") ? row.path : "/" + row.path;
    tools.message("添加成功", proxy, "success");
  } else if (current_mock_type.value === "edit") {
    const _data = {
      response: row.response,
      path: row.path.startsWith("/") ? row.path : "/" + row.path,
      method: row.method,
    };
    const res = await edit_mock_send(row.id, _data);
    if (res === false) return;
    row.path = row.path.startsWith("/") ? row.path : "/" + row.path;
    tools.message("修改成功", proxy, "success");
  }
  clean_mock_status();
}

async function edit_mock_send(id: number, data: any) {
  return await ApiUpdateMock(id, data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

async function add_mock(data: any) {
  return await ApiPostMock(data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

async function delete_mock_send(id: number) {
  return await ApiDeleteMock(id).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

function show_delete_notice(row: any) {
  if (current_mock_type.value === "add") {
    tableData.value.splice(current_mock_index.value, 1);
    clean_mock_status();
    return;
  }
  show_delete_comfirm_dialog.value = true;
}

async function delete_mock() {
  if (current_mock_type.value === "edit") {
    const res = await delete_mock_send(current_mock.value.id);
    if (res === false) return;
    tools.message("删除成功", proxy, "success");
  }
  tableData.value.splice(current_mock_index.value, 1);
  show_delete_comfirm_dialog.value = false;
  clean_mock_status();
}

async function addData() {
  const emptyNode = {
    id: getRandomInt(1000000, 9999999),
    project: route.params.project,
    interface: props.interface_id,
    response: null,
    method: "get",
    path: "/",
  };
  tableData.value.push(emptyNode);
  current_mock.value = tableData.value[tableData.value.length - 1];
  current_mock_index.value = tableData.value.length - 1;
}

function clean_mock_status() {
  current_mock.value = null;
  current_mock_index.value = -1;
}

function getRandomInt(min: any, max: any) {
  min = Math.ceil(min); // 确保min是整数
  max = Math.floor(max); // 确保max是整数
  return Math.floor(Math.random() * (max - min + 1)) + min; // 返回介于min和max之间的整数
}
</script>

<style lang="scss" scoped>
.disabled-style {
  opacity: 0.8;
  .drag-handle {
    cursor: not-allowed;
    pointer-events: none; /* 禁止交互但保留元素 */
  }
}
.expect-tr:hover {
  background-color: #f5f7fa;
}
.expect-tr {
  cursor: default;
}
.expect-tr-condition:hover {
  background-color: #f5f7fa;
}
.expect-tr-condition td {
  padding: 5px;
}
.expect-table {
  border-radius: 8px;
  tr:not(:last-child) {
    border-bottom: 1px solid var(--border-color-light);
  }
  tbody {
    border-radius: 8px;
  }
}
.drag-handle {
  cursor: move;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.drag-handle:hover {
  opacity: 1;
}

/* 必须添加的拖拽样式 */
:deep(.sortable-ghost) {
  opacity: 0.5;
  background: #f0f7ff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.tab-core {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  border-bottom: 1px solid var(--border-color);
  div {
    cursor: pointer;
    // padding-bottom: 5px;
    span {
      padding: 3px 10px;
    }
    span:hover {
      background-color: var(--hover-bg);
      border-radius: 8px;
    }
    .response-name-status {
      padding: 3px 10px;
    }
    .response-name-status:hover {
      background-color: var(--hover-bg);
      border-radius: 8px;
    }
  }
  .active-tab {
    font-weight: 500;
    border-bottom: 2px solid black !important;
    padding-bottom: 5px;
  }
  .un-active-tab {
    border-bottom: 2px solid transparent;
    padding-bottom: 5px;
  }
}
.script-action-switch {
  display: flex;
  justify-content: end;
}
.expect-item {
  display: flex;
  justify-content: start;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
}
.expect-item .ex-expression,
.expect-item .ex-value {
  background-color: var(--default-bg);
  border-radius: 4px;
  padding: 0px 4px;
  margin: 0px 4px;
}
.path-div {
  cursor: pointer;
  span:hover {
    text-decoration: underline dashed;
  }
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
.root-icon {
  display: flex;
  span {
    cursor: pointer;
    padding: 0px 3px;
    height: 20px;
    border-radius: 4px;
    font-size: 13px;
    background-color: var(--dark);
    color: white;
    display: flex;
    align-items: center;
  }
}
.core-value {
  display: flex;
  justify-content: start;
  align-items: center;
  gap: 4px;
  .array-item:not(:first-child) {
    margin-top: 5px;
  }
  .array-item {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
  }
}
.private-input {
  margin: 0;
  padding: 5px;
  border: none;
  border: 1px solid transparent;
  outline: none;
  background-color: transparent;
  font-size: 14px;
  width: 100%;
  border-radius: 8px;
  transition: border-color 0.3s ease, color 0.3s ease;
}
.private-input:hover,
.private-input:focus {
  color: var(--primary);
  border: 1px solid var(--border-color) !important;
  background-color: white;
}
.private-deafult {
  cursor: not-allowed;
  font-size: 15px;
  font-weight: 600;
  color: var(--primary);
}
.typing-span {
  cursor: pointer;
  display: flex;
  justify-self: center;
  align-items: center;
  height: 20px;
  font-size: 14px;
  font-weight: 600;
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
.action-icon {
  cursor: pointer;
}
.action-icon-close {
  margin-left: 3px;
}

.drawer-header {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color-light);
  .drawer-header-title {
    flex: 1;
    align-items: center;
    gap: 8px;
    min-width: 0;
    min-height: 0;
    display: flex;
    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5px;
      border-radius: 4px;
      cursor: pointer;
    }
    .title-div {
      display: flex;
      align-items: center;
      width: 100%;
      .title-div-inner {
        display: flex;
        flex: auto;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        font-size: 16px;
        font-weight: 500;
        color: black;
        .title-div-submit {
          box-sizing: border-box;
          flex: 1;
          display: flex;
          justify-content: end;
        }
      }
    }
  }
}
</style>

<style lang="scss">
.drawer-mock-expect {
  width: 60% !important;
}

.el-popover {
  padding: 10px 10px !important;
  border-radius: 10px !important;
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
.info-select {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  .info-select-left {
    padding: 0 20px;
    background-color: #f5f7fa;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #909399;
    border-radius: 4px 0px 0px 4px;
    border: 1px solid #dcdfe6;
    border-right: none;
  }
  .info-select-right {
    flex: 85;
    .el-input__wrapper {
      height: 28px !important;
      border-radius: 0px 4px 4px 0px !important;
    }
  }
}
</style>
