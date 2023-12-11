<template>
  <div class="container">
    <el-tabs
      v-model="activeMenuIndex"
      tab-position="left"
      @tab-click="changeTaskType"
      class="task-menu"
      style="margin-top: 100px; width: 15%; position: fixed"
    >
      <el-tab-pane
        :label="t('project.approve.menu.task')"
        name="1"
      ></el-tab-pane>
      <el-tab-pane
        :label="t('project.approve.menu.node')"
        name="2"
      ></el-tab-pane>
    </el-tabs>
    <el-row justify="start" align="top" class="tools-var">
      <el-col :span="24">
        <MyTask v-if="activeMenuIndex === '1'"></MyTask>
        <InitEvent v-if="activeMenuIndex === '2'"></InitEvent>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InitEvent from './initEvent.vue'
import MyTask from './myTask.vue'
const { t } = useI18n()
const activeMenuIndex = ref('1')
function changeTaskType() {
  console.log('change task type')
}
</script>

<style lang="scss">
.task-menu {
  .el-tabs__item:not(:last-child) {
    margin-bottom: 20px !important;
  }
  .el-tabs__header {
    float: right !important;
  }
}
.action-view .customization-button .el-icon svg {
  width: 0.7em;
  height: 0.7em;
}
</style>

<style lang="scss" scoped>
.tools-var {
  padding-top: 100px;
  width: 85%;
  margin-left: auto;
  margin-bottom: 20px;
}
.container {
  width: inherit;
  display: flex;
  flex-direction: column;
}
</style>
