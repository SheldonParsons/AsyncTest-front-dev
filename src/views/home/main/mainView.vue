<template>
  <div class="main-container">
    <motion.div class="main-container-core">
      <SplitterGroup direction="horizontal" ref="groupRef">
        <SplitterPanel :default-size="leftPct" :min-size="leftPct" :max-size="leftPct"
          class="radius-container white-bg-container">
          <TopMenu ref="new_menu" class="new-content-menu" @switchRouterAction="changeChildMenu" />
        </SplitterPanel>

        <SplitterResizeHandle disabled class="FixSplitterResizeHandle" />
        <SplitterPanel :default-size="rightPct" :min-size="rightPct">
          <SplitterGroup direction="horizontal">
            <SplitterPanel :default-size="20" :min-size="20" :max-size="20" collapsible :collapsed-size="0"
              class="radius-container white-bg-container">
              <Menu @change_sub_menu="change_sub_menu" :routeName="routername" class="detail-menu" :apiItem="apiItem"
                @changeMenu="changeMenu" />
            </SplitterPanel>

            <SplitterResizeHandle class="SplitterResizeHandle" />

            <SplitterPanel :default-size="80" :min-size="10" class="radius-container white-bg-container">
              <router-view @change_page="changePage" :changeApiContent="changeApiContent" class="panel-router" />
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
import { ref, onMounted, computed, nextTick, onBeforeUnmount } from "vue";
import Menu from "@/components/layout/menus/secondMenu.vue";
import TopMenu from "@/components/layout/menus/topMenu.vue";
import { onBeforeRouteUpdate } from "vue-router";

const routername: any = ref("data");
const apiItem: any = ref(null);
const changeApiContent: any = ref(null);
const new_menu: any = ref(null);
const MAX_PX = 80     // 左栏最多 80px
const BASE_PCT = 5    // 默认基础百分比

const groupRef = ref<any>(null)
const groupW = ref(0)
let ro: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  const el = groupRef.value?.$el
  // 确保监听的是 SplitterGroup 的根元素
  const target = el instanceof Element ? el : document.querySelector('.main-container-core')

  if (target) {
    // 立即获取一次宽度，避免初始渲染闪烁
    groupW.value = target.getBoundingClientRect().width

    ro = new ResizeObserver(([entry]) => {
      // 使用 contentRect 获取精确宽度
      groupW.value = entry.contentRect.width
    })
    ro.observe(target)
  }
})

onBeforeUnmount(() => ro?.disconnect())

// --- 核心修复逻辑 ---
const leftPct = computed(() => {
  if (!groupW.value) return BASE_PCT
  // 计算精确的百分比 (例如 4.231%)
  const limitPct = (MAX_PX / groupW.value) * 100
  // 取较小值，并保留5位小数避免精度溢出，千万不要用 Math.floor
  const preciseVal = Math.min(BASE_PCT, limitPct)
  return Number(preciseVal.toFixed(5))
})

const rightPct = computed(() => {
  // 确保左右相加严格等于 100
  return Number((100 - leftPct.value).toFixed(5))
})
// ------------------

onBeforeRouteUpdate((to: any, from) => {
  changeChildMenu(to.name);
});

function change_sub_menu(data: any) {
  if (new_menu.value) new_menu.value.change_focus(data);
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
</script>

<style scoped lang="scss">
.detail-menu {
  padding: 10px;
}

.radius-container {
  border-radius: 10px;
  /* 增加 overflow hidden 防止内容撑开导致计算误差 */
  overflow: hidden;
}

.white-bg-container {
  background-color: white;
}

.panel-router {
  background-image: url('@/assets/background/white_bg-op10.png');
  background-repeat: no-repeat;
  background-position: -150px 200px;
  background-size: contain;
  background-color: rgba(255, 255, 255, 0.1);
  height: 100%;
  /* 确保路由视图填满面板 */
}

.main-container {
  height: 100%;
  width: 100%;
  background-color: rgb(242, 244, 247);
  position: relative;

  .main-container-core {
    position: absolute;
    inset: 10px;
    display: flex;
    /* 确保 motion div 表现为容器 */
    flex-direction: column;
  }
}

.FixSplitterResizeHandle[data-orientation="horizontal"] {
  width: 0.3rem;
  background-color: rgb(242, 244, 247);
  cursor: default;
  /* 既然 disabled，就不要显示拖拽手势 */
}

.FixSplitterResizeHandle[data-orientation="vertical"] {
  height: 0.3rem
}

.SplitterResizeHandle[data-orientation="horizontal"] {
  width: 0.5rem;
  background-color: rgb(242, 244, 247);
  transition: background-color 0.2s;

  &:hover,
  &[data-active] {
    background-color: rgb(200, 200, 200);
    /* 增加一点交互反馈 */
  }
}

.SplitterResizeHandle[data-orientation="vertical"] {
  height: 0.5rem
}
</style>