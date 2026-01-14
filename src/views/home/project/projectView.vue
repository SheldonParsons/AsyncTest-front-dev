<template>
  <div class="modern-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
    </div>

    <!-- 顶部栏 -->
    <header class="page-header" :class="{ scrolled: isScrolled }">
      <div class="header-content">
        <div class="page-title-section">
          <h3 class="page-main-title">我的项目</h3>
          <p class="page-subtitle">管理和探索你的所有项目</p>
        </div>

        <div class="header-actions">
          <div class="search-box">
            <el-icon class="search-icon">
              <Search />
            </el-icon>
            <input v-model="search" @input="handleSearch" class="project-search-input"
              :placeholder="$t('project.search.placeholder')" />
            <transition name="fade-scale">
              <el-icon v-if="search" class="clear-icon" @click="clearSearch">
                <Close />
              </el-icon>
            </transition>
          </div>

          <button class="btn-create-project" @click="showCreateProject()">
            <el-icon class="btn-icon">
              <Plus />
            </el-icon>
            <span>新建项目</span>
          </button>
        </div>
      </div>

      <div class="stats-bar">
        <div class="stat-card">
          <div class="stat-icon favorite">
            <el-icon>
              <Star />
            </el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ favoriteProjects.list.length }}</span>
            <span class="stat-label">收藏项目</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon total">
            <el-icon>
              <FolderOpened />
            </el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ projects.list.length }}</span>
            <span class="stat-label">全部项目</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="page-main">
      <!-- 收藏项目 -->
      <section class="content-section" v-if="favoriteProjects.list.length > 0 || true">
        <div class="section-title-bar">
          <div class="section-title-left">
            <div class="section-icon">
              <el-icon>
                <Star />
              </el-icon>
            </div>
            <h2 class="section-title">收藏项目</h2>
          </div>
          <div class="section-badge">{{ favoriteProjects.list.length }} 个项目</div>
        </div>

        <div class="favorite-projects-list">
          <transition-group name="smooth-list">
            <div v-for="item in favoriteProjects.list" :key="`fav-${item.id}`" class="favorite-project-item"
              @click="enterProject(item)">
              <div class="project-item-header">
                <div class="project-icon">
                  <el-icon>
                    <Folder />
                  </el-icon>
                </div>
                <div class="project-info">
                  <h3 class="project-name">{{ item.name }}</h3>
                  <p class="project-meta">
                    <el-icon>
                      <User />
                    </el-icon>
                    <span>{{ item.create_by || '未知' }}</span>
                  </p>
                </div>
              </div>

              <div class="project-item-footer">
                <span v-if="item.is_default" class="project-tag is-default">默认</span>
                <span class="project-tag">{{ t("project.public") }}</span>
                <el-icon class="enter-icon">
                  <ArrowRight />
                </el-icon>
              </div>
            </div>

            <div key="create-new" class="favorite-project-item create-item" @click="showCreateProject()">
              <div class="create-item-content">
                <div class="create-plus">
                  <el-icon>
                    <Plus />
                  </el-icon>
                </div>
                <span class="create-text">创建新项目</span>
              </div>
            </div>
          </transition-group>
        </div>
      </section>

      <!-- 所有项目 -->
      <section class="content-section">
        <div class="section-title-bar">
          <div class="section-title-left">
            <div class="section-icon">
              <el-icon>
                <FolderOpened />
              </el-icon>
            </div>
            <h2 class="section-title">全部项目</h2>
          </div>
          <div class="section-badge">{{ projects.list.length }} 个项目</div>
        </div>

        <div v-if="projects.list.length > 0" class="all-projects-grid" v-infinite-scroll="load"
          :infinite-scroll-disabled="disInfinite">
          <transition-group name="smooth-list">
            <div v-for="item in projects.list" :key="`proj-${item.id}`" class="project-card-wrapper">
              <PanelViewNewCard :project="item" :name="item.name" :creator="item.create_by"
                :create-time="tools.getLocaleDateTime(item.add_time)" :isDefault="item.is_default"
                :isFavorite="item.is_favorite" :decsString="item.desc" :fire="item.user_count"
                @enterProject="enterProject" @setDefault="setDefault" @setFavorite="setFavorite" />
            </div>
          </transition-group>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">
            <el-icon>
              <FolderOpened />
            </el-icon>
          </div>
          <p class="empty-text">暂无项目</p>
          <button class="btn-empty-action" @click="showCreateProject()">
            <el-icon>
              <Plus />
            </el-icon>
            创建第一个项目
          </button>
        </div>
      </section>
    </main>
    <DialogAnimation ref="approveProjectRef" :bgtype="'white'" :title="t('project.approve.requestDesc')"
      :cancel_title="t('project.approve.cancelDesc')" :confirm_title="t('project.approve.confirmDesc')"
      :before_comfirm="checkApproveProject">
      <div class="approve-project-form">
        <div class="form-group">
          <label class="form-label-no-required">申请理由</label>
          <textarea class="form-textarea" v-model="approveDesc"
            :placeholder="$t('project.approve.requestDescPlaceHolder')" rows="6" maxlength="500"></textarea>
          <span class="form-hint">{{ approveDesc.length }} / 500</span>
        </div>
      </div>
    </DialogAnimation>
    <DialogAnimation ref="createProjectRef" :bgtype="'white'" title="创建项目" cancel_title="取消" :confirm_title="'创建'"
      :before_comfirm="checkCreateProject">
      <div class="create-project-form">
        <div class="form-group">
          <label class="form-label">项目名称</label>
          <input class="form-input" v-model="project_name" placeholder="请输入项目名称" />
        </div>
        <div class="form-group">
          <label class="form-label">项目描述</label>
          <textarea class="form-textarea" v-model="project_desc" placeholder="请输入项目描述信息" rows="4"></textarea>
        </div>
      </div>
    </DialogAnimation>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted } from "vue";
