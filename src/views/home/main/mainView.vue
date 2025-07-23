<template>
  <div class="main-container">
    <motion.div class="main-container-core">
      <!-- 第一层：左(固定10%) + 其余(90%) -->
      <SplitterGroup direction="horizontal">
        <!-- 左：永远 10%，不可调 -->
        <SplitterPanel :default-size="5" :min-size="5" :max-size="5" class="radius-container white-bg-container">
          <TopMenu ref="new_menu" class="new-content-menu" @switchRouterAction="changeChildMenu" />
        </SplitterPanel>

        <!-- 必须放一个把手，但禁用并隐藏宽度 -->
        <SplitterResizeHandle disabled class="FixSplitterResizeHandle" />

        <!-- 右侧整体（含中+右） -->
        <SplitterPanel :default-size="95">
          <!-- 第二层：中(可折叠，可调) + 右(可调) -->
          <SplitterGroup direction="horizontal">
            <!-- 中：默认20，可折叠 -->
            <SplitterPanel :default-size="17" :min-size="10" :max-size="30" collapsible :collapsed-size="0"
              class="radius-container white-bg-container">
              <Menu @change_sub_menu="change_sub_menu" :routeName="routername" class="detail-menu" :apiItem="apiItem"
                @changeMenu="changeMenu" />
            </SplitterPanel>
            <SplitterResizeHandle class="SplitterResizeHandle" />
            <!-- 右：默认70，可调 -->
            <SplitterPanel :default-size="83" :min-size="10" class="radius-container white-bg-container">
              <router-view @change_page="changePage" :changeApiContent="changeApiContent" :width="mainContentWidth" />
            </SplitterPanel>
          </SplitterGroup>
        </SplitterPanel>
      </SplitterGroup>
    </motion.div>
  </div>
</template>

<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { motion } from 'motion-v'
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

function changeChildMenu(name: string, call_back: any = () => { }) {
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
.detail-menu {
  padding: 10px;
}

.radius-container {
  border-radius: 10px;
}

.white-bg-container {
  background-color: white;
}

.main-container {
  height: 100%;
  width: 100%;
  background-color: rgb(242, 244, 247);
  position: relative;

  .main-container-core {
    position: absolute;
    inset: 10px;
  }
}

.FixSplitterResizeHandle[data-orientation="horizontal"] {
  width: 0.3rem;
  background-color: rgb(242, 244, 247);
}
.FixSplitterResizeHandle[data-orientation="vertical"] {
  height: 0.3rem
}

.SplitterResizeHandle[data-orientation="horizontal"] {
  width: 0.5rem;
  background-color: rgb(242, 244, 247);
}

.SplitterResizeHandle[data-orientation="vertical"] {
  height: 0.5rem
}
</style>
