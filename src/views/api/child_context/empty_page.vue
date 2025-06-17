<template>
  <div class="item-empty">
    <span
      ><img
        class="logo-img g-unselect empty-img"
        style="height: inherit"
        src="@/assets/img/projectStyle/bird-main-2.png"
        alt="empty"
    /></span>
    <div @click="open_summary" class="opening">
      <el-icon><Share /></el-icon
      ><span style="margin-left: 5px">打开项目概览</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import tools from "@/utils/tools";
import { getCurrentInstance } from "vue";
const { proxy }: any = getCurrentInstance();

function open_summary() {
  tools.message("暂未开放，敬请期待", proxy, "info");
}
</script>

<style scoped lang="scss">
.item-empty {
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;
}
.opening {
  box-sizing: border-box;
  margin-top: 10px;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 5px;
  opacity: 0.8;
  text-align: center;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.empty-img {
  margin-bottom: 1.25rem;
  display: inline-block;
  color: var(--ui-icon-color);
  font-style: normal;
  line-height: 0;
  text-align: center;
  text-transform: none;
  vertical-align: -0.125em;
  width: 100px;
  text-rendering: optimizelegibility;
  -webkit-font-smoothing: antialiased;
}
</style>
