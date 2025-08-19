<script setup lang="ts">
import { motion } from 'motion-v'

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
        <motion.circle :variants="draw" :custom="0" :style="shape" stroke="black" fill="black" cx="12" cy="12" r="10" />
        <motion.line :variants="draw" :custom="1" :style="shape" stroke="black" fill="black" x1="22" x2="18" y1="12" y2="12" />
        <motion.line :variants="draw" :custom="2" :style="shape" stroke="black" fill="black" x1="6" x2="2" y1="12" y2="12" />
        <motion.line :variants="draw" :custom="3" :style="shape" stroke="black" fill="black" x1="12" x2="12" y1="6" y2="2" />
        <motion.line :variants="draw" :custom="4" :style="shape" stroke="black" fill="black" x1="12" x2="12" y1="22" y2="18" />
    </motion.svg>
</template>

<style lang="scss" scoped>
.case-drag-handle {
    /* 把 currentColor 从纯黑改成比如深灰 */
    color: transparent;
    cursor: grab;
    outline: none;

    path,
    circle{
        outline: none;
    }
}
</style>