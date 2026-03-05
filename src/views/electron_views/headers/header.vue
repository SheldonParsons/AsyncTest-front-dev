<template>
    <div class="custom-header" @mouseenter="switchWindowBtn(true)" @mouseleave="switchWindowBtn(false)">
        <div class="traffic-lights-placeholder"></div>

        <div class="content">
            <span></span>
        </div>
    </div>
</template>

<script lang="ts" setup>
function switchWindowBtn(open: boolean) {
    if (window.electronAPI) {
        window.electronAPI.toggleTrafficLights(open);
    }
}
</script>

<style scoped lang="scss">
/* 保持你之前的样式不变 */
.custom-header {
    height: 20px;
    width: 100%;
    display: flex;
    align-items: center;
    user-select: none;
    -webkit-app-region: no-drag;
    background-color: white;

    .content {
        flex: 1;
        height: 100%;
        min-height: 20px;
        -webkit-app-region: drag;
        min-width: 100px;
        display: flex;
        align-items: center;
    }
}

.traffic-lights-placeholder {
    width: 80px;
    height: 100%;
    flex-shrink: 0;
    -webkit-app-region: no-drag;
}
</style>