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
          placeholder="搜索数据 范围：片段内容"
          @clearData="clearDataFromSearch"
        ></SpecialInput>
      </el-col>
    </el-affix>
  </el-row>
  <el-row
    :gutter="50"
    v-infinite-scroll="getData"
    :infinite-scroll-disabled="disInfinite"
    justify="start"
    style="padding-bottom: 200px; margin-left: 7%"
  >
    <el-col
      :span="7"
      v-for="(item, index) in d.list"
      :key="index"
      style="margin-top: 30px"
    >
      <div style="padding: 10px; border: 1px solid #e6e6e6; border-radius: 5px">
        <el-row class="g-flex" style="width: 100%">
          <el-col :span="14"
            ><div
              style="
                font-size: 16px;
                font-weight: 600;
                border: 1px solid #e6e6e6;
                width: 60px;
                border-radius: 5px;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
              "
            >
              <span>#{{ item.id }}</span>
            </div></el-col
          >
          <el-col :span="6" class="g-flex">
            <span style="font-size: 14px; font-weight: 600">{{
              item.enabled ? "已启用" : "已禁用"
            }}</span>
            <div
              style="margin-left: 5px"
              :class="{ point: true, 'point-green': item.enabled }"
            ></div
          ></el-col>
          <el-col :span="1"
            ><el-divider
              style="display: inline-block"
              direction="vertical"
            ></el-divider
          ></el-col>
          <el-col :span="3"
            ><el-switch
              v-model="item.enabled"
              @change="changeSegmentStatus(item)"
          /></el-col>
        </el-row>
        <el-row
          class="g-flex no-scroll"
          style="text-overflow: ellipsis; height: 200px; overflow: scroll"
        >
          <el-col
            ><span style="font-size: 15px">{{ item.content }}</span></el-col
          >
        </el-row>
        <el-row class="g-flex" style="margin-top: 10px">
          <el-col
            style="display: flex; justify-content: start; align-items: center"
            :span="7"
            ><el-icon><Document /></el-icon
            ><span style="font-size: 14px; color: gray"
              >{{ item.char_count }}字符</span
            ></el-col
          >
          <el-col
            style="display: flex; justify-content: start; align-items: center"
            :span="7"
            ><el-icon><Aim /></el-icon
            ><span style="font-size: 14px; color: gray"
              >{{ item.hit_count }}命中</span
            ></el-col
          >
          <el-col
            style="display: flex; justify-content: end; align-items: center"
            :span="9"
            ><el-icon @click="editSegment(item)" style="cursor: pointer"
              ><Edit /></el-icon
            ><el-icon
              @click="deleteSegment(item)"
              style="margin-left: 5px; cursor: pointer"
              ><DeleteFilled /></el-icon
          ></el-col>
        </el-row>
      </div>
    </el-col>
  </el-row>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="deleteDialog"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>要删除该文档片段吗？</span>
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
        <el-button type="primary" @click="deleteSegmentAction">
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="createDialog"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>创建片段</span>
      </div>
    </template>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <el-badge is-dot class="item"><span>片段内容</span></el-badge>
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <el-input
          v-model="segemnt_content"
          :rows="10"
          type="textarea"
          placeholder="片段内容"
        />
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <el-select
          v-model="keyword_list"
          multiple
          filterable
          allow-create
          default-first-option
          :reserve-keyword="false"
          placeholder="请输入该文档片段关键词，最多不超过10个，按Enter输入"
        >
        </el-select>
      </el-col>
    </el-row>
    <template #footer>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="deleteDialog = false">取消</el-button>
        <el-button type="primary" @click="createSegmentAction">
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="editDialog"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>修改片段</span>
      </div>
    </template>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <el-badge is-dot class="item"><span>片段内容</span></el-badge>
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <el-input
          v-model="segemnt_content"
          :rows="10"
          type="textarea"
          placeholder="片段内容"
        />
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <el-select
          v-model="keyword_list"
          multiple
          filterable
          allow-create
          default-first-option
          :reserve-keyword="false"
          placeholder="请输入该文档片段关键词，最多不超过10个，按Enter输入"
        >
        </el-select>
      </el-col>
    </el-row>
    <template #footer>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="editDialog = false">取消</el-button>
        <el-button type="primary" @click="editSegmentAction"> 确认 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import {
  getSingleKnowleageList,
  getSingleDocumentList,
  getSegmentList,
  editSegmentStatus,
  deleteSegmentApi,
  createSegmentApi,
  editSegmentApi,
} from "@/api/ai/index";
import { onMounted, ref, reactive, getCurrentInstance, watch } from "vue";
import SpecialInput from "@/components/common/input/specialInput.vue";
import tools from "@/utils/tools";
import { useI18n } from "vue-i18n";
import _ from "lodash";
import { state } from "@/state";
const deleteDialog = ref(false);
const createDialog = ref(false);
const editDialog = ref(false);
const segemnt_content = ref("");
const current_segment: any = ref({});
const knowledge: any = ref({});
const route = useRoute();
const keyword_list: any = ref([]);
const createing = ref(false);
const deleting = ref(false);
const editing = ref(false);
const _status = ref(true);
const changing = ref(false);
// 数据主体！！！
const d = reactive({
  list: [] as any,
});
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
watch(
  () => state.message,
  (val) => {
    if (val.indexOf("addsegment") != -1) {
      createDialog.value = true;
      segemnt_content.value = "";
      keyword_list.value = [];
    }
  }
);
function editSegmentAction() {
  if (editing.value) {
    tools.message("正在编辑片段，请勿重复编辑。", proxy);
    return;
  }
  editing.value = true;
  tools.message("正在创编辑片段，请稍等。", proxy);
  const data = {
    keywords: keyword_list.value,
    content: segemnt_content.value,
  };
  editSegmentApi(current_segment.value.id, data).then((res: any) => {
    editDialog.value = false;
    clearDataFromSearch();
    editing.value = false;
    tools.message("编辑成功", proxy);
  });
}
function editSegment(item: any) {
  current_segment.value = item;
  segemnt_content.value = item.content;
  keyword_list.value = [];
  for (
    let i = 0;
    i < JSON.parse(item.keywords.replace(/'/g, '"')).length;
    i++
  ) {
    keyword_list.value.push(JSON.parse(item.keywords.replace(/'/g, '"'))[i]);
  }
  editDialog.value = true;
  console.log(keyword_list.value);
}
function createSegmentAction() {
  if (createing.value) {
    tools.message("正在创建片段，请勿重复创建。", proxy);
    return;
  }
  createing.value = true;
  tools.message("正在创建片段，请稍等。", proxy);
  const data = {
    document: Number(route.params.document),
    content: segemnt_content.value,
    keywords: keyword_list.value,
    name: "",
    description: "",
  };
  createSegmentApi(data).then((res: any) => {
    createDialog.value = false;
    clearDataFromSearch();
    createing.value = false;
    window.$toast({title:'创建成功', type:'success'})
  });
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

function deleteSegmentAction() {
  if (deleting.value) {
    tools.message("正在删除片段，请勿重复删除。", proxy);
    return;
  }
  deleting.value = true;
  tools.message("正在删除片段，请稍等", proxy);
  deleteSegmentApi(current_segment.value.id, {}).then((res: any) => {
    tools.message(res.msg, proxy);
    deleteDialog.value = false;
    clearDataFromSearch();
    deleting.value = false;
    tools.message("删除成功。", proxy);
  });
}

function deleteSegment(item: any) {
  current_segment.value = item;
  deleteDialog.value = true;
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
function clearData() {
  d.list = [];
}
function changeSegmentStatus(item: any) {
  if (changing.value) {
    tools.message("正在修改状态，请稍后", proxy);
    item.enabled = !item.enabled;
    return;
  }
  changing.value = true;
  editSegmentStatus(item.id, {}).then((res: any) => {
    if (!res.result) {
      item.enabled = !item.enabled;
      tools.message(res.msg, proxy);
    }
    changing.value = false;
  });
}
// 增加数据
async function getData() {
  switchInfiniteScroll();
  const res = await getProviderListAction(
    currentPage.value,
    currentPageSize.value,
    Number(route.params.document),
    search.value
  );
  console.log(res);
  if (!res) {
    // enter_create_document_list()
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
async function getProviderListAction(
  page: number,
  size: number,
  document: number,
  mixins: any
) {
  const data = {
    page,
    size,
    document,
    mixins,
  };
  return getSegmentList(data).then((res: any) => {
    if (res.detail || res.results.length === 0) {
      tools.message(t("response.lessData"), proxy);
      alwaysDisInfinite.value = true;
      return false;
    }
    return res.results;
  });
}
// 切换无限滚动
function switchInfiniteScroll() {
  if (alwaysDisInfinite.value) {
    disInfinite.value = true;
    return;
  }
  disInfinite.value = !disInfinite.value;
}
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
const document: any = ref({});
const emit = defineEmits(["go_to_segment"]);
onMounted(async () => {
  await getData();
  const knowledge_id = Number(route.params.knowledge);
  const document_id = Number(route.params.document);
  getSingleKnowleageList(knowledge_id, {}).then((res) => {
    knowledge.value = res;
    const params = {
      project: Number(route.params.project),
      knowledge: knowledge.value.id,
    };
    getSingleDocumentList(document_id, {}).then((document_res: any) => {
      document.value = document_res;
      const document_params = {
        project: Number(route.params.project),
        knowledge: knowledge.value.id,
        document: document.value.id,
      };
      emit(
        "go_to_segment",
        "knowledge",
        knowledge.value.name,
        params,
        "segment",
        document.value.name,
        document_params
      );
    });
  });
});
</script>

<style lang="scss" scoped>
.point-green {
  background-color: var(--el-color-primary) !important;
}

.point {
  display: inline-block;
  width: 10px;
  height: 10px;
  background-color: #e5e7eb;
  border: 2px solid var(--dark);
  border-radius: 5px;
  margin-right: 3px;
}
.my-header {
  padding: 20px;
  padding-bottom: 0px;
  span {
    font-size: 16px;
    font-weight: 600;
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
