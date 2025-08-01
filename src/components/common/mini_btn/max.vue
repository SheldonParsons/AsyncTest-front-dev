<template>
    <motion.div class="mini-btn-filter" :whilePress="{ scale: 0.9 }">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="lucide lucide-maximize2-icon lucide-maximize-2">
            <path d="M15 3h6v6" />
            <path d="m21 3-7 7" />
            <path d="m3 21 7-7" />
            <path d="M9 21H3v-6" />
        </svg>
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
</script>

<style lang="scss" scoped>
.mini-btn-filter {
    width: 1.7rem;
    height: 1.7rem;
    box-sizing: border-box;
    padding: 5px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid #eaecf0;
}

.mini-btn-filter:hover {
    background: rgba($color: #ffffff, $alpha: 0.2);
    border: 1px solid #cbcccf;
}
</style>