<template>
  <div class="main-container">
    <div class="content menu-sidebar" :style="{ width: contentWidth + 'px' }">
      <div class="main-menu">
        <NewMenu
          class="new-content-menu"
          style="width: 80px"
          @switchRouterAction="changeChildMenu"
        />
        <div class="content-menu">
          <Menu :routeName="routername" class="detail-menu" :apiItem="apiItem" @changeMenu="changeMenu"/>
          <div class="resize-handle" @mousedown="startResize"></div>
        </div>
      </div>
    </div>
    <div
      class="main page-content has-sidebar"
      :style="{ left: contentWidth + 'px', width: mainContentWidth + 'px' }"
    >
      <router-view @change_page="changePage" :changeApiContent="changeApiContent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import Menu from "@/components/layout/menus/commonMenu.vue";
import NewMenu from "@/components/layout/menus/newMenu.vue";
import { onBeforeRouteUpdate } from "vue-router";

const routername: any = ref("data");
const contentWidth = ref(0); // 初始宽度
const mainContentWidth = ref(0);
const apiItem:any = ref(null)
const changeApiContent:any = ref(null)

onBeforeRouteUpdate((to: any, from) => {
  // 在路由更新时执行的逻辑
  changeChildMenu(to.name);
});

onMounted(() => {
  // 初始化宽度为当前窗口宽度的百分比
  contentWidth.value = Math.floor(window.innerWidth * 0.2);
  mainContentWidth.value = window.innerWidth - contentWidth.value;
});

// 监听窗口大小变化
window.addEventListener("resize", () => {
  contentWidth.value =
    (contentWidth.value / window.innerWidth) * window.innerWidth;
  mainContentWidth.value = window.innerWidth - contentWidth.value;
});

function changeMenu(data:any, node:any) {
  changeApiContent.value = {
    data: data,
    node:node
  }
}

function changePage(item:any) {
  apiItem.value = item
}

function changeChildMenu(name: string, call_back:any=()=>{}) {
  routername.value = name;
  call_back()
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
  position: relative;
  top: 56px;
}
.main-menu {
  display: flex;
  height: 100%;
}
.content-menu {
  width: 65%;
  // margin-bottom: 100px;
}
.menu-sidebar {
  display: flex;
  height: 100%;
}

.content {
  flex: 1;
  overflow: hidden;
  position: fixed;
  display: inline-block;
}

.detail-menu {
  // margin-top: 1rem;
  margin-left: 1rem;
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
  overflow-y: auto;
  // height: 100%;
}
/* 对于 Webkit 内核浏览器（如 Chrome, Safari） */
.page-content::-webkit-scrollbar {
  display: none;
}
.page-content.has-sidebar {
  display: inline-block;
  position: fixed;
  float: right;
  height: 100%;
  // overflow: hidden;
}
</style>
