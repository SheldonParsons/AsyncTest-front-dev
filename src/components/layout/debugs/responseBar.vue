<template>
  <div id="toolsRes">
    <el-divider content-position="left">
      <span class="res-divider-span">Response Content</span>
    </el-divider>
    <div v-loading="loading">
      <div v-show="result">
        <el-row>
          <el-col :span="23" class="res-col"
            ><span class="res-type-span">Status:</span>
            <span class="res-type-data">{{ status }} {{ reason }}</span
            ><span class="res-type-span">Time:</span>
            <span class="res-type-data">{{ time }} ms</span
            ><span class="res-type-span">Size:</span>
            <span class="res-type-data">{{ size }} B</span></el-col
          >
        </el-row>
        <el-tabs
          class="res-tabs"
          tab-position="left"
          v-model="activeMenuIndex"
          @tab-click="changeMenu"
        >
          <el-tab-pane label="Body" name="1"
            ><TextBar
              v-show="activeMenuIndex === '1'"
              :title="'Body Response'"
              :value="body"
            ></TextBar
          ></el-tab-pane>
          <el-tab-pane label="Headers" name="2"
            ><TextBar
              v-show="activeMenuIndex === '2'"
              :title="'Headers Response'"
              :value="headers"
            ></TextBar
          ></el-tab-pane>
        </el-tabs>
      </div>
      <div v-show="!result">
        <el-empty :image="src" :image-size="100">
          <template #description>
            <span class="res-error-span">Could not send request</span>
            <p class="res-error-p">Error: {{ err }}</p>
          </template>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TextBar from '@/components/common/editor/textBar.vue'

const activeMenuIndex = ref('1')
const src = new URL('@/assets/img/error.png', import.meta.url).href

defineProps({
  body: {
    type: String,
    default: ''
  },
  headers: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'waiting...'
  },
  time: {
    type: Number,
    default: 0
  },
  size: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  },
  result: {
    type: Boolean,
    default: false
  },
  err: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: ''
  }
})

function changeMenu(tab: any) {
  activeMenuIndex.value = tab.props.name
}
</script>

<style lang="scss" scoped>
#toolsRes {
  margin-top: 40px;
  .res-tabs {
    margin-top: 30px;
  }
  .res-error-p {
    font-size: 1rem;
    margin-top: 10px;
  }
  .res-error-span {
    font-size: 1.1rem;
    color: var(--global-error-color);
  }
  .res-divider-span {
    font-size: 1.1rem;
    color: var(--global-theme-color);
  }
  .res-col {
    text-align: right;
    .res-type-span {
      margin-left: 15px;
      font-size: 0.9rem;
    }
    .res-type-data {
      margin-left: 5px;
      font-size: 0.9rem;
      color: var(--global-theme-color);
    }
  }
}
</style>
