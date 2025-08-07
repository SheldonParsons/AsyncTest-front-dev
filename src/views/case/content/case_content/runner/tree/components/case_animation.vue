<script setup lang="ts">
import { motion } from 'motion-v'
// 从 motion-v 导入 Variants 类型

const draw: any = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (custom: any) => {
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
        <motion.path :variants="draw" :custom="0" :style="shape" stroke="black" fill="black" d="M10 22a2 2 0 0 1-2-2" />
        <motion.path :variants="draw" :custom="0" :style="shape" stroke="black" fill="black" d="M16 22h-2" />
        <motion.path :variants="draw" :custom="0" :style="shape" stroke="black" fill="black"
            d="M16 4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-5a2 2 0 0 1 2-2h5a1 1 0 0 0 1-1z" />
        <motion.path :variants="draw" :custom="0" :style="shape" stroke="black" fill="black" d="M20 8a2 2 0 0 1 2 2" />
        <motion.path :variants="draw" :custom="0" :style="shape" stroke="black" fill="black" d="M22 14v2" />
        <motion.path :variants="draw" :custom="0" :style="shape" stroke="black" fill="black" d="M22 20a2 2 0 0 1-2 2" />
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