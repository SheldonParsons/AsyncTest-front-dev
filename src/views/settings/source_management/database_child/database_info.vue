<template>
  <div class="database-info-item">
    <div class="database-info-item-title">
      <span>数据库地址</span>
      <span
        style="font-size: 20px; color: red; margin-left: 3px; margin-right: 3px"
        >*</span
      >
    </div>
    <div class="database-info-item-content"><el-input placeholder="IP/Host" v-model="setting.host"></el-input></div>
  </div>
  <div class="database-info-item">
    <div class="database-info-item-title">
      <span>端口</span>
      <span
        style="font-size: 20px; color: red; margin-left: 3px; margin-right: 3px"
        >*</span
      >
    </div>
    <div class="database-info-item-content"><el-input placeholder="3306" v-model="setting.port"></el-input></div>
  </div>
  <div class="database-info-item">
    <div class="database-info-item-title">
      <span>用户名</span>
      <span
        style="font-size: 20px; color: red; margin-left: 3px; margin-right: 3px"
        >*</span
      >
    </div>
    <div class="database-info-item-content"><el-input placeholder="用户名" v-model="setting.username"></el-input></div>
  </div>
  <div class="database-info-item">
    <div class="database-info-item-title">
      <span>密码</span>
      <span
        style="font-size: 20px; color: red; margin-left: 3px; margin-right: 3px"
        >*</span
      >
    </div>
    <div class="database-info-item-content"><el-input placeholder="密码" v-model="setting.password"></el-input></div>
  </div>
  <div class="database-info-item">
    <div class="database-info-item-title">
      <span>数据库名</span>
      <span
        style="font-size: 20px; color: red; margin-left: 3px; margin-right: 3px"
        >*</span
      >
    </div>
    <div class="database-info-item-content"><el-input placeholder="数据库名" v-model="setting.database_name"></el-input></div>
  </div>
  <el-row style="margin-top: 10px">
    <el-col style="font-size: 14px">
      <span style="cursor: pointer; border-bottom: 1px solid">测试连接</span>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
const props = defineProps({
  setting: {
    type: Object,
    default: () => {
      return {}
    }
  }
})
</script>

<style lang="scss" scoped>
.database-info-item:not(:first-child) {
  margin-top: 15px;
}
.database-info-item {
  font-size: 14px;
  display: flex;
  align-items:start;
  .database-info-item-title {
    display: flex;
    flex: none;
    align-items: flex-end;
    justify-content: start;
    width: 20%;
  }
  .database-info-item-content {
    width: 100%;
  }
}
</style>