<template>
  <div class="header-wrapper">
    <div class="header-modern" :class="{ 'header-light': isLogin, 'header-ready': isReady }">
      <!-- Header content with fade in -->
      <div class="header-content" :class="{ 'content-visible': isReady }">
        <!-- Left section: Logo & Project info -->
        <div class="header-left">
          <div class="logo-section" @click="toProject">
            <img class="logo-image g-unselect"
              src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full.svg" alt="AsyncTest" />
            <span class="logo-text g-unselect">AsyncTest</span>
          </div>

          <!-- Project label with animation -->
          <transition name="slide-fade">
            <div v-if="inProject" class="project-badge" ref="containerRef">
              <motion.span class="project-name-text">{{ project_name }}</motion.span>
            </div>
          </transition>
        </div>

        <!-- Right section: Actions -->
        <div class="header-right">
          <!-- Quick Actions Group -->
          <div class="action-group">
            <!-- Dashboard -->
            <div v-if="isElectron" class="action-item">
              <AstTooltip :isOpen="tooltipStates.dashboard" side="bottom">
                <template #trigger>
                  <button type="button" class="action-btn" @mouseenter="tooltipStates.dashboard = true"
                    @mouseleave="tooltipStates.dashboard = false" aria-label="应用首页" @click="toDashboard">
                    <LayoutDashboard :size="20" :stroke-width="1.8" aria-hidden="true" />
                  </button>
                </template>
                <span>Dashboard</span>
              </AstTooltip>
            </div>
            <!-- Dashboard/Projects -->
            <div v-if="isLoggedIn" class="action-item">
              <AstTooltip :isOpen="tooltipStates.project" side="bottom">
                <template #trigger>
                  <button type="button" class="action-btn" @mouseenter="tooltipStates.project = true"
                    @mouseleave="tooltipStates.project = false" aria-label="项目列表" @click="toProject">
                    <Folders :size="20" :stroke-width="1.8" aria-hidden="true" />
                  </button>
                </template>
                <span>项目</span>
              </AstTooltip>
            </div>

            <!-- IntelliJ Plugin Download -->
            <div class="action-item">
              <AstTooltip :isOpen="tooltipStates.plugin" side="bottom">
                <template #trigger>
                  <a :href="pluginDownloadUrl" class="action-btn plugin-link" download
                    @mouseenter="tooltipStates.plugin = true" @mouseleave="tooltipStates.plugin = false">
                    <div class="idea-icon-wrapper">
                      <img :src="ideaIconUrl" alt="IntelliJ IDEA" class="idea-icon" />
                      <div class="download-indicator">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                      </div>
                    </div>
                  </a>
                </template>
                <span>AsyncTest Caller 插件下载</span>
              </AstTooltip>
            </div>


          </div>

          <!-- Divider -->
          <div class="header-divider"></div>

          <!-- User Section -->
          <div class="user-section">
            <div class="action-item">
              <AstTooltip :isOpen="tooltipStates.profile" side="bottom">
                <template #trigger>
                  <AccountMenu :logged-in="isLoggedIn" @profile="openUserProfile" @login="handleAccountLogin">
                    <button class="avatar-container" type="button" aria-label="账户菜单" title="账户菜单">
                      <el-avatar :key="userAvatarRenderKey" :size="36" :src="userImage" class="user-avatar" />
                    </button>
                  </AccountMenu>
                </template>
                <span>账户菜单</span>
              </AstTooltip>
            </div>

            <!-- Logout -->
            <div v-if="isLoggedIn" class="action-item">
              <AstTooltip :isOpen="tooltipStates.logout" side="bottom">
                <template #trigger>
                  <button type="button" class="action-btn logout-btn" @mouseenter="tooltipStates.logout = true"
                    @mouseleave="tooltipStates.logout = false" aria-label="退出登录" @click="logout">
                    <AnimatedLogoutIcon :size="20" />
                  </button>
                </template>
                <span>{{ $t('tooltip.logout') }}</span>
              </AstTooltip>
            </div>
          </div>
        </div>
      </div>
      <WinWindowControls v-if="!isMac && isElectron" class="action-item windows-action" @minimize="minimize" @maximizeToggle="maximize" @close="close" />
    </div>
  </div>

  <!-- User Profile Dialog -->
  <UserProfileDialog ref="userProfileDialogRef" />

  <!-- 登录弹窗 -->
  <DialogAnimation ref="loginDialogRef" title="登录" bgtype="white" :showCancel="false" :showComfirm="false">
    <LoginComponent :redirect-on-success="false" @loginSuccess="handleLoginSuccess" />
  </DialogAnimation>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, computed } from "vue"
