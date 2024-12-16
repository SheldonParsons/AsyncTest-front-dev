<template>
  <el-row class="search">
    <el-affix
      position="top"
      :offset="1"
      :style="{ width: searchWidth + '%' }"
      @change="onSearchChange"
    >
      <el-col :offset="2" :span="searchInputWidth" class="search-col">
        <SpecialInput
          v-model="search"
          @input="searching"
          placeholder="搜索数据 范围：文档名称"
          @clearData="clearDataFromSearch"
        ></SpecialInput>
      </el-col>
    </el-affix>
  </el-row>
  <el-row
    class="main-data"
    v-if="d.list.length > 0"
    style="margin-bottom: 100px"
  >
    <el-col :offset="2" :span="20">
      <table
        class="styled-table"
        v-infinite-scroll="getData"
        :infinite-scroll-disabled="disInfinite"
      >
        <thead>
          <tr>
            <th colspan="6" style="text-align: start">文档列表</th>
            <th colspan="2" style="text-align: end; display: flex">
              <div
                class="card-main add-app g-unselect"
                @click="callbackTesting"
              >
                召回测试
              </div>
              <div
                @click="enter_create_document_list"
                class="card-main-create add-app g-unselect"
              >
                新增文档
              </div>
            </th>
          </tr>
          <tr>
            <th class="disappear-auto">#</th>
            <th>文档名</th>
            <th>字符数</th>
            <th>片段数</th>
            <th>召回次数</th>
            <th>状态</th>
            <th>上传时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <transition-group name="fade" appear>
            <tr
              v-for="(item, index) in d.list"
              :key="index"
              style="cursor: pointer"
            >
              <td class="active-row disappear-auto method-td">
                {{ item.position }}
              </td>
              <td
                @click="go_to_segment(item)"
                class="active-row copy-instance long-td"
                style="width: 40%"
              >
                {{ item.name }}
              </td>
              <td class="active-row long-td" style="width: 10%">
                <div>{{ item.char_count }}</div>
              </td>
              <td class="active-row long-td" style="width: 10%">
                <div>{{ item.segment_count }}</div>
              </td>
              <td class="active-row long-td" style="width: 15%">
                <div>{{ item.hit_count }}</div>
              </td>
              <td style="width: 10%">
                <div class="action-td action-view abandom">
                  <div
                    :class="{ point: true, 'point-green': item.enabled }"
                  ></div>
                  {{ item.enabled ? "已启用" : "已禁用" }}
                </div>
              </td>
              <td style="width: 20%">
                <div class="action-td action-view">
                  {{ formatDate(item.add_time) }}
                </div>
              </td>

              <td>
                <div
                  style="
                    display: flex;
                    justify-content: start;
                    align-items: center;
                  "
                >
                  <div class="action-td action-view">
                    <el-switch
                      v-model="item.enabled"
                      @change="changeDocumentStatus(item)"
                    />
                  </div>
                  <el-divider direction="vertical" />
                  <el-dropdown>
                    <el-icon class="more-icon"><MoreFilled /></el-icon>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="renameDocument(item)"
                          ><span>重命名</span></el-dropdown-item
                        >
                        <el-dropdown-item @click="deleteDocument(item)"
                          ><span style="color: brown"
                            >删除</span
                          ></el-dropdown-item
                        >
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </td>
            </tr>
          </transition-group>
        </tbody>
      </table>
    </el-col>
  </el-row>
  <el-empty v-else></el-empty>
  <Callback></Callback>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="renameDialog"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>重命名</span>
      </div>
    </template>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <el-input v-model="document_rename"></el-input>
      </el-col>
    </el-row>
    <template #footer>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="renameDialog = false">取消</el-button>
        <el-button type="primary" @click="renameDocumentAction">
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="deleteDialog"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>要删除该文档吗？</span>
      </div>
    </template>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <span
          >删除文档后，知识库/向量数据库将无法检索到该文档，如需暂时关闭该文档的检索，可以选择禁用功能。</span
        >
      </el-col>
    </el-row>
    <template #footer>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="deleteDialog = false">取消</el-button>
        <el-button type="primary" @click="deleteDocumentAction">
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, getCurrentInstance, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  getSingleKnowleageList,
  editDocumentStatus,
  editDocument,
  deleteDocumentApi,
} from "@/api/ai/index";
import { getDocumentList } from "@/api/ai/index";
import SpecialInput from "@/components/common/input/specialInput.vue";
import Callback from "./call_back.vue";
import tools from "@/utils/tools";
import { useI18n } from "vue-i18n";
import _ from "lodash";
import { state } from "@/state";
const router: any = useRouter();
const knowledge: any = ref({});
const route = useRoute();
const renameDialog = ref(false);
const deleteDialog = ref(false);
const current_document: any = ref({});
const document_rename = ref("");
const changing = ref(false);

