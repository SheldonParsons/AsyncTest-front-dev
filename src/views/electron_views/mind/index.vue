<template>
    <div class="create-mind-div" @click="openMindNewInstance">创建 AsyncTest Mind</div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';

onMounted(() => {
    openMindNewInstance()
})

async function openMindNewInstance() {
    // 主进程负责：new doc + open mind window（统一窗口配置）
    await window.electronAPI.amind.newAndOpenWindow();
}
</script>

<style lang="scss" scoped>
.create-mind-div {
    width: 100px;
    height: 100px;
    margin: 20px;
    background-color: #f0f0f0;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
}
</style>
