<template>
  <div @click="showDoc" class="tool g-unselect" :style="{
    '--dyToolsWidth': dyWidth + 'px',
    '--dyToolsHeight': dyHeight + 'px',
    '--spanWidth': spanWidth
  }">
    <div class="content">
      <div class="logo">
        <CaseLight class="case-icon" style="height:2rem;width: 2rem;" />
      </div>
      <div class="text">
        Run Case In <span class="accent">AsyncTest</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CaseLight from "@/assets/svg/tree/case_light.vue";

const router = useRouter()
const route = useRoute()
const dyWidth = ref(200)
const dyHeight = ref(80)
const spanWidth = ref('80%')
const emit = defineEmits(['changeMenu'])

const props = defineProps({
  fixSize: {
    type: Boolean,
    default: false
  }
})

onMounted(() => {
  if (!props.fixSize) {
    dyWidth.value = document.documentElement.clientWidth * 0.16
    dyHeight.value = dyWidth.value / 3
    spanWidth.value = '60%'
  }
})

function showDoc() {
  emit('changeMenu', 'case')
  router.push({
    name: 'case',
    params: {
      project: Number(route.params.project)
    }
  })
}
</script>

<style lang="scss" scoped>
.tool {
  box-sizing: border-box;
  /* 【关键修改 1】将宿主设为容器，监测其行内尺寸（宽度） */
  container-type: inline-size;
  container-name: tool-box;

  .content {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    gap: 8px; /* 稍微缩小间距以防挤压 */
    padding: 10px;
    box-sizing: border-box;
    cursor: pointer;
    overflow: hidden; /* 防止文字溢出容器边界 */

    .logo {
      width: 2rem;
      flex-shrink: 0; /* 确保图标不会被文字挤小 */
    }

    .text {
      display: flex;
      align-items: center;
      gap: 5px;
      color: white;
      font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
      
      /* 【关键修改 2】强制不换行 */
      white-space: nowrap; 
      
      /* 【关键修改 3】自适应字号 
         clamp(最小, 首选, 最大)
         7cqi 表示字号始终是容器宽度的 7%
      */
      font-size: clamp(0.8rem, 7cqi, 1.25rem); 
    }

    .accent {
      background: -webkit-linear-gradient(315deg, #cbc4d5 25%, #00FFFF);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      /* 确保 accent 作为 span 也不换行 */
      white-space: nowrap;
    }
  }

  /* 保持你原本的所有样式和动画逻辑 */
  height: 80px;
  width: 100%;
  border-radius: 10px;
  background-size: 100% 100%;
  background-color: #000;
  background-image: radial-gradient(closest-side,
    rgba(0, 119, 255, 1),
    rgba(0, 119, 255, 0)),
  radial-gradient(closest-side, rgba(0, 255, 255, 1), rgba(0, 255, 255, 0)),
  radial-gradient(closest-side,
    rgba(138, 43, 226, 1),
    rgba(138, 43, 226, 0)),
  radial-gradient(closest-side, rgba(0, 119, 255, 1), rgba(0, 119, 255, 0)),
  radial-gradient(closest-side,
    rgba(0, 255, 255, 1),
    rgba(0, 255, 255, 0));
  background-size: 130vmax 130vmax,
  80vmax 80vmax,
  90vmax 90vmax,
  110vmax 110vmax,
  90vmax 90vmax;
  background-position: -80vmax -80vmax,
  60vmax -30vmax,
  10vmax 10vmax,
  -30vmax -10vmax,
  50vmax 50vmax;
  background-repeat: no-repeat;
  animation: 4s movement linear infinite;
}

/* 保持你的动画逻辑不变 */
@keyframes movement {
  0%,
  100% {
    background-size: 130vmax 130vmax, 80vmax 80vmax, 90vmax 90vmax,
      110vmax 110vmax, 90vmax 90vmax;
    background-position: -80vmax -80vmax, 60vmax -30vmax, 10vmax 10vmax,
      -30vmax -10vmax, 50vmax 50vmax;
  }
  25% {
    background-size: 100vmax 100vmax, 90vmax 90vmax, 100vmax 100vmax,
      90vmax 90vmax, 60vmax 60vmax;
    background-position: -60vmax -90vmax, 50vmax -40vmax, 0vmax -20vmax,
      -40vmax -20vmax, 40vmax 60vmax;
  }
  50% {
    background-size: 80vmax 80vmax, 110vmax 110vmax, 80vmax 80vmax,
      60vmax 60vmax, 80vmax 80vmax;
    background-position: -50vmax -70vmax, 40vmax -30vmax, 10vmax 0vmax,
      20vmax 10vmax, 30vmax 70vmax;
  }
  75% {
    background-size: 90vmax 90vmax, 90vmax 90vmax, 100vmax 100vmax,
      90vmax 90vmax, 70vmax 70vmax;
    background-position: -50vmax -40vmax, 50vmax -30vmax, 20vmax 0vmax,
      -10vmax 10vmax, 40vmax 60vmax;
  }
}
</style>