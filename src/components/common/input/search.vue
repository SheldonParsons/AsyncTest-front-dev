<template>
<el-row class="search">
    <el-affix
      position="top"
      :offset="2"
      :style="{ width: searchWidth + '%' }"
      @change="onSearchChange"
    >
      <el-col :offset="2" :span="searchInputWidth" class="search-col">
        <SpecialInput
          v-model="search"
          @input="searching"
          :placeholder="placeholder"
          @clearData="clearDataFromSearch"
        ></SpecialInput>
      </el-col>
    </el-affix>
  </el-row>
  <el-row v-if="d.list.length > 0" class="main-data">
    <el-col :offset="2" :span="20">
      <table
        class="styled-table"
        v-infinite-scroll="getData"
        :infinite-scroll-disabled="disInfinite"
      >
        <thead>
          <tr>
            <th colspan="5" style="text-align: start;">
              {{ title }}
            </th>
            <th colspan="1" style="text-align: end; display: flex;">
              <slot name="other"></slot>
            </th>
          </tr>
          <tr>
            <slot name="headers"></slot>
          </tr>
        </thead>
        <tbody>
          <transition-group name="fade" appear>
            <tr v-for="item in d.list" :key="item">
              <slot name="main" :item="item"></slot>
            </tr>
          </transition-group>
        </tbody>
      </table>
    </el-col>
  </el-row>
</template>

<script lang="ts" setup>
import { ref, reactive, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import SpecialInput from '@/components/common/input/specialInput.vue'
import tools from '@/utils/tools'
import _ from 'lodash'
const props = defineProps({
  placeholder: {
    type: String,
    default: ""
  },
  title: {
    type: String,
    default: ""
  },
  handlerFunction: {
    type: Function,
    default: () => console.log('Default handleClick called'),
  }
})
// 路由
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
// 全局对象
const { proxy }: any = getCurrentInstance()
// 项目ID
const projectId = ref(0)
const searchWidth = ref('100')
// 搜索输入框动态数据
const search = ref('')
// 永久禁止无限滚动
const alwaysDisInfinite = ref(false)
// 是否禁用无限滚动
const disInfinite = ref(false)
// 当前页码
const currentPage = ref(1)
// 当前页码大小
const currentPageSize = ref(10)
// 搜索输入框是否触顶
const isSearchEleOnTop = ref(false)
// 搜索输入框栅格宽度
const searchInputWidth = ref(20)
// 数据主体！！！
const d = reactive({
  list: [] as any
})

// 当前页面初始化执行内容
;(function () {
  // 获取路由项目ID
  projectId.value = Number(route.params.project)
  // 获取默认数据
  getData()
})()
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

// 清空数据
function clearData() {
  d.list = []
}

// 搜索框固定触顶状态改变回调函数
function onSearchChange(item: any): void {
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

// 重置搜索前置变量
function clearString(): void {
  // 重置输入框内容
  search.value = ''
  clearPageInfo()
  clearInfinite()
}

// 重置分页信息
function clearPageInfo(): void {
  // 重置页码
  currentPage.value = 1
  // 重置分页大小
  currentPageSize.value = 10
}

// 增加数据
async function getData() {
  switchInfiniteScroll()
  const res = await getDataServer(
    currentPage.value,
    currentPageSize.value,
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

async function getDataServer(
  page: number,
  size: number,
  mixins: any,
) {
  const data = {
    page,
    size,
    mixins,
  }
  return props.handlerFunction(data).then((res: any) => {
    if (res.detail || res.results.length === 0) {
      tools.message(t('response.lessData'), proxy)
      alwaysDisInfinite.value = true
      return false
    }
    return res.results
  })
}

// 切换无限滚动
function switchInfiniteScroll() {
  if (alwaysDisInfinite.value) {
    disInfinite.value = true
    return
  }
  disInfinite.value = !disInfinite.value
}
// 重置无限滚动
function clearInfinite() {
  // 重置永久禁止循环
  alwaysDisInfinite.value = false
  // 重置无限滚动
  disInfinite.value = false
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
    width: 5%;
  }
  .long-td {
    width: 300px;
  }
  .long-td div {
    // width: 30vw;
    max-width: 300px;
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
  color: var(--method-color);
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
.id-col div {
  color: var(--global-theme-color);
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