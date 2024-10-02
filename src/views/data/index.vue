<template>
  <!-- <el-affix position="top" :offset="85" class="action-bar">
    <ul style="list-style: none">
      <li @click="addData">
        <CButton
          ><el-icon><CirclePlusFilled /></el-icon
        ></CButton>
      </li>
      <li @click="clearDataFromSearch">
        <CButton
          ><el-icon><RefreshLeft /></el-icon
        ></CButton>
      </li>
      <el-backtop class="action-bar-back-top">
        <li>
          <CButton
            ><el-icon><ArrowUp /></el-icon
          ></CButton>
        </li>
      </el-backtop>
    </ul>
  </el-affix> -->
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
          :placeholder="$t('input.search.placeholder')"
          @clearData="clearDataFromSearch"
        ></SpecialInput>
      </el-col>
    </el-affix>
  </el-row>
  <el-row class="main-data" v-if="d.list.length > 0">
    <el-col :offset="2" :span="20">
      <table
        class="styled-table"
        v-infinite-scroll="getData"
        :infinite-scroll-disabled="disInfinite"
      >
        <thead>
          <tr>
            <th colspan="4" style="text-align: start;">
              全局参数管理
            </th>
            <th colspan="1" style="text-align: end; display: flex;">
              <CButton style="width: 40px;" @click="addData"
          ><el-icon><CirclePlus/></el-icon
        ></CButton>
        <CButton style="width: 40px; margin-left: 1rem;" @click="clearDataFromSearch"
          ><el-icon><RefreshLeft /></el-icon
        ></CButton>
            </th>
          </tr>
          <tr>
            <th>{{ t('project.dataCol.id') }}</th>
            <th>{{ t('project.dataCol.name') }}</th>
            <th class="disappear-auto">{{ t('project.dataCol.desc') }}</th>
            <th style="min-width: 50px;" class="disappear-auto">{{ t('project.dataCol.creator') }}</th>
            <th>{{ t('project.dataCol.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <transition-group name="fade" appear>
            <tr v-for="item in d.list" :key="item">
              <td class="active-row copy-instance" @click="copy(item.id)">
                {{ item.id }}
              </td>
              <td
                class="active-row copy-instance"
                @click="copy(`{{${item.name}}}`)"
              >
                {{ item.name }}
              </td>
              <td class="disappear-auto desc-td">
                <el-tooltip effect="light" placement="left">
                  <template #content
                    ><div class="desc-div">
                      {{ item.desc }}
                    </div></template
                  >
                  <div style="font-size: 16px">{{ item.desc }}</div></el-tooltip
                >
              </td>
              <td class="disappear-auto">{{ item.create_by }}</td>
              <td style="width: 15%">
                <div class="action-td">
                  <CButton @click="editData(item)"
                    ><el-icon><Edit /></el-icon
                  ></CButton>
                  <el-popconfirm
                    width="220"
                    :confirm-button-text="t('form.push')"
                    :cancel-button-text="t('form.cancel')"
                    confirm-button-type="danger"
                    :icon="InfoFilled"
                    :icon-color="GlobalStatus.methodColor[0]"
                    :title="t('asking.delete')"
                    @confirm="deleteData(item.id)"
                  >
                    <template #reference>
                      <CButton style="margin-left: 1rem"
                        ><el-icon><Delete /></el-icon
                      ></CButton>
                    </template>
                  </el-popconfirm>
                </div>
              </td>
            </tr>
          </transition-group>
        </tbody>
      </table>
    </el-col>
  </el-row>
  <el-empty description="暂无数据" v-else :image-size="200">
    <SpecialButton @click="addData">点击添加您的数据<el-icon><Plus /></el-icon></SpecialButton>
  </el-empty>
</template>

<script lang="ts" setup>
import { ref, reactive, getCurrentInstance } from 'vue'
import SpecialInput from '@/components/common/input/specialInput.vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiGetData, ApiDeleteData } from '@/api/data/index'
import CButton from '@/components/common/button/CButton.vue'
import { useI18n } from 'vue-i18n'
import useClipboard from 'vue-clipboard3/dist/esm/index.js'
import SpecialButton from '@/components/common/button/special_button.vue'
import tools from '@/utils/tools'
import _ from 'lodash'
import { InfoFilled } from '@element-plus/icons-vue'
import GlobalStatus from '@/global'
import Add from '@/assets/svg/public/add.vue'
import Refresh from '@/assets/svg/public/refresh.vue'

const searchWidth = ref('100')
const { t } = useI18n()

// 数据主体！！！
const d = reactive({
  list: [] as any
})
// 路由
const route = useRoute()
const router = useRouter()
// 项目ID
const projectId = ref(0)
// 搜索输入框动态数据
const search = ref('')
// 搜索输入框栅格宽度
const searchInputWidth = ref(20)
// 搜索输入框是否触顶
const isSearchEleOnTop = ref(false)
// 是否禁用无限滚动
const disInfinite = ref(false)
// 当前页码
const currentPage = ref(1)
// 当前页码大小
const currentPageSize = ref(10)
// 全局对象
const { proxy }: any = getCurrentInstance()
// 永久禁止无限滚动
const alwaysDisInfinite = ref(false)

// 当前页面初始化执行内容
;(function () {
  // 获取路由项目ID
  projectId.value = Number(route.params.project)
  // 获取默认数据
  getData()
  listenerStorage()
})()

function listenerStorage() {
  window.addEventListener('storage', (event) => {
    if (event.key === 'createData') {
      d.list.unshift(JSON.parse(localStorage.createData))
    } else if (event.key === 'editData') {
      const _editData = JSON.parse(localStorage.editData)
      for (let i = 0; i < d.list.length; i++) {
        if (d.list[i].id === _editData.id) {
          d.list[i].name = _editData.name
          d.list[i].desc = _editData.desc
        }
      }
    }
  })
}

async function getDataServer(
  page: number,
  size: number,
  project: number,
  mixins: any = undefined
) {
  const data = {
    page,
    size,
    project,
    mixins
  }
  return ApiGetData(data).then((res: any) => {
    if (res.detail || res.results.length === 0) {
      tools.message(t('response.lessData'), proxy)
      alwaysDisInfinite.value = true
      return false
    }
    return res.results
  })
}

// 增加数据
async function getData() {
  switchInfiniteScroll()
  const res = await getDataServer(
    currentPage.value,
    currentPageSize.value,
    projectId.value,
    search.value
  )
  if (!res) {
    switchInfiniteScroll()
    return
  }
  let pushCount = 0
  // 刻意延迟，表现过度效果
  const timer = setInterval(() => {
    d.list.push(res[pushCount])
    pushCount += 1
    if (pushCount === res.length) {
      clearInterval(timer)
      switchInfiniteScroll()
    }
  }, 50)

  currentPage.value += currentPageSize.value / 10
}

// 搜索框固定触顶状态改变回调函数
function onSearchChange(item: any): void {
  console.log(item)

  console.log(isSearchEleOnTop.value)

  if (isSearchEleOnTop.value !== item) {
    searchInputWidth.value = searchInputWidth.value === 13 ? 20 : 13
  }
  if (item) {
    searchWidth.value = '80'
  } else {
    searchWidth.value = '100'
  }
  isSearchEleOnTop.value = item
}

// 清除输入框动作回调函数
function clearDataFromSearch(): void {
  // 重置搜索前置变量
  clearString()
  // 清空数据
  clearData()
  // 重新获取数据
  getData()
}

// 清空数据
function clearData() {
  d.list = []
}

// 重置搜索前置变量
function clearString(): void {
  // 重置输入框内容
  search.value = ''
  clearPageInfo()
  clearInfinite()
}
// 重置无限滚动
function clearInfinite() {
  // 重置永久禁止循环
  alwaysDisInfinite.value = false
  // 重置无限滚动
  disInfinite.value = false
}
// 重置分页信息
function clearPageInfo(): void {
  // 重置页码
  currentPage.value = 1
  // 重置分页大小
  currentPageSize.value = 10
}
// 切换无限滚动
function switchInfiniteScroll() {
  if (alwaysDisInfinite.value) {
    disInfinite.value = true
    return
  }
  disInfinite.value = !disInfinite.value
}

// 复制至剪贴板
async function copy(value: String) {
  const { toClipboard } = useClipboard()
  await toClipboard(value.toString())
  tools.message(t('notice.clipboard'), proxy, 'success')
}

// 搜索data，防抖
const searching = _.debounce(
  function (e) {
    clearData()
    clearInfinite()
    clearPageInfo()
    getData()
  },
  500,
  { maxWait: 1500 }
)
// 删除数据
async function deleteData(id: number) {
  for (let i = 0; i < d.list.length; i++) {
    if (d.list[i].id === id) {
      const data = {
        project: projectId.value
      }
      await ApiDeleteData(id, data).then((res) => {
        d.list.splice(i, 1)
        tools.message(t('notice.delete'), proxy, 'success')
      })
      break
    }
  }
}
// 跳转新增数据页面
function addData() {
  openEditor('addData', { project: projectId.value })
}

function editData(item: any) {
  openEditor('editData', { project: projectId.value, data: item.id })
}

function openEditor(name: string, params: any) {
  const addPage = router.resolve({
    name,
    params
  })
  window.open(addPage.href, '_blank')
}
</script>

<style lang="scss" scoped>
.search {
  padding-top: 30px;
  // z-index: 900;
}
.main-data {
  padding-top: 20px;
}

.styled-table {
  border-top: 2px solid var(--global-theme-color);
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
    width: 200px;
    .desc-div {
      max-width: 20vw;
      text-align: center;
      font-size: 15px;
    }
  }
  .desc-td div {
    width: 14vw;
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
  // background-image: linear-gradient(
  //   90deg,
  //   var(--global-theme-color) 70%,
  //   var(--global-theme-light-color)
  // );
  // color: #ffffff;
  text-align: left;
  color: black;
  border-bottom: 1px solid #E6E6E6;
}

.styled-table th,
.styled-table td {
  padding: 12px 15px;
}

.styled-table tbody tr {
  border-bottom: 1px solid #dddddd;
}

.styled-table tbody tr:nth-of-type(even) {
  background-color: #f3f3f3;
}
.styled-table tbody tr:last-of-type {
  border-bottom: 2px solid var(--global-theme-color);
}

.styled-table tbody tr td.active-row {
  font-weight: bold;
  color: var(--global-theme-color);
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

.action-bar {
  z-index: 50;
  position: absolute;
  right: 40px;
  @media screen and (max-width: 960px) {
    right: 5px;
  }
  .action-bar-back-top,
  .action-bar-back-top:hover {
    @media screen and (max-width: 960px) {
      right: 5px !important;
    }
    background-color: inherit;
    box-shadow: none;
  }
  ul {
    margin: 0px;
    padding: 0px;
    width: 100%;
  }
  ul li {
    cursor: pointer;
    width: 40px;
    height: 30px;
    background-color: white;
    border: 2px solid transparent;
    border-radius: 8px;
    background-clip: padding-box, border-box;
    background-origin: padding-box, border-box;
    background-image: linear-gradient(
      90deg,
      var(--global-theme-light-color),
      var(--global-theme-color)
    );
    text-align: center;
    i {
      font-size: 20px;
      color: white;
    }
  }
  li:hover {
    background-image: linear-gradient(
      90deg,
      var(--global-theme-light-color),
      var(--global-theme-light-color)
    );
  }
  li:active {
    background-image: linear-gradient(
      90deg,
      var(--global-theme-light-color),
      var(--global-theme-color)
    );
  }
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
