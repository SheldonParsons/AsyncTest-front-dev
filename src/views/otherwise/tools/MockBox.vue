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
    <p class="tools-p">{{ $t('global.news') }}</p>
    <!-- <div class="fake-btn">
      <span>LLM AI Agent</span>
    </div> -->
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
    name: 'ai_application_ground',
    params: {
      project: Number(route.params.project)
    }
  })
}
</script>

<style lang="scss" scoped>
.tool {
  cursor: pointer;
  background-image: url('@/assets/img/projectStyle/tag-4.webp');
  height: 80px;
  width: 100%;
  //   margin-left: 20px;
  border-radius: 10px;
  background-size: cover;
  border: 2px solid #fff;
  text-align: center;
  .tools-p {
    margin: 0;
    font-weight: 700;
    font-size: 14px;
    text-align: center;
    padding-top: 12%;
    color: white;
    background: -webkit-linear-gradient(315deg, white 45%, white);
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
    background: -webkit-linear-gradient(315deg, #00cd66 40%, #008b45);
    border-radius: 5px;
    margin-top: 5px;
    margin-bottom: 5px;
    font-size: 14px;
    color: #fff;
  }
}
.tool:hover {
  border: 2px solid #008b00;
}
</style>
