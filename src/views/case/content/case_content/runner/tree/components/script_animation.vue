<script setup lang="ts">
import { motion } from 'motion-v'
// 从 motion-v 导入 Variants 类型
import type { Variants } from 'motion-v'

const draw: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (custom) => {
        const i = typeof custom === 'number' ? custom : Number(custom) || 0
        const delay = i * 0.1
        return {
            pathLength: 1,
            opacity: 1,
            transition: {
                pathLength: { delay, type: 'spring', duration: 1, bounce: 0 },
                opacity: { delay, duration: 0.01 },
            },
        }
    },
}

const shape = {
    strokeWidth: 2,
    strokeLinecap: 'round',
    fill: 'transparent',
}
</script>

<template>
    <motion.svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" :variants="draw"
    initial="hidden" animate="visible" class="case-drag-handle">
        <motion.path :variants="draw" :custom="0" :style="shape"  stroke="black" fill="black" d="M10 12.5 8 15l2 2.5" />
        <motion.path :variants="draw" :custom="0" :style="shape"  stroke="black" fill="black" d="m14 12.5 2 2.5-2 2.5" />
        <motion.path :variants="draw" :custom="0" :style="shape"  stroke="black" fill="black" d="M14 2v4a2 2 0 0 0 2 2h4" />
        <motion.path :variants="draw" :custom="0" :style="shape"  stroke="black" fill="black" d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
    </motion.svg>
</template>

<style lang="scss" scoped>
.case-drag-handle {
    /* 把 currentColor 从纯黑改成比如深灰 */
    color: transparent;
    cursor: grab;
    outline: none;

    path {
        outline: none;
    }
}
</style>