onMounted(async () => {
  await getData();
  const knowledge_id = Number(route.params.knowledge);
  getSingleKnowleageList(knowledge_id, {}).then((res) => {
    knowledge.value = res;
    const params = {
      project: Number(route.params.project),
      knowledge: knowledge.value.id,
    };
    emit("go_to_document", knowledge.value.name, params, "knowledge");
    console.log(d.list);
  });
});

watch(
  () => renameDialog,
  (val) => {
    document_rename.value = "";
  }
);

function changeDocumentStatus(item: any) {
  if (changing.value) {
    tools.message("正在修改状态，请稍后", proxy);
    item.enabled = !item.enabled;
    return;
  }
  changing.value = true;
  editDocumentStatus(item.id, {}).then((res: any) => {
    if (!res.result) {
      item.enabled = !item.enabled;
      tools.message(res.msg, proxy);
    }
    changing.value = false;
  });
}

function renameDocument(item: any) {
  renameDialog.value = true;
  current_document.value = item;
}

function deleteDocument(item: any) {
  deleteDialog.value = true;
  current_document.value = item;
}

function renameDocumentAction() {
  const data = {
    name: document_rename.value,
  };
  editDocument(current_document.value.id, data).then((res: any) => {
    tools.message("修改成功", proxy);
    renameDialog.value = false;
    clearDataFromSearch();
  });
}
function deleteDocumentAction() {
  deleteDocumentApi(current_document.value.id, {}).then((res: any) => {
    tools.message(res.msg, proxy);
    deleteDialog.value = false;
    clearDataFromSearch();
  });
}

const _status = ref(true);
// 数据主体！！！
const d = reactive({
  list: [] as any,
});

// 搜索输入框动态数据
const search = ref("");
const searchWidth = ref("100");
// 永久禁止无限滚动
const alwaysDisInfinite = ref(false);
// 搜索输入框是否触顶
const isSearchEleOnTop = ref(false);
// 搜索输入框栅格宽度
const searchInputWidth = ref(20);
// 当前页码
const currentPage = ref(1);
// 当前页码大小
const currentPageSize = ref(10);
// 是否禁用无限滚动
const disInfinite = ref(false);
const project_id = ref(0);
const { t } = useI18n();
// 全局对象
const { proxy }: any = getCurrentInstance();
const emit = defineEmits(["go_to_document"]);

function callbackTesting() {
  state.setMessage("callbackTesting" + Math.random().toString());
}

function enter_create_document_list() {
  const params = {
    project: Number(route.params.project),
    knowledge: Number(route.params.knowledge),
  };
  router.push({ name: "ai_knowledge_createdocument", params });
}
function go_to_segment(item: any) {
  const params = {
    project: Number(route.params.project),
    knowledge: Number(route.params.knowledge),
    document: item.id,
  };
  router.push({ name: "ai_knowledge_document_segment", params });
}

