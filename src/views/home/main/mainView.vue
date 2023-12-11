<template>
  <div class="menu sidebar el-scrollbar"><Menu></Menu></div>
  <main class="main page-content has-sidebar">
    <router-view></router-view>
  </main>
</template>
<script setup lang="ts">
import Menu from '@/components/layout/menus/commonMenu.vue'
</script>

<style scoped lang="scss">
.sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  width: var(--sidebar-width-xs);
  background-color: var(--bg-color);
  // padding: 48px 0px 0 39px;
  padding: 48px 0px 96px 25px;
  overflow-y: auto;
  border-right: 1px solid transparent;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(90deg, hsl(240 30% 96%), hsl(240 30% 96%));
  transform: translate(-100%);
  transition: background-color var(--el-transition-duration-fast), opacity 0.25s,
    transform 0.5s cubic-bezier(0.19, 1, 0.22, 1);
  @media screen and (min-width: 1440px) {
    width: calc(
      (100vw - var(--vp-screen-max-width)) / 2 + var(--vp-sidebar-width-small)
    );
  }
  @media screen and (min-width: 1200px) {
    top: var(--header-height);
    transform: translate(0);
  }
  @media screen and (min-width: 768px) {
    width: calc(var(--vp-sidebar-width-small));
  }
}
.el-scrollbar {
  overflow: hidden;
  height: 100%;
}

.el-scrollbar {
  --el-scrollbar-opacity: 0.3;
  --el-scrollbar-bg-color: var(--el-text-color-secondary);
  --el-scrollbar-hover-opacity: 0.5;
  --el-scrollbar-hover-bg-color: var(--el-text-color-secondary);
}

.page-content.has-sidebar {
  box-sizing: border-box;
  @media screen and (min-width: 1440px) {
    padding-left: calc(
      (100% - var(--vp-screen-max-width)) / 2 + var(--vp-sidebar-width-small)
    );
  }
  @media screen and (min-width: 1200px) {
    padding-left: calc(var(--sidebar-width-sm) + 25px + 2px);
  }
}
.page-content {
  padding-top: var(--nav-height);
}
main {
  display: block;
  height: 100%;
}
</style>
