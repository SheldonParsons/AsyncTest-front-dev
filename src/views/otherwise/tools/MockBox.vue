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
      <div class="text">Run Case In <div class="accent">AsyncTest</div>
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

onMounted(() => {
  if (!props.fixSize) {
    dyWidth.value = document.documentElement.clientWidth * 0.16
    dyHeight.value = dyWidth.value / 3
    spanWidth.value = '60%'
  }
})

const props = defineProps({
  fixSize: {
    type: Boolean,
    default: false
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

  .content {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 10px;
    box-sizing: border-box;
    cursor: pointer;

    .logo {
      width: 2rem;
    }

    .text {
      display: flex;
      gap: 5px;
      color: white;
      font-size: 1.2rem;
      font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
    }

    .accent {
      background: -webkit-linear-gradient(315deg, #cbc4d5 25%, #00FFFF);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

  }


  height: 80px;
  width: 100%;
  border-radius: 10px;
  background-size: 100% 100%;
  /* 1. 将背景色改为黑色 */
  background-color: #000;
  /* 2. 替换为在黑色上更和谐的颜色 */
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
  /* 动画保持不变 */
  animation: 4s movement linear infinite;
}

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
