<template>
  <div class="header-wrapper">
    <div class="header-modern" :class="{ 'header-light': isLogin, 'header-ready': isReady }">
      <!-- Animated blur background -->
      <div class="header-blur-bg">
        <div class="blur-orb orb-1"></div>
        <div class="blur-orb orb-2"></div>
        <div class="blur-orb orb-3"></div>
      </div>

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
            <!-- Check for Update -->
            <div v-if="isElectron" class="action-item">
              <AstTooltip :isOpen="tooltipStates.update" side="bottom">
                <template #trigger>
                  <div class="action-btn" @mouseenter="tooltipStates.update = true"
                    @mouseleave="tooltipStates.update = false" @click="checkForUpdate">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 13V7" />
                      <path
                        d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                      <path d="m9 10 3 3 3-3" />
                    </svg>
                  </div>
                </template>
                <span>检查更新</span>
              </AstTooltip>
            </div>
            <!-- Dashboard -->
            <div v-if="isElectron" class="action-item">
              <AstTooltip :isOpen="tooltipStates.dashboard" side="bottom">
                <template #trigger>
                  <div class="action-btn" @mouseenter="tooltipStates.dashboard = true"
                    @mouseleave="tooltipStates.dashboard = false" @click="toDashboard">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path
                        d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                      <path d="m3.3 7 8.7 5 8.7-5" />
                      <path d="M12 22V12" />
                    </svg>
                  </div>
                </template>
                <span>Dashboard</span>
              </AstTooltip>
            </div>
            <!-- Dashboard/Projects -->
            <div v-if="isLoggedIn" class="action-item">
              <AstTooltip :isOpen="tooltipStates.project" side="bottom">
                <template #trigger>
                  <div class="action-btn" @mouseenter="tooltipStates.project = true"
                    @mouseleave="tooltipStates.project = false" @click="toProject">
                    <AnimatedHomeIcon :size="20" />
                  </div>
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

            <!-- Documentation -->
            <div class="action-item">
              <AstTooltip :isOpen="tooltipStates.docs" side="bottom">
                <template #trigger>
                  <a v-if="!isElectron" :href="GlobalStatus.product_docs_host" target="_blank" rel="noopener noreferrer"
                    class="action-btn" @mouseenter="tooltipStates.docs = true" @mouseleave="tooltipStates.docs = false">
                    <AnimatedDocIcon :size="20" />
                  </a>
                  <div v-else class="action-btn" @mouseenter="tooltipStates.docs = true"
                    @mouseleave="tooltipStates.docs = false" @click="openDocsInBrowser">
                    <AnimatedDocIcon :size="20" />
                  </div>
                </template>
                <span>文档</span>
              </AstTooltip>
            </div>
          </div>

          <!-- Divider -->
          <div class="header-divider"></div>

          <!-- Language Switcher -->
          <div class="action-item">
            <el-dropdown trigger="click">
              <div class="action-btn">
                <AnimatedLanguageIcon :size="20" />
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="langHandleSelect(zhCn)">
                    <span class="lang-option">
                      <span class="lang-flag">CN</span>
                      <span>中文</span>
                    </span>
                  </el-dropdown-item>
                  <el-dropdown-item @click="langHandleSelect(en)">
                    <span class="lang-option">
                      <span class="lang-flag">EN</span>
                      <span>English</span>
                    </span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- Divider -->
          <div class="header-divider"></div>

          <!-- User Section -->
          <div class="user-section">
            <div class="action-item">
              <AstTooltip :isOpen="tooltipStates.profile" side="bottom">
                <template #trigger>
                  <div class="avatar-container" @mouseenter="tooltipStates.profile = true"
                    @mouseleave="tooltipStates.profile = false" @click="handleAvatarClick">
                    <el-avatar :size="36" :src="userImage" class="user-avatar" />
                    <div class="online-indicator"></div>
                  </div>
                </template>
                <span>个人信息</span>
              </AstTooltip>
            </div>

            <!-- Logout -->
            <div v-if="isLoggedIn" class="action-item">
              <AstTooltip :isOpen="tooltipStates.logout" side="bottom">
                <template #trigger>
                  <div class="action-btn logout-btn" @mouseenter="tooltipStates.logout = true"
                    @mouseleave="tooltipStates.logout = false" @click="logout">
                    <AnimatedLogoutIcon :size="20" />
                  </div>
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
    <LoginComponent @loginSuccess="handleLoginSuccess" />
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
import AnimatedLanguageIcon from "@/assets/svg/header/AnimatedLanguageIcon.vue"
import AnimatedLogoutIcon from "@/assets/svg/header/AnimatedLogoutIcon.vue"
import AnimatedDocIcon from "@/assets/svg/header/AnimatedDocIcon.vue"
import AnimatedHomeIcon from "@/assets/svg/header/AnimatedHomeIcon.vue"
import GlobalStatus from "@/global";
import UserProfileDialog from "@/components/layout/dialogs/UserProfileDialog.vue"
import DialogAnimation from '@/components/common/general/dialog.vue'
import LoginComponent from '@/views/electron_views/login.vue'

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
const userImage = ref(
  "https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/99.png"
)

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
const isLoggedIn = ref(checkLoginStatus())