import { motion, animate, stagger } from "motion-v"
import { splitText } from "motion-plus"
import zhCn from "element-plus/es/locale/lang/zh-cn"
import en from "element-plus/es/locale/lang/en"
import WinWindowControls from '@/components/layout/headers/WinWindowControls.vue'
import { useI18n } from "vue-i18n"
import { useStore } from "@/store"
import { useRouter, useRoute } from "vue-router"
import { ClearServerCookie } from "@/api/layout/cookies"
import { ApiGetSingleProjects } from "@/api/project/index"
import AstTooltip from "@/components/common/general/tooltip.vue"
import asyncTest from '@/db'

// Animated Icons
import { LayoutDashboard, Folders } from '@/components/icons/lucide'
import AnimatedLogoutIcon from "@/assets/svg/header/AnimatedLogoutIcon.vue"
import GlobalStatus from "@/global";
import { isSessionAuthorized, setAuthStatus, readLocalAuthToken, navigateToUnauthenticated, vibeAuthState } from '@/utils/authNavigation'
import AccountMenu from "@/components/layout/AccountMenu.vue"
import UserProfileDialog from "@/components/layout/dialogs/UserProfileDialog.vue"
import DialogAnimation from '@/components/common/general/dialog.vue'
import LoginComponent from '@/views/electron_views/login.vue'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'

const store: any = useStore()
const router: any = useRouter()
const route: any = useRoute()
const isLogin = ref(false)
const inProject = ref(false)
const project_name = ref("loading...")
const isReady = ref(false)
const { locale: localeLang } = useI18n()
const isMac = computed(() => window.electronAPI?.platform === 'darwin');
const currentWindowKey = computed(() => (route.query.windowKey as string) || 'main')
const {
  profile: currentUserProfile,
  avatarUrl: userImage,
  avatarRenderKey: userAvatarRenderKey,
  fetchProfile,
  applyProfile,
  clearProfile,
  ensureProfileSync,
} = useCurrentUserProfile()

function minimize() {
  window.electronAPI?.wm?.control('main', 'minimize');
}
function maximize() {
  window.electronAPI?.wm?.control('main', 'maximizeToggle');
}
function close() {
  window.electronAPI?.wm?.control('main', 'close');
}

const isElectron = import.meta.env.VITE_IS_ELECTRON === 'true';

// 检查登录状态
const checkLoginStatus = () => {
  const currentCookie = asyncTest.cookies.getCookie(GlobalStatus.cookieTag)
  return currentCookie !== false
}

// 登录状态（响应式）
const isLoggedIn = computed(() => { void vibeAuthState.status; return isSessionAuthorized() })

// Tooltip states
const tooltipStates = reactive({
  dashboard: false,
  project: false,
  plugin: false,
  logout: false,
  profile: false
})

// External URLs
const pluginDownloadUrl = "https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/AsyncTestCallerDocs/AsyncTest%20Caller.zip"
const ideaIconUrl = "https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/IntelliJ_IDEA_Icon.svg"

const containerRef = ref<HTMLDivElement | null>(null)
const userProfileDialogRef = ref<InstanceType<typeof UserProfileDialog> | null>(null)
const loginDialogRef = ref<any>(null)
let removeAuthLogoutListener: (() => void) | null = null
let removeAuthLoginListener: (() => void) | null = null

const emit = defineEmits(["up"])

onMounted(async () => {
  ensureProfileSync()
  getLanguage()
  getHeader(router.currentRoute.value)
  getUserImage()

  // 初始化登录状态
  // 身份状态由服务端验证结果驱动。

  // Wait for next tick then show content
  await nextTick()
  setTimeout(() => {
    isReady.value = true
  }, 50)

  if (isElectron && window.electronAPI?.on) {
    removeAuthLogoutListener = window.electronAPI.on('auth:logout', (_event: any, payload: { sourceWindow?: string } = {}) => {
      if (payload?.sourceWindow === currentWindowKey.value) return
      applyLoggedOutState()
    })
    removeAuthLoginListener = window.electronAPI.on('auth:login', (_event: any, payload: { sourceWindow?: string } = {}) => {
      if (payload?.sourceWindow === currentWindowKey.value) return
      updateLoginStatus()
    })
  }

  const res = await get_project_info()
  if (res) {
    animateProjectName()
  }
})

onBeforeUnmount(() => {
  removeHeaderAfterHook()
  removeHeaderBeforeHook()
  removeAuthLogoutListener?.()
  removeAuthLogoutListener = null
  removeAuthLoginListener?.()
  removeAuthLoginListener = null
})

async function get_project_info() {
  const id = route.params.project
  if (id === undefined) {
    return false
  }
  inProject.value = true
  await ApiGetSingleProjects({}, id).then(async (res: any) => {
    project_name.value = res.data.name
  })
  return true
}

