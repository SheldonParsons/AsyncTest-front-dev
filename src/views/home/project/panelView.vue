<template>
  <div :class="{ panel: true, default: isDefault }" @click="enterProject">
    <div class="child">
      <div>{{ name }}</div>
      <el-tooltip
        class="box-item"
        effect="light"
        :content="t('tooltip.favorite')"
        placement="bottom"
      >
        <el-icon @click.stop="setFavorite" v-if="!isFavorite"><Star /></el-icon>
        <el-icon @click.stop="setFavorite" v-else><StarFilled /></el-icon>
      </el-tooltip>
    </div>
    <div class="card">{{ creator }}</div>
    <div class="card">{{ createTime }}</div>
    <el-tooltip
      class="box-item"
      effect="light"
      :content="t('tooltip.default')"
      placement="bottom"
    >
      <el-icon @click.stop="setDefault" class="default-icon"
        ><Paperclip
      /></el-icon>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const props = defineProps({
  name: String,
  isFavorite: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createTime: {
    type: String,
    default: ''
  },
  creator: {
    type: String,
    default: ''
  },
  project: {
    type: Object
  }
})

const emit = defineEmits(['enterProject', 'setFavorite', 'setDefault'])

function enterProject() {
  emit('enterProject', props.project)
}

function setFavorite() {
  emit('setFavorite', props.project)
}

function setDefault() {
  emit('setDefault', props.project)
}
</script>

<style lang="scss" scoped>
.default {
  border: 2px solid #ffe4b5 !important;
}
.panel {
  margin-top: 10px;
  text-align: right;
  border: 2px solid #e0ffff;
  cursor: pointer;
  overflow: hidden;
  width: 100%;
  height: 150px;
  box-shadow: 0 4px 10px rgb(0 0 0 / 35%);
  border-radius: 10px;
  transition: all 0.25s ease;
  color: white;
  background-image: linear-gradient(
    30deg,
    var(--el-color-primary-light-3),
    var(--el-color-primary-light-5)
  );
  .default-icon {
    font-size: 18px;
    margin-right: 3%;
    // margin-top: 5px;
    color: #009879;
  }
  .child {
    display: flex;
    text-align: center;
    flex-direction: column-reverse;
    i {
      font-size: 18px;
      margin-left: 85%;
      margin-top: 5px;
    }
    div {
      // width: 100%;
      padding: 5px;
      margin: 10px;
      transition: all 0.25s ease;
      height: 40px;
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 18px;
      // border-bottom: 2px dotted;
    }
  }
  .card {
    margin: 10px;
    padding-left: 10px;
    border-left: 2px solid;
    border-color: white;
    height: 40px;
    display: flex;
    align-items: center;
    background: rgba($color: #ffffff, $alpha: 0.4);
    color: #f0ffff;
  }
}
.panel:hover {
  margin-top: 0px;
  .child div {
    color: black;
    // background: rgba($color: #66c0ad, $alpha: 0.6);
    border-radius: 5px;
  }
  .card {
    background: rgba($color: #ffffff, $alpha: 0.8);
    color: #2f4f4f;
  }
  i {
    color: #009879;
  }
  top: -10px;
  height: 230px;
  box-shadow: 0 24px 20px rgb(0 0 0 / 25%);
  background: var(--private-bg);
}
</style>
