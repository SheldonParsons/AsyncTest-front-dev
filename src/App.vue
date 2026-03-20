<template>
  <div style="height: 100%;display: flex;flex-direction: column;">
    <div class="header-affix" v-if="route.path !== '/login' && isMainWindow" @mouseenter="switchWindowBtn(true)"
      @mouseleave="switchWindowBtn(false)">
      <div class="drag-layer"></div>
      <commonHeader ref="commonHeaderRef" style="height: inherit;" @up="upZIndex" class="ui-layer" />
    </div>
    <router-view v-if="flag" class="main-router" @doubleCheckLoginStatus="check_login_status" />
    <ToastView ref="toastRef" />
    <UpdateDialog v-if="isMainWindow"></UpdateDialog>
  </div>
</template>
<script setup lang="ts">
import commonHeader from "./components/layout/headers/commonHeader.vue";
import { useRoute } from 'vue-router'
import { onMounted, ref, computed } from "vue";
import ToastView from '@/views/api/public_dialog/motion_dev_component/toast_animation.vue'
import UpdateDialog from "@/views/electron_views/global/UpdateDialog.vue";

const upHeaderZIndex = ref(false);
const isElectron = import.meta.env.VITE_IS_ELECTRON === 'true';
const isMainWindow = computed(() => (route.query.windowKey || 'main') === 'main');
const toastRef = ref()
const commonHeaderRef = ref()
const route = useRoute()
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
</style>
