<template>
  <div class="item-empty">
    <span
      ><img
        class="logo-img g-unselect empty-img"
        style="height: inherit"
        src="@/assets/logo/final/logo_full.svg"
        alt="empty"
    /></span>
    <div class="opening">
      暂无数据
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
  padding: 4px 8px;
  line-height: 20px;
  box-sizing: border-box;
  margin-bottom: 10px;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 5px;
  opacity: 0.8;
  text-align: center;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.empty-img {
  display: inline-block;
  color: var(--ui-icon-color);
  font-style: normal;
  line-height: 0;
  text-align: center;
  text-transform: none;
  vertical-align: -0.125em;
  width: 80px;
  padding: 20px;
  text-rendering: optimizelegibility;
  -webkit-font-smoothing: antialiased;
}
</style>