function formatDate(isoString: any) {
  const date = new Date(isoString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份从0开始，需加1
  const day = String(date.getDate()).padStart(2, "0");

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 清除输入框动作回调函数
function clearDataFromSearch(): void {
  // 重置搜索前置变量
  clearString();
  // 清空数据
  clearData();
  // 重新获取数据
  getData();
}

// 重置搜索前置变量
function clearString(): void {
  // 重置输入框内容
  search.value = "";
  clearPageInfo();
  clearInfinite();
}

// 重置分页信息
function clearPageInfo(): void {
  // 重置页码
  currentPage.value = 1;
  // 重置分页大小
  currentPageSize.value = 10;
}

// 重置无限滚动
function clearInfinite() {
  // 重置永久禁止循环
  alwaysDisInfinite.value = false;
  // 重置无限滚动
  disInfinite.value = false;
}

// 搜索data，防抖
const searching = _.debounce(
  function (e) {
    clearData();
    clearInfinite();
    clearPageInfo();
    getData();
  },
  500,
  { maxWait: 1500 }
);

function clearData() {
  d.list = [];
}

// 切换无限滚动
function switchInfiniteScroll() {
  if (alwaysDisInfinite.value) {
    disInfinite.value = true;
    return;
  }
  disInfinite.value = !disInfinite.value;
}

async function getProviderListAction(
  page: number,
  size: number,
  dataset: number,
  mixins: any
) {
  const data = {
    page,
    size,
    dataset,
    mixins,
  };
  return getDocumentList(data).then((res: any) => {
    console.log(res);

    if (res.detail || res.results.length === 0) {
      tools.message(t("response.lessData"), proxy);
      alwaysDisInfinite.value = true;
      return false;
    }
    return res.results;
  });
}

watch(
  () => state.message,
  (val) => {
    if (val.indexOf("adddocument") != -1) {
      enter_create_document_list();
    }
  }
);

// 增加数据
async function getData() {
  switchInfiniteScroll();
  const res = await getProviderListAction(
    currentPage.value,
    currentPageSize.value,
    Number(route.params.knowledge),
    search.value
  );
  if (!res) {
    switchInfiniteScroll();
    return;
  }

  let pushCount = 0;
  // 刻意延迟，表现过度效果
  const timer = setInterval(() => {
    d.list.push(res[pushCount]);
    pushCount += 1;
    if (pushCount === res.length) {
      clearInterval(timer);
      switchInfiniteScroll();
    }
  }, 50);

  currentPage.value += currentPageSize.value / 10;
}

// 搜索框固定触顶状态改变回调函数
function onSearchChange(item: any): void {
  if (isSearchEleOnTop.value !== item) {
    searchInputWidth.value = searchInputWidth.value === 13 ? 20 : 13;
  }
  if (item) {
    searchWidth.value = "80";
  } else {
    searchWidth.value = "100";
  }
  isSearchEleOnTop.value = item;
}
</script>

<style lang="scss" scoped>
.my-header {
  padding: 20px;
  padding-bottom: 0px;
  span {
    font-size: 16px;
    font-weight: 600;
  }
}
.search {
  padding-top: 30px;
  // z-index: 900;
}
.search-col {
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
}
.main-data {
  padding-top: 20px;
}

.styled-table {
  border-radius: 10px;
  // border-top: 2px solid var(--global-theme-color);
  border-collapse: collapse;
  margin: 25px 0;
  font-size: 0.9em;
  width: 100%;
  // border-radius: 5px 5px 0px 0px;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
  .action-td {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  }
  .desc-td {
    width: 5%;
  }
  .long-td {
    // width: 300px;
  }
  .method-td {
    min-width: 65px;
  }
  .long-td div {
    // width: 30vw;
    // max-width: 300px;
    overflow: hidden;
    word-break: break-all;
    text-overflow: ellipsis;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    white-space: nowrap;
    margin: 0;
    font-size: 16px;
  }
  .desc-td div {
    width: 10vw;
    overflow: hidden;
    word-break: break-all;
    text-overflow: ellipsis;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    white-space: nowrap;
    margin: 0;
    cursor: default;
    font-size: 14px;
  }
}

.styled-table thead tr {
  text-align: left;
  color: black;
  border-bottom: 1px solid #e6e6e6;
}

.styled-table th,
.styled-table td {
  padding: 12px 15px;
}

.styled-table tbody tr {
  // border-bottom: 1px solid #dddddd;
}

.styled-table tbody tr:nth-of-type(even) {
  background-color: #f3f3f3;
}

.styled-table tbody tr td.active-row {
  font-weight: bold;
  color: var(--method-color);
}

.disappear-auto {
  .desc {
    max-width: 20vw;
    text-align: center;
    font-size: 15px;
  }
  @media screen and (max-width: 880px) {
    display: none;
  }
}

.add-app {
  font-size: 14px;
  height: 30px;
  border-radius: 10px;
  background-color: black;
  cursor: pointer;
}

.card-main:hover {
  --tw-ring-opacity: 1;
  --tw-ring-color: black;
}

.card-main {
  --tw-ring-opacity: 1;
  --tw-ring-color: var(--greyLight-4);
  width: 80px;
  --tw-ring-inset: ;
  --tw-ring-color: var(--greyLight-4);
  --tw-ring-offset-width: 3px;
  --tw-ring-offset-color: #fff;
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
    calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  --tw-shadow: 0 0 #0000;
  background-color: black;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  border: 2px solid #e5e7eb;
  margin: 5px;
  --tw-ring-offset-shadow: 0 0 0 var(--tw-ring-offset-width)
    var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
    calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow),
    var(--tw-shadow, 0 0 #0000);
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 0.15s;
}

.card-main-create:hover {
  --tw-ring-opacity: 1;
  --tw-ring-color: black;
  background-color: white;
  color: black;
  border: 2px solid black;
}

.card-main-create {
  --tw-ring-opacity: 1;
  --tw-ring-color: var(--greyLight-4);
  width: 80px;
  --tw-ring-inset: ;
  --tw-ring-color: var(--greyLight-4);
  --tw-ring-offset-width: 3px;
  --tw-ring-offset-color: #fff;
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
    calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  --tw-shadow: 0 0 #0000;
  background-color: var(--el-color-primary);
  color: var(--white);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  border: 2px solid var(--primary-dark);
  margin: 5px;
  --tw-ring-offset-shadow: 0 0 0 var(--tw-ring-offset-width)
    var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
    calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow),
    var(--tw-shadow, 0 0 var(--el-color-primary));
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 0.15s;
}
.abandom {
  display: flex;
  align-items: center;
  .point-green {
    background-color: var(--el-color-primary) !important;
  }

  .point {
    width: 10px;
    height: 10px;
    background-color: #e5e7eb;
    border: 2px solid var(--dark);
    border-radius: 5px;
    margin-right: 3px;
  }
}
.more-icon {
  all: unset;
  svg {
    outline: none;
  }
  svg:focus {
    outline: none !important;
  }
}
</style>

<style lang="scss">
.callback-dialog {
  .el-dialog__header {
    padding-bottom: 0px !important;
  }
}
</style>
