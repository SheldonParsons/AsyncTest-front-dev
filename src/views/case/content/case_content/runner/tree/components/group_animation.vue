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
                pathLength: { delay, type: 'spring', duration: 0.2, bounce: 0 },
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
        <motion.path :variants="draw" :custom="2" :style="shape" stroke="black" fill="black"
            d="M3 7V5c0-1.1.9-2 2-2h2" />
        <motion.path :variants="draw" :custom="2" :style="shape" stroke="black" fill="black"
            d="M17 3h2c1.1 0 2 .9 2 2v2" />
        <motion.path :variants="draw" :custom="2" :style="shape" stroke="black" fill="black"
            d="M21 17v2c0 1.1-.9 2-2 2h-2" />
        <motion.path :variants="draw" :custom="2" :style="shape" stroke="black" fill="black"
            d="M7 21H5c-1.1 0-2-.9-2-2v-2" />
        <motion.rect :variants="draw" :custom="2" :style="shape" stroke="black" fill="black" width="7" height="5" x="7"
            y="7" rx="1" />
        <motion.rect :variants="draw" :custom="2" :style="shape" stroke="black" fill="black" width="7" height="5" x="10"
            y="12" rx="1" />
    </motion.svg>

</template>

<style lang="scss" scoped>
.case-drag-handle {
    /* 把 currentColor 从纯黑改成比如深灰 */
    color: transparent;
    cursor: grab;
    outline: none;

    path,
    rect {
        outline: none;
    }
}
</style>