import {
  Search,
  Close,
  Collection,
  Folder,
  Star,
  FolderOpened,
  ArrowRight,
  Plus,
  User,
} from "@element-plus/icons-vue";
import tools from "@/utils/tools";
import { ApiCreateTouchPixel } from "@/api/pixel/project";
import DialogAnimation from "@/components/common/general/dialog.vue";
import { createProjects } from "@/api/project/index";
import {
  ApiGetProjects,
  ApiGetFavoriteProjects,
  ApiDeleteFavoriteProjects,
  ApiAddFavoriteProjects,
  ApiDeleteDefaultProjects,
  ApiAddDefaultProjects,
} from "@/api/project/index";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import PanelViewNewCard from "./panelViewNewCard.vue";

const router = useRouter();
const { t } = useI18n();

// 创建项目ref
const createProjectRef: any = ref(null);
// 申请加入项目ref
const approveProjectRef: any = ref(null);
// 项目名称
const project_name = ref("");
// 项目描述
const project_desc = ref("");
// 搜索输入框动态数据
const search = ref("");
// 页面滚动状态
const isScrolled = ref(false);
// 当前页数
const currentPage = ref(1);
// 是否禁用无限滚动
const disInfinite = ref(true);
// 永久禁止无限滚动
const alwaysDisInfinite = ref(false);
// 申请理由
const approveDesc = ref("");
// 当前项目
const currentProject = ref(0);
// 防抖定时器
let searchTimer: ReturnType<typeof setTimeout> | null = null;
// 项目列表对象
const projects = reactive({
  list: [] as any,
});
const favoriteProjects = reactive({
  list: [] as any,
});
const clickAllowed = ref(true);

onMounted(async () => {
  disInfinite.value = true;
  await getProjects(20, search.value);
  await getFavoriteProject(30, search.value);
  // 监听滚动事件
  window.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});

function closedCreateProjectDialog() {
  project_name.value = "";
  project_desc.value = "";
}

function checkCreateProject() {
  if (project_name.value.length === 0) {
    window.$toast({ title: '请填写项目名称' })
    return false
  }
  if (project_desc.value.length === 0) {
    window.$toast({ title: '请填写项目描述' })
    return false
  }
  return true
}