function animateProjectName() {
  document.fonts.ready.then(() => {
    if (!containerRef.value) return
    containerRef.value.style.visibility = "visible"
    const spanEl = containerRef.value.querySelector("span")
    if (!spanEl) return
    const { words } = splitText(spanEl)
    animate(
      words,
      { opacity: [0, 1], y: [10, 0] },
      {
        type: "spring",
        duration: 2,
        bounce: 0,
        delay: stagger(0.05),
      }
    )
  })
}

const removeHeaderAfterHook = router.afterEach(async (to: any) => {
  if (!to.params.project) {
    inProject.value = false
  } else {
    const res = await get_project_info()
    if (res) {
      animateProjectName()
    }
  }
})

const removeHeaderBeforeHook = router.beforeEach(async (to: any, from: any, next: any) => {
  getLanguage()
  getHeader(to)
  next()
})

function getHeader(r: any) {
  isLogin.value = r.name && r.name.indexOf("login") === -1
  store.dispatch("saveGlobalHeader", isLogin.value)
}

async function getUserImage(force = false) {
  if (!checkLoginStatus()) {
    clearProfile()
    return
  }
  const loaded = await fetchProfile(force)
  if (loaded) return

}

function getLanguage() {
  store.dispatch("getLanguage").then((res: any) => {
    if (res === null) {
      langHandleSelect(zhCn)
    } else {
      langHandleSelect(res)
    }
  })
}

function langHandleSelect(e: any) {
  if (e.name === "zh-cn") {
    store.dispatch("saveLanguage", zhCn)
    localeLang.value = "zh"
  } else if (e.name === "en") {
    store.dispatch("saveLanguage", en)
    localeLang.value = "en"
  }
}

function applyLoggedOutState() {
  setAuthStatus('unauthorized')
  clearProfile()
  void navigateToUnauthenticated()
}

async function logout() {
  if (isElectron) {
    const agentLogout = window.electronAPI?.vibeAgent?.logout
    if (!agentLogout) {
      window.$toast({ title: '退出登录失败，请更新客户端', type: 'error' })
      return
    }
    try {
      let accountId = String(currentUserProfile.value?.id || '').trim()
      if (!accountId) {
        const cachedUser = await store.dispatch("getUser").catch(() => null)
        accountId = String(cachedUser?.userId || '').trim()
      }
      await agentLogout(accountId ? { accountId } : {})
    } catch {
      window.$toast({ title: '退出登录失败，请稍后重试', type: 'error' })
      return
    }
  }
  await ClearServerCookie()
  window.$toast({ title: '退出登录' })
  applyLoggedOutState()
  if (isElectron && window.electronAPI?.wm?.broadcast) {
    await window.electronAPI.wm.broadcast('auth:logout', { sourceWindow: currentWindowKey.value })
  }
}

function toProject() {
  router.push({ name: "project" })
  inProject.value = false
}

function toDashboard() {
  router.push({ name: "dashboard" })
}


async function openUserProfile() {
  const loaded = await fetchProfile(true)
  if (loaded) await userProfileDialogRef.value?.open(false)
  else if (!readLocalAuthToken()) loginDialogRef.value?.open()
  else window.$toast({ title: '暂时无法连接服务器，个人信息不可用', type: 'warning' })
}
async function handleAccountLogin() {
  if (readLocalAuthToken()) {
    const loaded = await fetchProfile(true)
    if (loaded) { await userProfileDialogRef.value?.open(false); return }
    if (readLocalAuthToken()) { window.$toast({ title: '暂时无法连接服务器，本地功能仍可使用', type: 'warning' }); return }
  }
  loginDialogRef.value?.open()
}

// 处理头像点击
function handleAvatarClick() {
  if (checkLoginStatus()) {
    openUserProfile()
  } else {
    loginDialogRef.value?.open()
  }
}

// 登录成功回调
function handleLoginSuccess() {
  loginDialogRef.value?.close()
  // 更新登录状态
  setAuthStatus('authorized')
  getUserImage(true)
  if (isElectron && window.electronAPI?.wm?.broadcast) {
    void window.electronAPI.wm.broadcast('auth:login', { sourceWindow: currentWindowKey.value })
  }
}

// 更新登录状态（暴露给外部调用）
function updateLoginStatus() {
  // 身份状态由服务端验证结果驱动。
  if (readLocalAuthToken()) {
    void getUserImage(true)
  } else {
    clearProfile()
  }
}

// 暴露方法给父组件
defineExpose({
  updateLoginStatus
})
</script>

<style lang="scss" scoped>
.header-wrapper {
  height: 100%;
  width: 100%;
  -webkit-app-region: drag;
}

