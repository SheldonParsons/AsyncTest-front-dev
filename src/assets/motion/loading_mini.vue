<script setup lang="ts">
import { motion } from "motion-v"

const props = defineProps({
    width: {
        default: '14px',
        type: null
    },
    height: {
        default: '14px',
        type: null
    }
})
</script>

<template>
    <div class="mini-loading-container">
        <motion.div class="spinner" :animate="{ rotate: 360 }" :transition="{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
        }" :style="{ width: props.width, height: props.height }" />
    </div>
</template>

<style lang="scss" scoped>
.mini-loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0px;
    border-radius: 0px;

    .spinner {
        border-radius: 50%;
        border: 2px solid #f0f0f0;
        border-top-color: #2e2e2e;
        will-change: transform;
    }
}
</style>