async function showCreateProject() {
  const result = await createProjectRef.value.open()
  if (result.action !== 'cancel') {
    create_project()
  }
  project_desc.value = ''
  project_name.value = ''
}

function create_project() {
  if (project_name.value === "" || project_desc.value === "") {
    window.$toast({ title: "请输入项目名称和描述" })
    return;
  }
  const data = {
    name: project_name.value,
    desc: project_desc.value,
    source: 0,
  };
  createProjects(data).then((res: any) => {
    clearDataFromSearch();
    closedCreateProjectDialog();
  });
}

// 处理页面滚动
function handleScroll() {
  isScrolled.value = window.scrollY > 50;
}

// 搜索处理（优化的防抖实现）
function handleSearch() {
  // 清除之前的定时器
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  // 设置新的定时器
  searchTimer = setTimeout(() => {
    performSearch();
  }, 600);
}

// 执行搜索
function performSearch() {
  disInfinite.value = true;
  projects.list = [];
  favoriteProjects.list = [];
  currentPage.value = 1;
  alwaysDisInfinite.value = false;
  getProjects(20, search.value);
  getFavoriteProject(10, search.value);
}

// 清空搜索
function clearSearch() {
  search.value = "";
  clearDataFromSearch();
}

// 清空输入框，重新请求所有项目
function clearDataFromSearch() {
  alwaysDisInfinite.value = false;
  disInfinite.value = true;
  projects.list = [];
  favoriteProjects.list = [];
  currentPage.value = 1;
  getProjects(20, search.value);
  getFavoriteProject(10, search.value);
}

// 进入项目，路由跳转
async function enterProject(project: any) {
  if (project.is_member) {
    window.$toast({ title: `进入项目：${project.name}` })
    router.push({ name: "interface", params: { project: project.id } });
  } else {
    currentProject.value = project.id;
    const result = await approveProjectRef.value.open();
    if (result.action !== 'cancel') {
      confirmApproveProject();
    }
    approveDesc.value = '';
  }
}
// 获取收藏项目
function getFavoriteProject(size = 10, name = "") {
  ApiGetFavoriteProjects({ page: 1, size, name }).then((data: any) => {
    if (data.results && data.results.length > 0) {
      intervalData(data, favoriteProjects, size, false);
    } else {
      clearStatus();
    }
  });
}
// 获取项目列表API，每成功调用一次page自增1
async function getProjects(size = 10, name = "") {
  ApiGetProjects({ page: currentPage.value, size, name }).then((data: any) => {
    if (data.detail) {
      window.$toast({ title: t("response.lessData") })
      clearStatus();
      alwaysDisInfinite.value = true;
      return;
    }
    if (data.results && data.results.length > 0) {
      intervalData(data, projects, size, true);
    } else {
      // 未知错误，解锁无限滚动
      clearStatus();
    }
  });
}

function checkApproveProject() {
  if (approveDesc.value.trim() === "") {
    window.$toast({ title: t("project.approve.emptyApproveReason") });
    return false;
  }
  return true;
}

function confirmApproveProject() {
  const data = {
    type: 1,
    project: currentProject.value,
    desc: approveDesc.value,
  };
  ApiCreateTouchPixel(data).then((data: any) => {
    if (data.non_field_errors) {
      window.$toast({ title: t("project.approve.dupApprove") });
    } else if (data.result === 0) {
      window.$toast({ title: t("project.approve.abandonApplySystem") });
    } else {
      window.$toast({ title: t("project.approve.successApply") });
    }
  });
}

// 有意延迟加载数据
function intervalData(
  data: any,
  instance: any,
  size: number,
  isAllProject: any = false
) {
  let count = 0;
  disInfinite.value = true;
  instance.list = []
  const timer = setInterval(() => {
    instance.list.push(data.results[count]);
    count = count + 1;
    if (count >= data.results.length) {
      if (isAllProject) {
        currentPage.value = currentPage.value + size / 10;
      }
      clearStatus();
      clearInterval(timer);
    }
  }, 10);
}

