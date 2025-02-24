<template>
  <el-row>
    <el-col :span="15">
      <div class="default-insert">
        <span style="font-weight: 500">插入动态值</span>
      </div>
    </el-col>
    <el-col :span="9" style="display: flex; align-items: center">
      <div class="close-icon">
        <el-icon><CloseBold /></el-icon>
      </div>
    </el-col>
  </el-row>
</template>

<style lang="scss" scoped>
.close-icon {
  width: 100%;
  display: flex;
  justify-content: end;
  align-items: center;
  padding-right: 10px;
}

.default-insert {
  height: 40px;
  width: 100%;
  display: flex;
  justify-content: start;
  align-items: center;
  padding-left: 10px;
}
</style>
