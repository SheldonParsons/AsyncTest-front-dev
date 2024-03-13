<template>
  <div
    @click="showTips"
    class="tool g-unselect"
    :style="{
      '--dyToolsWidth': dyWidth + 'px',
      '--dyToolsHeight': dyHeight + 'px'
    }"
  >
    <p class="tools-p">{{ $t('tool.more') }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
const dyWidth = ref(180)
const dyHeight = ref(70)
const { proxy }: any = getCurrentInstance()
const { t } = useI18n()

onMounted(() => {
  dyWidth.value = document.documentElement.clientWidth * 0.16
  dyHeight.value = dyWidth.value / 3
})

function showTips() {
  proxy.$message({
    message: t('tool.more'),
    duration: 3000,
    type: 'success'
  })
}
</script>

<style lang="scss" scoped>
.tool {
  cursor: pointer;
  background-image: url('@/assets/img/projectStyle/l-bg-5.png');
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
    font-size: 16px;
    text-align: center;
    padding-top: 12%;
    color: aliceblue;
    background: -webkit-linear-gradient(315deg, #ffffff 45%, #caff70);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .fake-btn {
    text-align: center;
    width: 60%;
    margin: auto;
    background: -webkit-linear-gradient(315deg, #00cd66 20%, #008b45);
    border-radius: 5px;
    margin-top: 5px;
    margin-bottom: 5px;
    font-family: $round-font-family;
    font-size: 13px;
    color: #fff;
  }
}
.tool:hover {
  border: 2px solid #008b00;
}
</style>
