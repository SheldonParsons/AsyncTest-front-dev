<template>
  <div style="height: 100%;display: flex;flex-direction: column;">
    <el-config-provider :locale="store.state.locale">
      <div class="header-affix">
        <commonHeader style="height: inherit;" @up="upZIndex" />
      </div>
    </el-config-provider>
    <router-view v-if="flag" class="main-router" />
    <ToastView ref="toastRef"/>
  </div>
</template>
<script setup lang="ts">
import commonHeader from "./components/layout/headers/commonHeader.vue";
import { useStore } from "@/store";
import { onMounted, ref } from "vue";
import ToastView from '@/views/api/public_dialog/motion_dev_component/toast_animation.vue'

const upHeaderZIndex = ref(false);

const toastRef = ref()
const store = useStore();
const flag = ref(false);

onMounted(() => {
  // 异步延缓main-router加载时机
  flag.value = true;
  // 全局挂载方法，供全项目调用
  if (toastRef.value?.showToast) {
    // @ts-ignore
    window.$toast = toastRef.value.showToast
  }
});

function upZIndex(flag: boolean) {
  upHeaderZIndex.value = flag;
}
</script>

<style lang="scss">
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.header-affix {
  height: 55px;
  width: 100%;
  border-bottom: 1px solid #dcdfe6;
}
</style>
