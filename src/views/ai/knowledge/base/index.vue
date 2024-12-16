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
            placeholder="搜索数据 范围：知识库名称"
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
        <Card
          @deleteFailed="deleteProviderFailed"
          @reload="clearDataFromSearch"
          @more="editProviderAction"
          :knowledge="item.id"
          :title="item.name"
          :desc="item.description"
          :document_count="item.document_count"
          :char_count="item.char_count"
          :join_app_count="item.join_app_count"
          :create_by="item.create_by"
          :update_time="item.update_time"
          @openPluginDialog="showAddPluginDialogAction(item.id)"
          :img="getImagePath(item.icon)"
        ></Card>
      </el-col>
    </el-row>
    <AddKnowledgeDialog @reload="clearDataFromSearch"></AddKnowledgeDialog>
    <EditKnowledgeDialog
      :image="current_provider_img"
      :name="current_provider_name"
      :desc="current_provider_desc"
      :trademark="current_provider_trademark"
      :provider="current_provider_id"
      :headers="current_provider_headers"
      @reload="clearDataFromSearch"
    ></EditKnowledgeDialog>
  </template>
  <script setup lang="ts">
  import { ref, reactive, onMounted, getCurrentInstance } from "vue";
  import Card from "./card.vue";
  import AddKnowledgeDialog from "./add_knowledge_dialog.vue";
  import EditKnowledgeDialog from "./edit_knowledge_dialog.vue";
  import SpecialInput from "@/components/common/input/specialInput.vue";
  import { getKnowleageList } from "@/api/ai/index";
  import { useRoute } from "vue-router";
  import { useI18n } from "vue-i18n";
  import tools from "@/utils/tools";
  import { state } from "@/state";
  const current_provider_name = ref("");
  const current_provider_desc = ref("");
  const current_provider_trademark = ref("");
  const current_provider_id = ref(0);
  const current_provider_headers = ref([]);
  const current_plugin_item = ref();
  import _ from "lodash";
  const route = useRoute();
  const { t } = useI18n();
  const current_provider_img = ref("");
  const current_provider = ref();
  const project_id = ref(0);
  function showAddPluginDialogAction(id: number) {
    current_provider.value = id;
    showAddPluginDialog.value = true;
  }
  function closePluginDialog(value: boolean) {
    showAddPluginDialog.value = value;
  }
  const emit = defineEmits(["clean_bread"]);
  
  // getImagePath 方法，返回相应的图片路径
  const getImagePath = (icon: string) => {
    // 格式化索引为 01, 02 等格式
    return icon;
  };
  const showAddPluginDialog = ref(false);
  const showEditPluginDialog = ref(false);
  
  onMounted(async () => {
    project_id.value = Number(route.params.project);
    await getData();
    // clearDataFromSearch()
    emit("clean_bread")
  });
  
  function editPluginAction(item: any) {
    showEditPluginDialog.value = true;
    current_plugin_item.value = item;
  }
  
  function editProviderAction(provider_id: number) {
    d.list.forEach((item: any) => {
      if (parseInt(item.id) === provider_id) {
        current_provider_img.value = getImagePath(item.icon);
        current_provider_name.value = item.name;
        current_provider_desc.value = item.description;
        current_provider_id.value = item.id;
        state.setMessage("editknowledge" + Math.random().toString());
      }
    });
  }
  
  // 搜索输入框动态数据
  const search = ref("");
  // 数据主体！！！
  const d = reactive({
    list: [] as any,
  });
  const searchWidth = ref("100");
  // 搜索输入框是否触顶
  const isSearchEleOnTop = ref(false);
  // 搜索输入框栅格宽度
  const searchInputWidth = ref(20);
  // 当前页码
  const currentPage = ref(1);
  // 当前页码大小
  const currentPageSize = ref(10);
  // 永久禁止无限滚动
  const alwaysDisInfinite = ref(false);
  // 是否禁用无限滚动
  const disInfinite = ref(false);
  // 全局对象
  const { proxy }: any = getCurrentInstance();
  // 清除输入框动作回调函数
  function clearDataFromSearch(): void {
    // 重置搜索前置变量
    clearString();
    // 清空数据
    clearData();
    // 重新获取数据
    getData();
  }
  
  // 切换无限滚动
  function switchInfiniteScroll() {
    if (alwaysDisInfinite.value) {
      disInfinite.value = true;
      return;
    }
    disInfinite.value = !disInfinite.value;
  }
  
  // 增加数据
  async function getData() {
    switchInfiniteScroll();
    const res = await getProviderListAction(
      currentPage.value,
      currentPageSize.value,
      project_id.value,
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
  
  async function getProviderListAction(
    page: number,
    size: number,
    project: number,
    mixins: any
  ) {
    const data = {
      page,
      size,
      project,
      mixins,
    };
    return getKnowleageList(data).then((res: any) => {
      if (res.detail || res.results.length === 0) {
        tools.message(t("response.lessData"), proxy);
        alwaysDisInfinite.value = true;
        return false;
      }
      return res.results;
    });
  }
  
  function deleteProviderFailed(msg: string) {
    tools.message(t(msg), proxy);
  }
  
  function clearData() {
    d.list = [];
  }
  // 重置搜索前置变量
  function clearString(): void {
    // 重置输入框内容
    search.value = "";
    clearPageInfo();
    clearInfinite();
  }
  // 重置无限滚动
  function clearInfinite() {
    // 重置永久禁止循环
    alwaysDisInfinite.value = false;
    // 重置无限滚动
    disInfinite.value = false;
  }
  // 重置分页信息
  function clearPageInfo(): void {
    // 重置页码
    currentPage.value = 1;
    // 重置分页大小
    currentPageSize.value = 10;
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
  </script>
  
  <style lang="scss" scoped>
  @import "@/assets/scss/btn/card_btn.scss";
  .card-cover {
    width: 100%;
    position: absolute;
    height: 10%;
    left: 0;
    will-change: top;
    background-size: cover;
    background-position: center;
    filter: blur(60px);
    // transform: scale(1.2);
    transition: 0.5s;
  }
  .private-input {
    margin: 0;
    padding: 0;
    border: none;
    border-bottom: 1px solid transparent;
    outline: none;
    background-color: transparent;
    font-size: 15px;
    width: 100%;
    transition: border-color 0.3s ease, color 0.3s ease;
  }
  .private-input:hover {
    color: var(--primary);
    border-bottom: 1px solid var(--primary) !important;
  }
  .action-icon {
    cursor: pointer;
  }
  .action-icon-close {
    margin-left: 3px;
  }
  .search {
    padding-top: 30px;
    // z-index: 900;
  }
  .main-data {
    padding-top: 20px;
  }
  
  .search-col {
    -webkit-transition: 0.3s;
    -o-transition: 0.3s;
    transition: 0.3s;
  }
  .fade-enter-active {
    opacity: 1;
    transition: all 0.05s ease-in-out;
  }
  .fade-leave-active {
    opacity: 1;
    transition: all 0.3s linear;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
    transform: translateX(10px);
  }
  
  .disappear-auto {
    @media screen and (max-width: 880px) {
      display: none;
    }
  }
  
  .copy-instance {
    font-size: 16px;
    cursor: pointer;
  }
  
  .el-popper.is-customized {
    /* Set padding to ensure the height is 32px */
    padding: 6px 12px !important;
    background: linear-gradient(90deg, rgb(159, 229, 151), rgb(204, 229, 129));
  }
  
  .el-popper.is-customized .el-popper__arrow::before {
    background: linear-gradient(45deg, #b2e68d, #bce689);
    right: 0;
  }
  </style>
  
  <style lang="scss">
  .provider-pen-dialog {
    border-radius: 10px;
    .el-dialog__header {
      display: none;
    }
    .el-dialog__footer {
      padding-top: 0px !important;
    }
    .el-dialog__body {
    }
    .el-avatar {
      .el-icon {
        font-size: 50px;
      }
    }
  }
  </style>
  