// Tooltip states
const tooltipStates = reactive({
  update: false,
  dashboard: false,
  project: false,
  plugin: false,
  docs: false,
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
  getLanguage()
  getHeader(router.currentRoute.value)
  getUserImage()

  // 初始化登录状态
  isLoggedIn.value = checkLoginStatus()

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

router.afterEach(async (to: any) => {
  if (!to.params.project) {
    inProject.value = false
  } else {
    const res = await get_project_info()
    if (res) {
      animateProjectName()
    }
  }
})

router.beforeEach(async (to: any, from: any, next: any) => {
  getLanguage()
  getHeader(to)
  next()
})

function getHeader(r: any) {
  isLogin.value = r.name && r.name.indexOf("login") === -1
  store.dispatch("saveGlobalHeader", isLogin.value)
}

function getUserImage() {
  store.dispatch("getUser").then((res: any) => {
    if (res && res.id) {
      userImage.value = `https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/${res.id}.png`
    }
  })
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
  isLoggedIn.value = false
  if (import.meta.env.VITE_IS_ELECTRON === 'true') {
    router.push({ name: "dashboard" })
  } else {
    router.push({ name: "login" })
  }
}

async function logout() {
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

function checkForUpdate() {
  if (isElectron && window.electronAPI) {
    window.electronAPI.send('check-for-update');
  }
}

function openUserProfile() {
  userProfileDialogRef.value?.open()
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
  isLoggedIn.value = true
  getUserImage()
  if (isElectron && window.electronAPI?.wm?.broadcast) {
    void window.electronAPI.wm.broadcast('auth:login', { sourceWindow: currentWindowKey.value })
  }
}

// 在桌面端打开文档
function openDocsInBrowser() {
  if (isElectron && window.electronAPI) {
    window.electronAPI.openExternal(GlobalStatus.product_docs_host);
  }
}

// 更新登录状态（暴露给外部调用）
function updateLoginStatus() {
  isLoggedIn.value = checkLoginStatus()
  if (isLoggedIn.value) {
    getUserImage()
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
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: auto;

  &.header-ready {
    opacity: 1;
  }

  &.header-light {
    background: rgba(255, 255, 255, 0.85);
  }
}

// Animated blur background
.header-blur-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.blur-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(50px);
  opacity: 0.35;
  will-change: transform;
  animation: floatOrb 20s ease-in-out infinite;

  &.orb-1 {
    width: 220px;
    height: 220px;
    background: linear-gradient(135deg, #34d399 0%, #6ee7b7 100%);
    top: -100px;
    left: 15%;
    animation-name: floatOrb1;
    animation-duration: 25s;
    animation-delay: 0s;
  }

  &.orb-2 {
    width: 180px;
    height: 180px;
    background: linear-gradient(135deg, #a1a1aa 0%, #d4d4d8 100%);
    top: -80px;
    right: 18%;
    animation-name: floatOrb2;
    animation-duration: 28s;
    animation-delay: -8s;
  }

  &.orb-3 {
    width: 200px;
    height: 200px;
    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    bottom: -90px;
    left: 65%;
    animation-name: floatOrb3;
    animation-duration: 30s;
    animation-delay: -16s;
  }
}

@keyframes floatOrb1 {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  25% {
    transform: translate(20px, -15px) scale(1.08);
  }

  50% {
    transform: translate(-15px, -10px) scale(0.92);
  }

  75% {
    transform: translate(-20px, 12px) scale(1.05);
  }
}

@keyframes floatOrb2 {

  0%,
  100% {
    transform: translate(0, 0) scale(1) rotate(0deg);
  }

  33% {
    transform: translate(-18px, 15px) scale(1.06) rotate(5deg);
  }

  66% {
    transform: translate(15px, -12px) scale(0.94) rotate(-5deg);
  }
}

@keyframes floatOrb3 {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  30% {
    transform: translate(18px, 10px) scale(1.04);
  }

  60% {
    transform: translate(-12px, -15px) scale(0.96);
  }

  90% {
    transform: translate(10px, -8px) scale(1.02);
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

  &:hover {
    background: rgba(16, 185, 129, 0.05);

    .logo-image {
      filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.4));
      transform: scale(1.05) rotate(5deg);
    }

    .logo-text {
      color: #10b981;
      text-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
      transform: translateX(2px);
    }
  }
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
  background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%);
  border-radius: 18px;
  visibility: hidden;
  box-shadow: 0 2px 12px rgba(16, 185, 129, 0.25);
  position: relative;
  overflow: hidden;
  will-change: transform;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
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
    color: white;
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



.action-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.action-item {
  position: relative;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-decoration: none;
  position: relative;
  will-change: transform;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    background: rgba(16, 185, 129, 0.1);
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover {
    color: #059669;
    animation: iconBounce 0.6s ease;

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: scale(0.95) translateY(0);
  }
}

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
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.6);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);

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
  height: 24px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 4px;
}

// User section
.user-section {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  padding-left: 6px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.avatar-container {
  position: relative;
  cursor: pointer;

  .user-avatar {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 2px solid rgba(0, 0, 0, 0.08);
    will-change: transform;
  }

  .online-indicator {
    position: absolute;
    bottom: 1px;
    right: 1px;
    width: 10px;
    height: 10px;
    background: #10b981;
    border: 2px solid #fff;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  &:hover .user-avatar {
    transform: scale(1.1) rotate(5deg);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
}

@keyframes pulse {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }

  50% {
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
  }
}

.logout-btn {
  &:hover {
    background: rgba(239, 68, 68, 0.1) !important;
    color: #dc2626 !important;
  }
}

// Language option
.lang-option {
  display: flex;
  align-items: center;
  gap: 8px;

  .lang-flag {
    padding: 2px 5px;
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    color: white;
  }
}
</style>
