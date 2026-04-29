<template>
  <div style="height: 100%;display: flex;flex-direction: column;">
    <div class="header-affix" v-if="route.path !== '/login' && isMainWindow" @mouseenter="switchWindowBtn(true)"
      @mouseleave="switchWindowBtn(false)">
      <div class="drag-layer"></div>
      <commonHeader ref="commonHeaderRef" style="height: inherit;" @up="upZIndex" class="ui-layer" />
    </div>
    <router-view v-if="flag" class="main-router" @doubleCheckLoginStatus="check_login_status" />
    <button
      v-if="isMainWindow && route.path !== '/login'"
      class="admin-debug-entry"
      title="调试台"
      @click="goDebugConsole"
    >
      <el-icon><Monitor /></el-icon>
    </button>
    <ToastView ref="toastRef" />
    <UpdateDialog v-if="isMainWindow"></UpdateDialog>
  </div>
</template>
<script setup lang="ts">
import commonHeader from "./components/layout/headers/commonHeader.vue";
import { useRoute, useRouter } from 'vue-router'
import { onMounted, ref, computed } from "vue";
import { Monitor } from '@element-plus/icons-vue'
import ToastView from '@/views/api/public_dialog/motion_dev_component/toast_animation.vue'
import UpdateDialog from "@/views/electron_views/global/UpdateDialog.vue";

const upHeaderZIndex = ref(false);
const isElectron = import.meta.env.VITE_IS_ELECTRON === 'true';
const isMainWindow = computed(() => (route.query.windowKey || 'main') === 'main');
const toastRef = ref()
const commonHeaderRef = ref()
const route = useRoute()
const router = useRouter()
const flag = ref(false);

onMounted(() => {
  // 异步延缓main-router加载时机
  flag.value = true;
  // 全局挂载方法，供全项目调用
  if (toastRef.value?.showToast) {
    // @ts-ignore
    window.$toast = toastRef.value.showToast
  }
  // 全局挂载 commonHeader 更新登录状态的方法
  // @ts-ignore
  window.$updateHeaderLoginStatus = () => {
    commonHeaderRef.value?.updateLoginStatus()
  }
});

function check_login_status() {
  commonHeaderRef.value?.updateLoginStatus()
}

function switchWindowBtn(open: boolean) {
  if (window.electronAPI && isElectron) {
    window.electronAPI.toggleTrafficLights(open);
  }
}

function upZIndex(flag: boolean) {
  upHeaderZIndex.value = flag;
}

function goDebugConsole() {
  if (isElectron && window.electronAPI?.wm?.open) {
    window.electronAPI.wm.open({
      key: 'admin-debug-console',
      title: 'Admin Debug Console',
      route: '/admin/debug',
      width: 1280,
      height: 820,
      minWidth: 1040,
      minHeight: 680,
      parentKey: null,
      hideMainOnOpen: false,
      closeBehavior: 'close',
    })
    return
  }
  router.push({ name: 'adminDebugConsole' })
}
</script>

<style lang="scss">
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

// .header-affix {
//   width: 100%;
//   border-bottom: 1px solid #dcdfe6;
//   -webkit-app-region: no-drag;
// }

.header-affix {
  width: 100%;
  height: 55px;
  /* 【必须】：显式给一个高度，否则内部 inherit 会失效 */
  position: relative;
  background-color: transparent;
  /* 这一层必须是 no-drag，否则 mouseenter 会被拦截 */
  -webkit-app-region: no-drag;
  border-bottom: 1px solid #dcdfe6;
  z-index: 100;
}

.admin-debug-entry {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 1000;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(15, 118, 110, .24);
  background: #111827;
  color: #ecfeff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(15, 23, 42, .22);
  -webkit-app-region: no-drag;
}

.admin-debug-entry:hover {
  background: #0f766e;
}
</style>
