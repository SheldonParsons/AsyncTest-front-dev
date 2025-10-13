<template>
    <motion.div class="special-btn" :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.1 }" @click="emit('click')">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="lucide lucide-x-icon lucide-x">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    </motion.div>
</template>


<script setup lang="ts">
import { motion } from 'motion-v'

const emit = defineEmits(["click"])
</script>

<style>
.special-btn {
    padding: 5px;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    border: 2px solid #f0f0f0;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
}

.special-btn:hover {
    background-color: #f0f0f0;
}
</style>