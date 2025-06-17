<template>
  <div class="params-headers">
    <div class="default-insert">
      <span style="font-weight: 500">插入动态值</span>
    </div>
    <div class="close-icon">
      <el-icon @click="close"><CloseBold /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(["close"]);

function close() {
  emit("close");
}
</script>

<style lang="scss" scoped>
.params-headers {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
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
}
</style>
