<template>
    <div class="item-empty">
  <span ><img class="empty-img" src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/static/logo_bw.png" alt="empty" ></span>
  <div class="opening"><el-icon><Share /></el-icon><span style="margin-left: 5px;">打开项目概览</span></div>
</div>
</template>

<style scoped lang="scss">
.item-empty {
    top: -50px;
    padding-bottom: 40px;
    height: calc(100% - 40px);
    display: flex;
    width: 100%;
    position: absolute;
    justify-content: center;
    align-items: center;
    flex-direction: column;
}
.opening {
    box-sizing: border-box;
    margin-top: 10px;
    font-size: 13px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 5px;
    opacity: .8;
    text-align: center;
    padding: .5rem;
    display: flex;
    align-items: center;
    cursor: pointer;
}
.empty-img {
    margin-bottom: 1.25rem;
    display: inline-block;
    color: var(--ui-icon-color);
    font-style: normal;
    line-height: 0;
    text-align: center;
    text-transform: none;
    vertical-align: -.125em;
    width: 90px;
    text-rendering: optimizelegibility;
    -webkit-font-smoothing: antialiased;
}

</style>