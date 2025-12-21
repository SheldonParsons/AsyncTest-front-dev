<template>
  <el-row style="margin-bottom: 10px;">
    <el-col :span="2" class="flex">
      <Source />
    </el-col>
    <el-col :span="21" :offset="1" class="flex first-span">
      <span>资源管理</span>
    </el-col>
  </el-row>
  <el-row>
    <el-col :span="21" :offset="1" class="flex router-menu" @click="switchRouter('settings_source_database')"
      :class="{ active: 'settings_source_database' === activeLinkStyle }">
      <div><span>数据库连接</span></div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :span="21" :offset="1" class="flex router-menu" @click="switchRouter('settings_source_files')"
      :class="{ active: 'settings_source_files' === activeLinkStyle }">
      <div><span>文件管理</span></div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :span="21" :offset="1" class="flex router-menu" @click="switchRouter('settings_asyncexecutor')"
      :class="{ active: 'settings_asyncexecutor' === activeLinkStyle }">
      <div><span>AsyncExecutor</span></div>
    </el-col>
  </el-row>
  <el-row style="margin-bottom: 10px;margin-top: 20px;">
    <el-col :span="2" class="flex">
      <User />
    </el-col>
    <el-col :span="21" :offset="1" class="flex first-span">
      <span>个人管理</span>
    </el-col>
  </el-row>
  <el-row>
    <el-col :span="21" :offset="1" class="flex router-menu" @click="switchRouter('settings_user_token')"
      :class="{ active: 'settings_user_token' === activeLinkStyle }">
      <div><span>API访问令牌</span></div>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Source from "@/assets/svg/icon/source.vue";
import User from "@/assets/svg/icon/user.vue";
const { t } = useI18n();
const props = defineProps({
  activeLinkStyle: {
    type: String,
    default: "0",
  },
});

const emit = defineEmits(["switchRouterAction"]);

function switchRouter(data: string) {
  emit("switchRouterAction", data);
}
</script>

<style lang="scss" scoped>
.first-icon {
  width: 1em;
  height: 1em;
}

.first-span {
  font-size: 14px;
  font-weight: 500;
  color: #667085;
  cursor: default;
}

.router-menu {
  font-size: 14px;
  font-weight: 500;
  color: #667085;
  padding: 8px 19px;
  margin-top: 5px;
  cursor: pointer;
}

.router-menu:hover {
  background-color: #f2f4f7;
  border-radius: 10px;
}

.active {
  background-color: #f2f4f7;
  border-radius: 10px;
}

.flex {
  display: flex;
  align-items: center;
}
</style>
