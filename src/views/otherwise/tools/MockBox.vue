<template>
  <div
    @click="showDoc"
    class="tool g-unselect"
    :style="{
      '--dyToolsWidth': dyWidth + 'px',
      '--dyToolsHeight': dyHeight + 'px',
      '--spanWidth': spanWidth
    }"
  >
    <p class="tools-p">{{ $t('tool.mocking') }}</p>
    <div class="fake-btn">
      <span>Dynamic Mocking</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { emit } from 'process'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const router = useRouter()
const route = useRoute()
const dyWidth = ref(200)
const dyHeight = ref(80)
const spanWidth = ref('80%')

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
  router.push({
    name: 'apiMock',
    params: {
      project: Number(route.params.project)
    }
  })
}
</script>

<style lang="scss" scoped>
.tool {
  cursor: pointer;
  background-image: url('@/assets/img/projectStyle/l-bg-4.png');
  height: var(--dyToolsHeight);
  width: var(--dyToolsWidth);
  //   margin-left: 20px;
  border-radius: 10px;
  background-size: cover;
  border: 2px solid #fff;
  text-align: center;
  .tools-p {
    margin: 0;
    font-family: $round-font-family;
    font-weight: 700;
    font-size: 14px;
    text-align: center;
    padding-top: 6%;
    color: aliceblue;
    background: -webkit-linear-gradient(315deg, #ffffff 45%, #caff70);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .fake-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    align-content: center;
    width: var(--spanWidth);
    height: 30%;
    margin: auto;
    background: -webkit-linear-gradient(315deg, #00cd66 20%, #008b45);
    border-radius: 5px;
    margin-top: 5px;
    margin-bottom: 5px;
    font-family: $round-font-family;
    font-size: 14px;
    color: #fff;
  }
}
.tool:hover {
  border: 2px solid #008b00;
}
</style>
