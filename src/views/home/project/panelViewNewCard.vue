<template>
  <div class="card">
    <div class="multi-button">
      <button class="fas fa-heart" @click.stop="setFavorite">
        <el-icon style="font-size: 1.2rem"> <FavoriteIconChoice /></el-icon>
      </button>
      <button class="fas fa-comment" @click.stop="setDefault">
        <el-icon style="font-size: 1.2rem"> <FavoriteIcon /></el-icon>
      </button>
      <!-- <button class="fas fa-share-alt"></button>
      <button class="fas fa-trash"></button> -->
    </div>
    <div class="container">
      <el-row
        class="cont-header"
        justify="start"
        align="middle"
        style="height: 18%"
      >
        <el-col :offset="2" :span="10"
          ><span style="font-size: 16px; font-weight: 200">{{
            createTime
          }}</span></el-col
        >
        <el-col :offset="1" :span="10" style="text-align: end"
          ><span
            class="card-favorite-span-name card-span-line"
            @click="enterProject"
            ><el-tag class="mx-1" effect="dark">
              {{ t('project.enterProject') }}
            </el-tag></span
          ></el-col
        >
      </el-row>
      <el-row
        class="cont-name"
        justify="center"
        align="middle"
        style="height: 26%"
      >
        <el-col :span="20" style="text-align: center"
          ><span style="font-size: 16px; font-weight: 700">{{
            name
          }}</span></el-col
        >
      </el-row>
      <el-row
        class="cont-desc"
        justify="center"
        align="middle"
        style="height: 26%"
      >
        <el-col
          :offset="2"
          :span="20"
          style="text-align: center; align-items: center"
          :title="decsString?.length === 0 ? '' : decsString"
          ><span
            v-if="decsString?.length !== 0"
            style="font-size: 14px; font-weight: 200"
            >{{ decsString }}</span
          ><el-empty
            v-if="decsString?.length === 0"
            class="empty-img"
            :image-size="20"
            style="padding: 5px; font-size: 12px"
            :description="t('global.emptyDesc')"
        /></el-col>
      </el-row>
      <el-row
        justify="center"
        align="middle"
        style="height: 30%"
        title="活跃度"
      >
        <el-col :offset="1" :span="2" style="margin-bottom: 10px"
          ><FireIcon style="cursor: pointer"></FireIcon
        ></el-col>
        <el-col :span="17"
          ><el-progress
            class="fire-progress"
            :percentage="fire"
            :stroke-width="15"
            :show-text="false"
            :duration="3"
        /></el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import FavoriteIcon from '@/assets/svg/common/favoriteIcon.vue'
import FavoriteIconChoice from '@/assets/svg/common/favoriteChoicedIcon.vue'
import FireIcon from '@/components/layout/otherwise/fire-icon.vue'
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
  },
  decsString: {
    type: String
  },
  fire: {
    type: Number
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
body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  grid-gap: 5rem;
  padding: 5rem;
  background: #f5f7fa;
  --background: rgb(66, 184, 131);
  .card:hover {
    transform: scale(1.05);
  }
  .card {
    border: 2px solid transparent;
    background-clip: padding-box, border-box;
    background-origin: padding-box, border-box;
    background-image: linear-gradient(to right, #ffffff, #ffffff),
      linear-gradient(90deg, hsl(240deg, 30%, 96%), hsl(240deg, 30%, 96%));
    background-size: 100% 100%;
    --text: white;
    border-radius: 10px;
    position: relative;
    height: 14rem;
    box-shadow: 0 0 2rem -1rem rgba(0, 0, 0, 0.05);
    transition: 0.1s ease;
    &:hover .multi-button button {
      background: rgba(66, 184, 131, 1);
    }
    .multi-button {
      z-index: 0;
      position: absolute;
      top: 1.25rem;
      left: 1.25rem;
      border-radius: 100%;
      width: 0rem;
      height: 0rem;
      transform: translate(-50%, -50%);
      transition: 0.25s cubic-bezier(0.25, 0, 0, 1);
      button {
        display: grid;
        place-items: center;
        position: absolute;
        width: 2rem;
        height: 2rem;
        border: none;
        border-radius: 100%;
        background: transparent;
        color: var(--text);
        transform: translate(-50%, -50%);
        cursor: pointer;
        transition: 0.25s cubic-bezier(0.25, 0, 0, 1);
        &:hover {
          color: rgb(66, 184, 131);
          box-shadow: 0 0 1rem -0.25rem rgb(66, 184, 131);
          background-color: white;
        }
        &:first-child:nth-last-child(1) {
          left: 25%;
          top: 25%;
        }
        &:first-child:nth-last-child(2),
        &:first-child:nth-last-child(2) ~ * {
          &:nth-child(1) {
            left: 37.5%;
            top: 18.75%;
          }
          &:nth-child(2) {
            left: 18.75%;
            top: 37.5%;
          }
        }
        &:first-child:nth-last-child(3),
        &:first-child:nth-last-child(3) ~ * {
          &:nth-child(1) {
            left: 50%;
            top: 15.625%;
          }
          &:nth-child(2) {
            left: 25%;
            top: 25%;
          }
          &:nth-child(3) {
            left: 15.625%;
            top: 50%;
          }
        }
        &:first-child:nth-last-child(4),
        &:first-child:nth-last-child(4) ~ * {
          &:nth-child(1) {
            left: 62.5%;
            top: 18.75%;
          }
          &:nth-child(2) {
            left: 37.5%;
            top: 18.75%;
          }
          &:nth-child(3) {
            left: 18.75%;
            top: 37.5%;
          }
          &:nth-child(4) {
            left: 18.75%;
            top: 62.5%;
          }
        }
      }
    }
    .container {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 10px;
      height: 100%;
      background-size: 100%;
      background-repeat: no-repeat;
      transition: 0.1s ease;
      .cont-desc {
        text-align: center;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .icon-more {
        display: flex;
        justify-content: center;
        cursor: pointer;
      }
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
    &:hover {
      border: 0px;
      .mx-1 {
        color: rgba(66, 184, 131, 1);
        background: white;
        cursor: pointer;
        font-weight: 700;
        box-shadow: 1px 1px 1px #888888;
      }
    }
    &:hover .container {
      color: white;
      border: 2px solid black;
      background-color: rgba(66, 184, 131, 0.9);
      box-shadow: 3px 3px 1px #888888;
    }

    &:hover .multi-button,
    .multi-button:focus-within {
      width: 10rem;
      height: 10rem;
    }
  }
}
</style>

<style lang="scss">
.card {
  &:hover {
    .el-progress-bar__inner {
      background-color: white !important;
    }
    .el-progress-bar__outer {
      background-color: var(--el-color-primary);
    }
    .empty-img .el-empty__description p {
      color: white !important;
    }
  }
}
.empty-img .el-empty__description {
  margin-top: 4px;
}
</style>