// 开启无限滚动
function clearStatus() {
  disInfinite.value = false;
}

// 滚动加载
async function load() {
  if (alwaysDisInfinite.value === false) {
    disInfinite.value = true;
    await getProjects(10, search.value);
  }
}
// 设置默认项目
async function setDefault(project: any) {
  if (!clickAllowed.value) {
    clickAllowMessage();
    return;
  }
  clickAllowed.value = false;
  // 获取当前行为是设置默认项目还是取消默认项目
  if (project.is_default) {
    // 1、取消默认项目
    await cancelDefault(project);
    favoriteProjects.list.forEach((item: any) => {
      item.is_default = false;
    });
    window.$toast({ title: t("project.cancelDefault") })
  } else {
    // 2、设置默认项目
    await addDefault(project);
    projects.list.forEach((item: any) => {
      if (item.is_default && item.id !== project.id) {
        item.is_default = false;
      }
    });
    favoriteProjects.list.forEach((item: any) => {
      item.is_default = item.id === project.id;
    });
    window.$toast({ title: t("project.addDefault") })
    if (project.is_favorite === false) {
      addFavoriteAction(project);
      project.is_favorite = true;
    }
  }
  project.is_default = !project.is_default;
  clickAllowed.value = true;
}

async function cancelFavoriteAction(project: any) {
  // 1、取消收藏
  await cancelFavorite(project);
  // message提示
  window.$toast({ title: t("project.cancelFavorite") })
  for (let i = 0; i < favoriteProjects.list.length; i++) {
    if (favoriteProjects.list[i].id === project.id) {
      favoriteProjects.list.splice(i, 1);
      break;
    }
  }
}

async function addFavoriteAction(project: any) {
  // 2、设置收藏
  const res: any = await addFavorite(project);
  res.data.forEach((item: any) => {
    favoriteProjects.list.push(item);
  });
  window.$toast({ title: t("project.addFavorite") })
}

// 设置收藏项目
async function setFavorite(project: any) {
  if (!clickAllowed.value) {
    clickAllowMessage();
    return;
  }
  clickAllowed.value = false;
  // 获取当前行为是设置收藏项目还是取消收藏项目
  if (project.is_favorite) {
    await cancelFavoriteAction(project);
  } else {
    await addFavoriteAction(project);
  }
  project.is_favorite = !project.is_favorite;
  clickAllowed.value = true;
}

// 取消默认
async function cancelDefault(project: any) {
  return ApiDeleteDefaultProjects(project.id).then((data) => {
    return data;
  });
}

// 设置为默认
async function addDefault(project: any) {
  const data = {
    project_id: project.id.toString(),
  };
  return ApiAddDefaultProjects(data).then((data) => {
    return data;
  });
}
// 取消收藏
async function cancelFavorite(project: any) {
  const data = {
    project_ids: project.id.toString(),
  };
  return ApiDeleteFavoriteProjects(project.id, data).then((data) => {
    return data;
  });
}

// 加入收藏
async function addFavorite(project: any) {
  const data = {
    project_ids: project.id.toString(),
  };
  return ApiAddFavoriteProjects(data).then((data) => {
    return data;
  });
}

// 禁止点击提示
function clickAllowMessage() {
  window.$toast({ title: t("noticeError.clickAllowed") })
}
</script>

<style lang="scss" scoped>
// === 创建项目表单样式 ===
.create-project-form,
.approve-project-form {
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-width: 480px;
  padding: 12px 4px;

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .form-label {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
      letter-spacing: -0.2px;

      &::after {
        content: ' *';
        color: #dc2626;
        font-weight: 700;
      }
    }

    .form-label-no-required {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
      letter-spacing: -0.2px;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 14px 16px;
      font-size: 14px;
      color: #111827;
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      outline: none;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-sizing: border-box;
      font-family: inherit;
      font-weight: 500;

      &::placeholder {
        color: #9ca3af;
        font-weight: 400;
      }

      &:hover {
        background: #ffffff;
        border-color: #cbd5e1;
      }

      &:focus {
        background: #ffffff;
        border-color: #64748b;
        box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.08),
          0 1px 2px 0 rgba(0, 0, 0, 0.05);
      }
    }

    .form-textarea {
      resize: vertical;
      min-height: 110px;
      max-height: 240px;
      line-height: 1.6;
      font-weight: 400;
    }

    .form-hint {
      font-size: 12px;
      color: #9ca3af;
      text-align: right;
      margin-top: -4px;
    }
  }
}

