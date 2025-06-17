<template>
  <div class="main-container">
    <div class="content menu-sidebar">
      <div class="main-menu">
        <TopMenu
          ref="new_menu"
          class="new-content-menu"
          style="width: 80px"
          @switchRouterAction="changeChildMenu"
        />
        <div class="content-menu">
          <Menu
            @change_sub_menu="change_sub_menu"
            :routeName="routername"
            class="detail-menu"
            :apiItem="apiItem"
            @changeMenu="changeMenu"
          />
          <div class="resize-handle" @mousedown="startResize"></div>
        </div>
      </div>
    </div>
    <div
      class="main page-content has-sidebar"
    >
      <router-view
        @change_page="changePage"
        :changeApiContent="changeApiContent"
        :width="mainContentWidth"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import Menu from "@/components/layout/menus/secondMenu.vue";
import TopMenu from "@/components/layout/menus/topMenu.vue";
import { onBeforeRouteUpdate } from "vue-router";

const routername: any = ref("data");
const contentWidth = ref(0); // 初始宽度
const mainContentWidth = ref(0);
const apiItem: any = ref(null);
const changeApiContent: any = ref(null);
const new_menu: any = ref(null);

onBeforeRouteUpdate((to: any, from) => {
  // 在路由更新时执行的逻辑
  changeChildMenu(to.name);
});

onMounted(() => {
  // 监听窗口大小变化
  window.addEventListener("resize", () => {
    contentWidth.value =
      (contentWidth.value / window.innerWidth) * window.innerWidth;
    mainContentWidth.value = window.innerWidth - contentWidth.value;
  });
  // 初始化宽度为当前窗口宽度的百分比
  contentWidth.value = Math.floor(window.innerWidth * 0.21);
  mainContentWidth.value = window.innerWidth - contentWidth.value;
});

function change_sub_menu(data: any) {
  new_menu.value.change_focus(data);
}

function changeMenu(data: any) {
  changeApiContent.value = data;
}

function changePage(item: any) {
  apiItem.value = item;
}

function changeChildMenu(name: string, call_back: any = () => {}) {
  routername.value = name;
  call_back();
}

const startResize = (e: MouseEvent) => {
  const startX = e.pageX;
  const initialWidth = contentWidth.value;
  const minWidth = Math.floor(window.innerWidth * 0.21);
  const maxWidth = Math.floor(window.innerWidth * 0.5);

  const onMouseMove = (event: MouseEvent) => {
    const diffX = event.pageX - startX;
    const newWidth = initialWidth + diffX;

    // 限制宽度在 10% 和 40% 之间
    contentWidth.value = Math.min(Math.max(minWidth, event.pageX), maxWidth);
    mainContentWidth.value = window.innerWidth - contentWidth.value;
  };

  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};
</script>

<style scoped lang="scss">
.main-container {
  flex: 1;
  display: flex;
  overflow: auto;
}
.main-menu {
  display: flex;
  height: 100%;
  width: 100%;
}
.content-menu {
  padding-left: 1rem;
  padding-right: 1rem;
  flex: 1;
  max-width: 300px;
}
.menu-sidebar {
  display: flex;
  height: 100%;
  border-right: 1px solid #dcdfe6;
}

.content {
  // overflow: hidden;
  // display: inline-block;
  flex: 25;
  // min-width: 0;
  // overflow: hidden;
}

.detail-menu {
  background-color: #ffffff;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -5px; /* 调整手柄的位置 */
  width: 7px;
  height: 100%;
  cursor: col-resize; /* 设置鼠标样式为调整宽度 */
  background-color: #f5f5f5;
}
.new-content-menu {
  border-right: 1px solid #f5f5f5;
}


.page-content {
  z-index: 999;
  overflow-y: hidden;
  // height: 100%;
}
/* 对于 Webkit 内核浏览器（如 Chrome, Safari） */
.page-content::-webkit-scrollbar {
  display: none;
}
.page-content.has-sidebar {
  height: 100%;
  z-index: 1;
  flex: 75;
}
</style>
