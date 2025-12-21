<template>
  <div style="border-top: 1px solid var(--border-color-light)">
    <div class="main-content">
      <div class="function-container">
        <div class="function-content">
          <div class="function-message">功能说明</div>
          <div class="function-desc">
            “目录节点”主要用来对项目内的所有用例进行批量操作，如：批量运行、批量移动、批量标记等。
          </div>
        </div>
      </div>
      <div class="function-visible">
        <div class="function-content">
          <div class="function-message">可见性</div>
          <div style="
              color: #667085;
              font-weight: 400;
              font-size: 12px;
              margin-bottom: 0;
            ">
            “可见性”主要用来设置文档是否可以对外分享或发布，目录仅可设置为【共享】
          </div>
        </div>
        <el-select class="function-content-select" disabled v-model="visibel">
          <template #label="{ label, value }">
            <span><el-icon>
                <Share />
              </el-icon></span>
            <span style="font-weight: bold; margin-left: 5px">共享</span>
          </template>
          <el-option :key="0" />
        </el-select>
      </div>
      <div style="border-bottom: 1px solid var(--border-color-light)"></div>
      <div class="function-visible">
        <span style="font-size: 16px; font-weight: 500">其他设置</span>
      </div>
      <div class="change-name">
        <div style="width: 100%">
          <el-input disabled v-model="page_target.title"></el-input>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";
const visibel = ref(0);
const props = defineProps({
  page_target: {
    type: null,
    default: -1,
  }
});


</script>
<style scoped lang="scss">
.change-name {
  padding: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.main-content {
  width: 70%;
  margin-left: 50px;
}

.function-url {
  border: 1px solid #eaecf0;
  border-radius: 14px;
  display: flex;
  color: #344054;
  font-size: 14px;
  font-weight: 400;
  padding: 6px;
  margin-top: 8px;
  justify-content: space-between;
  align-items: center;
  background-color: #f2f4f7;
}

.function-container {
  background-image: url(https://asynctest.oss-cn-shenzhen.aliyuncs.com/static/bg_01.svg);
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  border: 1px solid #eaecf0;
  margin-top: 20px;
  padding: 16px 20px 20px;
  border-radius: 8px;
}

.function-visible {
  display: flex;
  justify-content: start;
  align-items: center;
  margin-top: 10px;
  padding: 16px 0px 20px 20px;
}

.function-content-select {
  flex: 1.5;
}

.function-content {
  flex: 8.5;
  min-width: 0;
  border: 0 solid;
  color: #344054;

  .function-message {
    color: #344054;
    font-weight: 500;
    font-size: 14px;
  }

  .function-desc {
    font-size: 14px;
    line-height: calc(14px + 8px);
  }
}
</style>