// === 页面容器 ===
.modern-page {
  min-height: 100vh;
  background: #ffffff;
  position: relative;
  overflow-x: hidden;
}

// === 背景装饰 ===
.bg-decoration {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;

  .decoration-circle {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(66, 184, 131, 0.08) 0%, transparent 70%);
    animation: float 20s infinite ease-in-out;

    &.circle-1 {
      width: 500px;
      height: 500px;
      top: -250px;
      right: -100px;
      animation-delay: 0s;
    }

    &.circle-2 {
      width: 400px;
      height: 400px;
      bottom: -150px;
      left: -100px;
      animation-delay: -7s;
    }

    &.circle-3 {
      width: 350px;
      height: 350px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation-delay: -14s;
    }
  }
}

@keyframes float {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(30px, -30px) scale(1.1);
  }

  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

// === 页面头部 ===
.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  padding: 24px 0;

  &.scrolled {
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    margin-bottom: 24px;
  }

  .page-title-section {
    .page-main-title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px 0;
      letter-spacing: -0.5px;
    }

    .page-subtitle {
      font-size: 15px;
      color: #6b7280;
      margin: 0;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .search-box {
    position: relative;
    display: flex;
    align-items: center;
    background: #f9fafb;
    border: 1.5px solid #e5e7eb;
    border-radius: 14px;
    padding: 10px 18px;
    min-width: 320px;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

    &:hover {
      background: #ffffff;
      border-color: #d1d5db;
    }

    &:focus-within {
      background: #ffffff;
      border-color: #64748b;
      box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.08);
    }

    .search-icon {
      font-size: 18px;
      color: #9ca3af;
      margin-right: 10px;
      transition: color 0.3s;
    }

    .project-search-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 14px;
      color: #111827;
      font-weight: 500;
      padding: 0px!important;

      &::placeholder {
        color: #9ca3af;
      }
    }

    .clear-icon {
      font-size: 16px;
      color: #9ca3af;
      cursor: pointer;
      margin-left: 8px;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        background: #fef2f2;
        color: #ef4444;
      }
    }

    &:focus-within .search-icon {
      color: #475569;
    }
  }

  .btn-create-project {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: 0 2px 8px rgba(30, 41, 59, 0.2);

    .btn-icon {
      font-size: 18px;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(30, 41, 59, 0.3);
      background: linear-gradient(135deg, #334155 0%, #475569 100%);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .stats-bar {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 48px;
    display: flex;
    gap: 16px;
  }

  .stat-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 16px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 16px 20px;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

    &:hover {
      border-color: #d1d5db;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      transform: translateY(-2px);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      font-size: 22px;
      transition: all 0.3s;

      &.favorite {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        color: #ca8a04;
      }

      &.total {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        color: white;
      }
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
        line-height: 1;
      }

      .stat-label {
        font-size: 13px;
        color: #6b7280;
        font-weight: 500;
      }
    }
  }
}

// === 主内容区域 ===
.page-main {
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 48px 64px;
}

.content-section {
  margin-bottom: 56px;

  .section-title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;

    .section-title-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .section-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        border-radius: 10px;
        font-size: 20px;
        color: #475569;
      }

      .section-title {
        font-size: 20px;
        font-weight: 700;
        color: #111827;
        margin: 0;
      }
    }

    .section-badge {
      padding: 6px 14px;
      background: #f1f5f9;
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
      border-radius: 10px;
    }
  }
}

