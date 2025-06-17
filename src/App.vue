<template>
  <div style="height: 100%;display: flex;flex-direction: column;">
    <el-config-provider :locale="store.state.locale">
      <!-- <el-affix
        :offset="0"
        :class="{ 'header-affix': upHeaderZIndex }"
        style="position: relative; height: 55px"
      >
      <div>
        <commonHeader style="height: inherit;" @up="upZIndex" />
      </div>
      </el-affix> -->
      <div class="header-affix">
        <commonHeader style="height: inherit;" @up="upZIndex" />
      </div>
    </el-config-provider>
    <router-view v-if="flag" class="main-router" />
    </div>
</template>
<script setup lang="ts">
import commonHeader from "./components/layout/headers/commonHeader.vue";
import { useStore } from "@/store";
import { onMounted, ref } from "vue";

const upHeaderZIndex = ref(false);

const store = useStore();
const flag = ref(false);

onMounted(() => {
  // 异步延缓main-router加载时机
  flag.value = true;
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
