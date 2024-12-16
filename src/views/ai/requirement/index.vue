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
          placeholder="搜索数据 范围：分类名称"
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
            <th colspan="4" style="text-align: start">需求列表</th>
            <th colspan="1" style="text-align: end; display: flex">
              <div
                @click="enter_create_requirement"
                class="card-main-create add-app g-unselect"
              >
                新增需求
              </div>
            </th>
          </tr>
          <tr>
            <th class="disappear-auto">#</th>
            <th>需求名称</th>
            <th>需求描述</th>
            <th>创建人</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          <transition-group name="fade" appear>
            <tr v-for="(item, index) in d.list" :key="index">
              <td class="active-row disappear-auto method-td">
                {{ item.id }}
              </td>
              <td
                @click="go_to_requirement(item)"
                class="active-row copy-instance long-td"
                style="width: 40%; cursor: pointer"
              >
                {{ item.name }}
              </td>
              <td class="active-row copy-instance long-td" style="width: 40%">
                {{ item.description }}
              </td>
              <td class="active-row long-td" style="width: 10%">
                <div>{{ item.create_by }}</div>
              </td>
              <td class="active-row long-td" style="width: 10%">
                <div>{{ new Date(item.add_time).toLocaleString() }}</div>
              </td>
              <td>
                <div
                  style="
                    display: flex;
                    justify-content: start;
                    align-items: center;
                  "
                >
                  <el-dropdown>
                    <el-icon class="more-icon"><MoreFilled /></el-icon>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="deleteRequirement(item)"
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
  <RequirementGroup @reload="clearDataFromSearch"></RequirementGroup>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="deleteDialog"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>要删除需求分类吗？</span>
      </div>
    </template>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <span>删除需求分类后，旗下的所有需求版本都将被删除。</span>
      </el-col>
    </el-row>
    <template #footer>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="deleteDialog = false">取消</el-button>
        <el-button type="primary" @click="deleteRequirementGroupAction">
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, getCurrentInstance } from "vue";
import RequirementGroup from "./add_requirement_group.vue";
import { useRouter, useRoute } from "vue-router";
import SpecialInput from "@/components/common/input/specialInput.vue";
import {
  getRequirementGroup,
  deleteRequirementGroup,
} from "@/api/ai/requirement";
import { useI18n } from "vue-i18n";
import tools from "@/utils/tools";
import { state } from "@/state";
import _ from "lodash";
const route = useRoute();
const router: any = useRouter();
const deleteDialog: any = ref(false);
const current_requirement_group: any = ref(-1);
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
// 全局对象
const { proxy }: any = getCurrentInstance();
const { t } = useI18n();
onMounted(async () => {
  await getData();
});

function go_to_requirement(item: any) {
  const params = {
    project: Number(route.params.project),
    group: Number(item.id),
  };
  router.push({ name: "ai_requirement", params });
}

// 增加数据
async function getData() {
  switchInfiniteScroll();
  const res = await getRequirementGroupListAction(
    currentPage.value,
    currentPageSize.value,
    Number(route.params.project),
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

function deleteRequirement(item: any) {
  deleteDialog.value = true;
  current_requirement_group.value = item;
}

function deleteRequirementGroupAction() {
  deleteRequirementGroup(current_requirement_group.value.id, {}).then(
    (res: any) => {
      deleteDialog.value = false;
      clearDataFromSearch();
    }
  );
}

async function getRequirementGroupListAction(
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
  return getRequirementGroup(data).then((res: any) => {
    if (res.detail || res.results.length === 0) {
      tools.message(t("response.lessData"), proxy);
      alwaysDisInfinite.value = true;
      return false;
    }
    return res.results;
  });
}
function enter_create_requirement() {
  state.setMessage("addrequirement" + Math.random().toString());
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
function clearData() {
  d.list = [];
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
// 切换无限滚动
function switchInfiniteScroll() {
  if (alwaysDisInfinite.value) {
    disInfinite.value = true;
    return;
  }
  disInfinite.value = !disInfinite.value;
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
