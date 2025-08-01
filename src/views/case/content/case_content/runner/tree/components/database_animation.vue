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
        <motion.ellipse :variants="draw" :custom="0" :style="shape" stroke="black" fill="black" cx="12" cy="5" rx="9"
            ry="3" />
        <motion.path :variants="draw" :custom="0" :style="shape" stroke="black" fill="black"
            d="M3 5V19A9 3 0 0 0 21 19V5" />
        <motion.path :variants="draw" :custom="0" :style="shape" stroke="black" fill="black"
            d="M3 12A9 3 0 0 0 21 12" />
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