// === 收藏项目列表 ===
.favorite-projects-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.favorite-project-item {
  background: #ffffff;
  border: 1.5px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  gap: 16px;

  &:hover {
    border-color: #64748b;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-4px);

    .project-icon {
      background: linear-gradient(135deg, #334155 0%, #475569 100%);
      color: white;
      transform: rotate(-5deg) scale(1.05);
    }

    .enter-icon {
      color: #1e293b;
      transform: translateX(4px);
    }
  }

  .project-item-header {
    display: flex;
    align-items: center;
    gap: 14px;

    .project-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      border-radius: 12px;
      font-size: 22px;
      color: #6b7280;
      flex-shrink: 0;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .project-info {
      flex: 1;
      min-width: 0;

      .project-name {
        font-size: 16px;
        font-weight: 700;
        color: #111827;
        margin: 0 0 4px 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .project-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #6b7280;
        margin: 0;

        .el-icon {
          font-size: 14px;
        }
      }
    }
  }

  .project-item-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: space-between;

    .project-tag {
      padding: 4px 10px;
      background: #f3f4f6;
      color: #6b7280;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;

      &.is-default {
        background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
        color: #4f46e5;
      }
    }

    .enter-icon {
      font-size: 18px;
      color: #9ca3af;
      margin-left: auto;
      transition: all 0.3s;
    }
  }
}

// 创建项目卡片
.create-item {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #64748b;
  border-style: dashed;

  &:hover {
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border-color: #475569;
    transform: translateY(-4px) scale(1.02);

    .create-plus {
      background: linear-gradient(135deg, #334155 0%, #475569 100%);
      color: white;
      transform: rotate(90deg) scale(1.1);
    }
  }

  .create-item-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    height: 100%;
    min-height: 80px;

    .create-plus {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      color: #475569;
      border-radius: 12px;
      font-size: 24px;
      transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .create-text {
      font-size: 15px;
      font-weight: 700;
      color: #475569;
    }
  }
}

// === 所有项目网格 ===
.all-projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;

  .project-card-wrapper {
    width: 100%;
    height: 360px;
  }
}

// === 空状态 ===
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;

  .empty-icon {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    border-radius: 20px;
    font-size: 36px;
    color: #9ca3af;
    margin-bottom: 20px;
  }

  .empty-text {
    font-size: 16px;
    color: #6b7280;
    margin: 0 0 24px 0;
  }

  .btn-empty-action {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(30, 41, 59, 0.3);
      background: linear-gradient(135deg, #334155 0%, #475569 100%);
    }
  }
}

// === 动画 ===
.smooth-list-enter-active {
  transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.smooth-list-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.smooth-list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.96);
}

.smooth-list-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.smooth-list-move {
  transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.2s;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

// === 响应式 ===
@media (max-width: 1200px) {

  .page-header .header-content,
  .page-header .stats-bar,
  .page-main {
    padding-left: 32px;
    padding-right: 32px;
  }

  .favorite-projects-list {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }

  .all-projects-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;

    .project-card-wrapper {
      height: 360px;
    }
  }
}

@media (max-width: 768px) {
  .page-header .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
  }

  .page-header .page-title-section {
    .page-main-title {
      font-size: 24px;
    }
  }

  .page-header .header-actions {
    flex-direction: column;
    width: 100%;

    .search-box {
      min-width: 100%;
    }

    .btn-create-project {
      width: 100%;
      justify-content: center;
    }
  }

  .page-header .stats-bar {
    flex-direction: column;
  }

  .page-header .header-content,
  .page-header .stats-bar,
  .page-main {
    padding-left: 20px;
    padding-right: 20px;
  }

  .favorite-projects-list {
    grid-template-columns: 1fr;
  }

  .all-projects-grid {
    grid-template-columns: 1fr;
    gap: 16px;

    .project-card-wrapper {
      height: 380px;
    }
  }

  .create-project-form,
  .approve-project-form {
    min-width: 100%;

    .form-group {

      .form-input,
      .form-textarea {
        font-size: 16px; // 防止 iOS 自动缩放
      }
    }
  }
}
</style>
