<template>
  <div class="container">
    <el-row class="search">
      <el-affix
        position="top"
        :offset="2"
        :style="{ width: searchWidth + '%' }"
        @change="onSearchChange"
      >
        <el-col
          :offset="searchOffsetIndex"
          :span="searchInputWidth"
          class="search-col"
        >
          <SpecialInput
            v-model="search"
            @input="searching"
            :placeholder="$t('project.search.placeholder')"
            @clearData="clearDataFromSearch"
          ></SpecialInput>
        </el-col>
      </el-affix>
    </el-row>
    <el-row style="padding-top: 30px">
      <el-col :offset="2" :span="20">
        <el-divider content-position="left">{{
          t('project.favorite')
        }}</el-divider>
        <el-row
          v-if="favoriteProjects.list.length > 0"
          :gutter="20"
          style="padding-top: 4px; padding-bottom: 50px; min-height: 200px"
        >
          <el-col
            class="favorite-card-col"
            :md="6"
            :lg="12"
            v-for="(item, index) in favoriteProjects.list"
            :key="index"
            style="height: 60px"
          >
            <transition name="fade" mode="out-in" appear>
              <el-card
                :body-style="{
                  padding: '0px'
                }"
                :style="{ '--el-card-border-radius': '5px' }"
                shadow="hover"
                :class="{
                  'favorite-card-main': true
                }"
              >
                <div
                  :class="{ 'favorite-card': true, default: item.is_default }"
                  style="height: 60px; text-align: center"
                  @click="enterProject(item)"
                >
                  <span class="card-favorite-span-name card-span-line"
                    >{{ item.name
                    }}<el-tag
                      style="margin-left: 5px"
                      v-if="item.is_default"
                      class="mx-1"
                      effect="dark"
                      round
                    >
                      默认项目
                    </el-tag></span
                  >
                  <span class="Label Label--secondary v-align-middle ml-1">{{
                    t('project.public')
                  }}</span>
                </div>
              </el-card>
            </transition></el-col
          ></el-row
        >
        <el-empty v-else :image-size="80" :description="t('global.empty')" />
        <el-divider content-position="left">{{ t('project.all') }}</el-divider>
        <el-row
          v-if="projects.list.length > 0"
          :gutter="30"
          v-infinite-scroll="load"
          style="padding-top: 70px; padding-bottom: 50px; margin-bottom: 50px"
          :infinite-scroll-disabled="disInfinite"
        >
          <el-col
            :span="10"
            :md="8"
            :lg="8"
            :xl="8"
            v-for="(item, index) in projects.list"
            :key="index"
            style="height: 250px; padding-left: 30px; padding-right: 30px"
          >
            <transition name="fade" mode="out-in" appear>
              <PanelViewNewCard
                :project="item"
                :name="item.name"
                :creator="item.create_by"
                :create-time="tools.getLocaleDateTime(item.add_time)"
                :isDefault="item.is_default"
                :isFavorite="item.is_favorite"
                :decsString="item.desc"
                :fire="item.user_count"
                @enterProject="enterProject"
                @setDefault="setDefault"
                @setFavorite="setFavorite"
              ></PanelViewNewCard>
            </transition>
          </el-col>
        </el-row>
        <el-empty v-else :image-size="100" :description="t('global.empty')" />
      </el-col>
    </el-row>
  </div>
  <CommonDialog
    :dialog="showApproveProjectDialog"
    :dWidth="45"
    :dTop="10"
    :hasFooter="true"
    :footerConfirmDesc="t('project.approve.confirmDesc')"
    :footerCancelDesc="t('project.approve.cancelDesc')"
    :headerText="t('project.approve.requestDesc')"
    :cancelDoubleCheck="false"
    @closed="closedApproveProjectDialog"
    @cancel="closedApproveProjectDialog"
    @confirm="confirmApproveProject"
  >
    <CommonTextarea
      v-model="approveDesc"
      class="create-child"
      :placeholder="$t('project.approve.requestDescPlaceHolder')"
      :maxlength="500"
    ></CommonTextarea>
  </CommonDialog>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, getCurrentInstance } from 'vue'
