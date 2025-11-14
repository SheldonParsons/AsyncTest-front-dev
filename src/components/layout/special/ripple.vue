<script setup lang="ts">
import { defineProps } from 'vue';

// 定义组件的 props
const props = defineProps<{
    color: string; // 接收一个颜色字符串
}>();
</script>

<template>
    <div class="color-wave-dot-container">
        <div class="dot" :style="{ backgroundColor: props.color }"></div>

        <div class="wave wave-1" :style="{ borderColor: props.color }"></div>
        <div class="wave wave-2" :style="{ borderColor: props.color }"></div>
        <div class="wave wave-3" :style="{ borderColor: props.color }"></div>
    </div>
</template>

<style scoped>
.color-wave-dot-container {
    position: relative;
    width: 6px;
    /* 控制整个组件的最小尺寸，以便波纹有空间扩散 */
    height: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dot {
    width: 8px;
    /* 圆点的实际大小，可以根据需要调整 */
    height: 8px;
    border-radius: 50%;
    position: absolute;
    /* 确保圆点位于波纹的中心 */
    /* 确保圆点在波纹之上 */
}

.wave {
    position: absolute;
    width: 100%;
    /* 波纹初始大小与容器相同 */
    height: 100%;
    border-radius: 50%;
    border: 1px solid v-bind(color);
    /* 使用 v-bind 绑定 props.color */
    opacity: 0;
    /* 初始透明度为0 */
    animation: wave-spread 2s infinite ease-out;
    /* 动画名称、时长、循环、缓动函数 */
}

/* 错开每个波纹的动画开始时间 */
.wave-1 {
    animation-delay: 0s;
}

.wave-2 {
    animation-delay: 0.66s;
    /* 第二个波纹延迟 0.66 秒 */
}

.wave-3 {
    animation-delay: 1.33s;
    /* 第三个波纹延迟 1.33 秒 */
}

/* 关键帧动画定义 */
@keyframes wave-spread {
    0% {
        transform: scale(0.1);
        /* 从小尺寸开始 */
        opacity: 1;
        /* 动画开始时完全不透明 */
    }

    100% {
        transform: scale(2.5);
        /* 扩散到指定大小 */
        opacity: 0;
        /* 动画结束时完全透明 */
    }
}
</style>