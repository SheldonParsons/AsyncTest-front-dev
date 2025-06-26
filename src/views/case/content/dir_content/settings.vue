<template>
  <div class="main-content">
    <div class="function-container">
      <div class="function-content">
        <div class="function-message">功能说明</div>
        <div class="function-desc">
          “目录节点”主要用来对项目内的所有接口进行全局设置，如：Auth、前后置操作、唯一标识等。
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.main-content {
    width: 70%;
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
  margin-top: 10px;
  padding: 16px 20px 20px;
}
.function-content {
  flex: 1;
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