import tools from '@/utils/tools'
import SpecialInput from '@/components/common/input/specialInput.vue'
import CommonDialog from '@/components/layout/dialogs/commonDialog.vue'
import CommonTextarea from '@/components/common/input/commonTextarea.vue'
import { ApiCreateTouchPixel } from '@/api/pixel/project'
import {
  ApiGetProjects,
  ApiGetFavoriteProjects,
  ApiDeleteFavoriteProjects,
  ApiAddFavoriteProjects,
  ApiDeleteDefaultProjects,
  ApiAddDefaultProjects
} from '@/api/project/index'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PanelViewNewCard from './panelViewNewCard.vue'
import _ from 'lodash'
const router = useRouter()
const { t } = useI18n()
// 搜索输入框动态数据
const search = ref('')
// 搜索输入框栅格宽度
const searchInputWidth = ref(20)
// 搜索输入框是否触顶
const isSearchEleOnTop = ref(false)
// 搜索框触顶偏移量
const searchOffsetIndex = ref(2)
// 搜索宽度
const searchWidth = ref('100')
// 当前页数
const currentPage = ref(1)
// 是否禁用无限滚动
const disInfinite = ref(true)
// 永久禁止无限滚动
const alwaysDisInfinite = ref(false)
// 申请加入项目对话框
const showApproveProjectDialog = ref(false)
// 申请理由
const approveDesc = ref('')
// 当前项目
const currentProject = ref(0)
// 项目列表对象，用于装载响应体的project对象，差别不大，主要为解决动画显示的连贯性
const projects = reactive({
  list: [] as any
})
const favoriteProjects = reactive({
  list: [] as any
})
const clickAllowed = ref(true)
const { proxy }: any = getCurrentInstance()
onMounted(async () => {
  disInfinite.value = true
  await getProjects(20, search.value)
  await getFavoriteProject(30, search.value)
})

// 清空输入框，重新请求所有项目
function clearDataFromSearch() {
  alwaysDisInfinite.value = false
  disInfinite.value = true
  projects.list = []
  favoriteProjects.list = []
  currentPage.value = 1
  search.value = ''
  getProjects(20, search.value)
  getFavoriteProject(10, search.value)
}

// 通过项目名称模糊搜索，防抖
const searching = _.debounce(
  function (e) {
    disInfinite.value = true
    projects.list = []
    favoriteProjects.list = []
    currentPage.value = 1
    alwaysDisInfinite.value = false
    getProjects(20, search.value)
    getFavoriteProject(10, search.value)
  },
  500,
  { maxWait: 1500 }
)

// 搜索框固定触顶状态改变回调函数
function onSearchChange(item: any): void {
  if (isSearchEleOnTop.value !== item) {
    searchInputWidth.value = searchInputWidth.value === 15 ? 20 : 15
  }
  if (item) {
    searchWidth.value = '80'
    searchOffsetIndex.value = 6
  } else {
    searchWidth.value = '100'
    searchOffsetIndex.value = 2
  }
  isSearchEleOnTop.value = item
}

// 进入项目，路由跳转
function enterProject(project: any) {
  if (project.is_member) {
    router.push({ name: 'data', params: { project: project.id } })
  } else {
    currentProject.value = project.id
    showApproveProjectDialog.value = true
  }
}
// 获取收藏项目
function getFavoriteProject(size = 10, name = '') {
  ApiGetFavoriteProjects({ page: 1, size, name }).then((data: any) => {
    if (data.results && data.results.length > 0) {
      intervalData(data, favoriteProjects, size, false)
    } else {
      clearStatus()
    }
  })
}
// 获取项目列表API，每成功调用一次page自增1
async function getProjects(size = 10, name = '') {
  ApiGetProjects({ page: currentPage.value, size, name }).then((data: any) => {
    if (data.detail) {
      proxy.$message({
        message: t('response.lessData'),
        duration: 3000,
        type: 'warning'
      })
      clearStatus()
      alwaysDisInfinite.value = true
      return
    }
    if (data.results && data.results.length > 0) {
      intervalData(data, projects, size, true)
    } else {
      // 未知错误，解锁无限滚动
      clearStatus()
    }
  })
}

function closedApproveProjectDialog() {
  approveDesc.value = ''
  showApproveProjectDialog.value = false
}

function confirmApproveProject() {
  if (approveDesc.value === '') {
    proxy.$message({
      message: t('project.approve.emptyApproveReason'),
      duration: 3000,
      type: 'warning'
    })
  } else {
    const data = {
      type: 1,
      project: currentProject.value,
      desc: approveDesc.value
    }
    ApiCreateTouchPixel(data).then((data: any) => {
      if (data.non_field_errors) {
        proxy.$message({
          message: t('project.approve.dupApprove'),
          duration: 3000,
          type: 'warning'
        })
      } else if (data.result === 0) {
        proxy.$message({
          message: t('project.approve.abandonApplySystem'),
          duration: 3000,
          type: 'warning'
        })
      } else {
        proxy.$message({
          message: t('project.approve.successApply'),
          duration: 3000,
          type: 'success'
        })
        showApproveProjectDialog.value = false
        approveDesc.value = ''
      }
    })
  }
}

// 有意延迟加载数据
function intervalData(
  data: any,
  instance: any,
  size: number,
  isAllProject: any = false
) {
  let count = 0
  const timer = setInterval(() => {
    instance.list.push(data.results[count])
    count = count + 1
    if (count >= data.results.length) {
      if (isAllProject) {
        currentPage.value = currentPage.value + size / 10
        clearStatus()
      }
      clearInterval(timer)
    }
  }, 10)
}

// 开启无限滚动
function clearStatus() {
  disInfinite.value = false
}