.header-modern {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 0 20px;
  box-sizing: border-box;
  position: relative;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: auto;

  &.header-ready {
    opacity: 1;
  }

  &.header-light {
    background: rgba(255, 255, 255, 0.78);
  }
}

// Header content with fade in
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  opacity: 0;
  transform: translateY(-5px);
  transition: opacity 0.4s ease, transform 0.4s ease;
  padding-top: 5px;
  padding-bottom: 5px;

  &.content-visible {
    opacity: 1;
    transform: translateY(0);
  }
}

// Left section
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 1;
  -webkit-app-region: no-drag !important;
  pointer-events: auto !important;
}

// Right section
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
  -webkit-app-region: no-drag !important;
  pointer-events: auto !important;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 8px;
  margin-left: -8px;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover { background: rgba(0,0,0,.025); }

}

.logo-image {
  height: 19px;
  width: auto;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform;
}

.logo-text {
  font-family: "Monoton-Regular", sans-serif;
  font-size: 24px;
  font-weight: 400;
  color: #059669;
  letter-spacing: 2px;
  transition: all 0.3s ease;
  will-change: transform, color;
  text-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  display: flex;
  align-items: start;
  line-height: 24px;
  vertical-align: 5px;
  transform: translateY(2px);
}

.logo-full {
  height: 19px;
  width: auto;
  transition: all 0.3s ease;
}

// Project badge - softer gradient
.project-badge {
  display: flex;
  align-items: center;
  padding: 5px 14px;
  background: rgba(0,0,0,.035);
  border: 1px solid rgba(0,0,0,.06);
  border-radius: 18px;
  visibility: hidden;
  box-shadow: none;
  position: relative;
  overflow: hidden;
  will-change: transform;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,.04);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
    animation: shimmer 3s infinite;
  }

  .project-name-text {
    font-size: 12px;
    font-weight: 600;
    color: #555;
    position: relative;
    z-index: 1;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
}

@keyframes shimmer {
  0% {
    left: -100%;
  }

  100% {
    left: 100%;
  }
}

// Slide fade transition
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(-10px);
  opacity: 0;
}



.action-group { display: flex; align-items: center; gap: 4px; padding: 0; background: transparent; border: 0; }
.action-item { position: relative; }
.action-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; border: 1px solid transparent; border-radius: 9px; color: #707070; background: transparent; cursor: pointer; text-decoration: none; position: relative; transition: color .16s, background .16s, border-color .16s; }
.action-btn:hover { color: #242424; background: rgba(0,0,0,.04); border-color: rgba(0,0,0,.04); }
.action-btn:active { background: rgba(0,0,0,.07); }
.action-btn:focus-visible { outline: 2px solid #6c6c6c; outline-offset: 2px; }

// Plugin link with bounce animation
.plugin-link {
  &:hover {
    animation: none;
  }

  .idea-icon-wrapper {
    position: relative;
    width: 20px;
    height: 20px;

    .idea-icon {
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      opacity: 0.75;
    }

    .download-indicator {
      position: absolute;
      bottom: -5px;
      right: -5px;
      width: 12px;
      height: 12px;
      background: #444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.6);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 2px 8px rgba(0,0,0,.14);

      svg {
        width: 8px;
        height: 8px;
        color: white;
      }
    }
  }

  &:hover {
    .idea-icon {
      opacity: 1;
      transform: scale(1.15) rotate(-5deg);
    }

    .download-indicator {
      opacity: 1;
      transform: scale(1);
      animation: bounce 0.6s ease infinite;
    }
  }
}

@keyframes bounce {

  0%,
  100% {
    transform: scale(1) translateY(0);
  }

  50% {
    transform: scale(1) translateY(-3px);
  }
}

@keyframes iconBounce {

  0%,
  100% {
    transform: translateY(0);
  }

  25% {
    transform: translateY(-4px);
  }

  50% {
    transform: translateY(0);
  }

  75% {
    transform: translateY(-2px);
  }
}

// Divider
.header-divider {
  width: 1px;
  height: 20px;
  background: rgba(0,0,0,.075);
  margin: 0 8px;
}

// User section
.user-section { display: flex; align-items: center; gap: 10px; padding: 0; background: transparent; border: 0; }

.avatar-container {
  position: relative;
  display: inline-flex;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  line-height: 0;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #111111;
    outline-offset: 3px;
  }

  .user-avatar {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 0;
    will-change: transform;
  }

  &:hover .user-avatar {
    transform: scale(1.03);
    box-shadow: 0 0 0 3px rgba(0,0,0,.04);
  }
}

.logout-btn {
  &:hover {
    background: rgba(0,0,0,.045) !important;
    color: #242424 !important;
  }
}

</style>
