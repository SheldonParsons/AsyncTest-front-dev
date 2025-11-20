<script setup>
import { motion } from "motion-v"
</script>

<template>
    <div class="mini-loading-container">
        <motion.div class="spinner" :animate="{ rotate: 360 }" :transition="{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
        }" />
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
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid #f0f0f0;
        border-top-color: #2e2e2e;
        will-change: transform;
    }
}
</style>
