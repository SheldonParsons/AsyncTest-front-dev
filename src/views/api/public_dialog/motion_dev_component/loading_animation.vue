<template>
    <motion.div class="loading-container" animate="jump" :transition="{ staggerChildren: -0.2, staggerDirection: -1 }">
        <motion.div class="dot" :variants="dotVariants" />
        <motion.div class="dot" :variants="dotVariants" />
        <motion.div class="dot" :variants="dotVariants" />
    </motion.div>
</template>

<script setup>
import { motion } from "motion-v"

const dotVariants = {
    jump: {
        y: -10,
        transition: {
            duration: 0.8,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
        },
    },
}
</script>

<style lang="scss" scoped>
.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;

    .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #ff0088;
        will-change: transform;
    }
}
</style>
