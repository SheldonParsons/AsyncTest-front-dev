<template>
  <el-config-provider v-if="flag" :locale="store.state.locale">
    <el-affix :offset="0" :class="{ 'header-affix': upHeaderZIndex }">
      <commonHeader @up="upZIndex"
    /></el-affix>
    <router-view class="main-router"></router-view>
  </el-config-provider>
</template>
<script setup lang="ts">
import commonHeader from './components/layout/headers/commonHeader.vue'
import { useStore } from '@/store'
import { ref } from 'vue'

const upHeaderZIndex = ref(false)

const store = useStore()

// 异步延缓main-router加载时机
const flag = ref(false)
setTimeout(() => {
  flag.value = true
}, 0)

function upZIndex(flag: boolean) {
  upHeaderZIndex.value = flag
}
</script>

<style lang="scss">
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.header-affix {
  .el-affix--fixed {
    z-index: 200 !important;
  }
}
</style>
