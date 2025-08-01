<template>
  <div class="main-container">
    <motion.div class="main-container-core">
      <!-- 第一层：左(固定10%) + 其余(90%) -->
      <SplitterGroup direction="horizontal" ref="groupRef">
        <!-- 左：永远 10%，不可调 -->
        <SplitterPanel :default-size="leftPct" :min-size="leftPct" :max-size="leftPct"
          class="radius-container white-bg-container">
          <TopMenu ref="new_menu" class="new-content-menu" @switchRouterAction="changeChildMenu" />
        </SplitterPanel>

        <!-- 必须放一个把手，但禁用并隐藏宽度 -->
        <SplitterResizeHandle disabled class="FixSplitterResizeHandle" />
        <!-- 右侧整体（含中+右） -->
        <SplitterPanel :default-size="rightPct">
          <!-- 第二层：中(可折叠，可调) + 右(可调) -->
          <SplitterGroup direction="horizontal">
            <!-- 中：默认20，可折叠 -->
            <SplitterPanel :default-size="20" :min-size="10" :max-size="30" collapsible :collapsed-size="0"
              class="radius-container white-bg-container">
              <Menu @change_sub_menu="change_sub_menu" :routeName="routername" class="detail-menu" :apiItem="apiItem"
                @changeMenu="changeMenu" />
            </SplitterPanel>
            <SplitterResizeHandle class="SplitterResizeHandle" />
            <!-- 右：默认70，可调 -->
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
const BASE_PCT = 5    // 想要的默认百分比

const groupRef = ref<any>(null)
const groupW = ref(0)
let ro: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  const el = groupRef.value?.$el
  if (el instanceof Element) {
    ro = new ResizeObserver(([entry]) => {
      groupW.value = entry.contentRect.width
    })
    ro.observe(el)
  }
})
onBeforeUnmount(() => ro?.disconnect())

const leftPct = computed(() => {
  if (!groupW.value) return BASE_PCT
  const limitPct = (MAX_PX / groupW.value) * 100
  return Math.floor(Math.min(BASE_PCT, limitPct))
})
const rightPct = computed(() => 100 - leftPct.value)

onBeforeRouteUpdate((to: any, from) => {
  // 在路由更新时执行的逻辑
  changeChildMenu(to.name);
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

.panel-router {
  background-image: url('@/assets/background/white_bg-op10.png');
  background-repeat: no-repeat;
  background-position: left bottom;
  background-size: contain;
  background-color: rgba(255,255,255,0.1);
  background-position: -150px 200px; 
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
