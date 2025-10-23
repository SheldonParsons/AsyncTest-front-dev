<template>
    <motion.div>
        <motion.div class="inner-line"></motion.div>
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
</script>

<style lang="scss" scope>
@keyframes blinkLine {

    0%,
    100% {
        opacity: 0;
    }

    50% {
        opacity: 1;
    }
}

/* 基础线条样式 */
.target-line-top,
.target-line-button {
    height: 8px;
    background-color: transparent;
    margin-left: 14px;
    margin-right: 5px;
    /* 默认隐藏时透明 */
    opacity: 0;
    transition: opacity 0.2s ease;
    display: flex;
    align-items: center;
}

/* 有 .hidden 类时保持隐藏 */
.target-line-top.hidden,
.target-line-button.hidden {
    visibility: hidden;
    opacity: 0 !important;
}

/* 没有 .hidden 时，开启闪烁动画 */
.target-line-top:not(.hidden),
.target-line-button:not(.hidden) {
    visibility: visible;
    /* 一旦可见，就用无限循环的 blinkLine 动画 */
    animation: blinkLine 1s infinite ease-in-out;
}

.inner-line {
    height: 3px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.6);  /* fallback for old browsers */     
    background: -webkit-linear-gradient(to right, rgb(0, 0, 0), rgb(0, 0, 0), rgb(0, 0, 0));  /* Chrome 10-25, Safari 5.1-6 */      
    background: linear-gradient(to right, rgb(0, 0, 0), rgb(0, 0, 0), rgb(0, 0, 0)); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */      
    width: 100%;
}
</style>