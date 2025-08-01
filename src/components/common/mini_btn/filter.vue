<template>
    <motion.div class="mini-btn-filter" :whilePress="{ scale: 0.9 }">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-filter-icon lucide-list-filter">
            <path d="M3 6h18" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
        </svg>
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
</script>

<style lang="scss" scoped>
.mini-btn-filter {
    width: 1.5rem;
    height: 1.5rem;
    box-sizing: border-box;
    padding: 3px;
    border-radius: 4px;
    cursor: pointer;
}

.mini-btn-filter:hover {
    background: rgba($color: #ffffff, $alpha: 0.2);
}
</style>