<template>
    <el-row>
      <el-col :span="15">
        <div class="default-insert">
          <span class="back-icon" @click="back"
            ><el-icon color="#000000" :size="16"><ArrowLeftBold /></el-icon
          ></span>
          <span style="margin-left: 10px; font-weight: 500">插入固定值</span>
        </div>
      </el-col>
      <el-col :span="9" style="display: flex; align-items: center">
        <div class="close-icon">
          <el-icon @click="close"><CloseBold /></el-icon>
        </div>
      </el-col>
    </el-row>
  </template>
  
  <script setup lang="ts">
  import { ArrowLeftBold } from "@element-plus/icons-vue";
  
  const emit = defineEmits(["back", "close"]);
  
  function back() {
    emit("back");
  }
  
  function close() {
    emit("close");
  }
  </script>
  
  <style lang="scss" scoped>
  .close-icon {
    width: 100%;
    display: flex;
    justify-content: end;
    align-items: center;
    padding-right: 10px;
    i {
      cursor: pointer;
    }
  }
  
  .default-insert {
    height: 40px;
    width: 100%;
    display: flex;
    justify-content: start;
    align-items: center;
    padding-left: 10px;
  }
  .back-icon {
    background: #fff;
    border: 0.5px solid #1018280a;
    border-radius: 999px;
    padding: 4px;
    box-shadow: 0 2px 4px #0000000d, 0 4px 8px -2px #00000005;
    height: 16px;
    display: flex;
    cursor: pointer;
  }
  .back-icon:hover {
    box-shadow: 0 0 2px #0000000a, 0 4px 8px #00000014;
  }
  </style>
  