<template>
    <div class="create-mind-div" @click="openMindNewInstance">创建 AsyncTest Mind</div>
</template>

<script lang="ts" setup>

import { onMounted } from 'vue';

onMounted(async () => {
    await openMindNewInstance()
})

function newWindowKey(prefix: string) {
    return `${prefix}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

async function openMindNewInstance() {
    const key = newWindowKey('mind');

    await window.electronAPI.wm.open({
        key,
        title: 'AsyncTest Mind',
        route: '/mind',
        width: 1600,
        height: 820,
        x:100,
        y:120,
        modal: false,
        alwaysOnTop: false,
        trafficLightPosition: { x: 16, y: 20 },
        nativeHeaderless: true,
        openDevTools: true,
        closeBehavior: 'platform',
        query: { windowKey: key }
    });
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