// 滚动加载
async function load() {
  if (alwaysDisInfinite.value === false) {
    disInfinite.value = true
    await getProjects(10, search.value)
  }
}
// 设置默认项目
async function setDefault(project: any) {
  if (!clickAllowed.value) {
    clickAllowMessage()
    return
  }
  clickAllowed.value = false
  // 获取当前行为是设置默认项目还是取消默认项目
  if (project.is_default) {
    // 1、取消默认项目
    await cancelDefault(project)
    favoriteProjects.list.forEach((item: any) => {
      item.is_default = item.id === project.id
    })
    proxy.$message({
      message: t('project.cancelDefault'),
      duration: 3000,
      type: 'warning'
    })
  } else {
    // 2、设置默认项目
    await addDefault(project)
    projects.list.forEach((item: any) => {
      if (item.is_default && item.id !== project.id) {
        item.is_default = false
      }
    })
    favoriteProjects.list.forEach((item: any) => {
      item.is_default = item.id === project.id
    })
    proxy.$message({
      message: t('project.addDefault'),
      duration: 3000,
      type: 'warning'
    })
  }
  project.is_default = !project.is_default
  clickAllowed.value = true
}

// 设置收藏项目
async function setFavorite(project: any) {
  if (!clickAllowed.value) {
    clickAllowMessage()
    return
  }
  clickAllowed.value = false
  // 获取当前行为是设置收藏项目还是取消收藏项目
  if (project.is_favorite) {
    // 1、取消收藏
    await cancelFavorite(project)
    // message提示
    proxy.$message({
      message: t('project.cancelFavorite'),
      duration: 3000,
      type: 'warning'
    })
    for (let i = 0; i < favoriteProjects.list.length; i++) {
      if (favoriteProjects.list[i].id === project.id) {
        favoriteProjects.list.splice(i, 1)
        break
      }
    }
  } else {
    // 2、设置收藏
    const res: any = await addFavorite(project)
    res.data.forEach((item: any) => {
      favoriteProjects.list.push(item)
    })
    // message提示
    proxy.$message({
      message: t('project.addFavorite'),
      duration: 3000,
      type: 'warning'
    })
  }
  project.is_favorite = !project.is_favorite
  clickAllowed.value = true
}

// 取消默认
async function cancelDefault(project: any) {
  return ApiDeleteDefaultProjects(project.id).then((data) => {
    return data
  })
}

// 设置为默认
async function addDefault(project: any) {
  const data = {
    project_id: project.id.toString()
  }
  return ApiAddDefaultProjects(data).then((data) => {
    return data
  })
}
// 取消收藏
async function cancelFavorite(project: any) {
  const data = {
    project_ids: project.id.toString()
  }
  return ApiDeleteFavoriteProjects(project.id, data).then((data) => {
    return data
  })
}

// 加入收藏
async function addFavorite(project: any) {
  const data = {
    project_ids: project.id.toString()
  }
  return ApiAddFavoriteProjects(data).then((data) => {
    return data
  })
}

// 禁止点击提示
function clickAllowMessage() {
  proxy.$message({
    message: t('noticeError.clickAllowed'),
    duration: 3000,
    type: 'warning'
  })
}
</script>

<style lang="scss" scoped>
.container {
  width: inherit;
  display: flex;
  flex-direction: column;
}
.favorite-card-col {
  margin-top: 20px;
}
.favorite-card {
  display: flex;
  justify-content: center;
  align-items: center;
  color: black !important;
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
  border-radius: 5px;
  transition: all 0.25s ease;
  border: 2px solid transparent;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(90deg, hsl(240 30% 96%), hsl(240 30% 96%));
  outline: none;
  box-sizing: border-box;
  .card-favorite-span-name {
    font-size: 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    white-space: break-spaces;
    line-height: 1.6rem;
    width: 90%;
    margin-left: 10px;
  }
}
.card-span-line {
  font-size: 16px;
  color: black;
  line-height: 100px;
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.card-favorite-span-name {
  line-height: 40px;
  cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
  opacity: 1;
  transition: all 1s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.favorite-card-main {
  border: 0px;
}
.favorite-card:hover {
  // background: var(--private-bg);
  .card-favorite-span-name {
    color: white;
  }
  .Label {
    border: 1px solid white;
    color: white;
  }
  border: 2px solid black;
  background: rgba(66, 184, 131, 0.9);
  box-shadow: 3px 3px 1px #888888;
}
.Label--secondary {
  border-color: #d0d7de;
  color: #656d76;
  margin-right: 10px;
}
.search {
  padding-top: 90px;
}

.Label,
.label {
  height: 20px;
  border: 1px solid #d0d7de;
  border-radius: 2em;
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 18px;
  padding: 0 7px;
  white-space: nowrap;
}
.ml-1 {
  margin-left: var(0.25rem, 4px) !important;
}
.v-align-middle {
  vertical-align: middle !important;
}

.search-col {
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
}
</style>
