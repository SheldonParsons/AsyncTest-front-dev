<template>
  <el-row class="tools-row">
    <el-col class="tools-col" :span="5" :offset="2">
      <X2E></X2E>
    </el-col>
    <el-col class="tools-col" :span="5">
      <Only></Only>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import X2E from './tools/X2E.vue'
import Only from './tools/EmptyBox.vue'
</script>

<style lang="scss" scoped>
.tools-row {
  margin-top: 40px;
  .tools-col {
    margin-bottom: 20px;
  }
}
</style>
