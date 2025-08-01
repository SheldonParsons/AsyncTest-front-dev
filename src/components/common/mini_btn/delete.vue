<template>
    <motion.div class="mini-btn-filter" :whilePress="{ scale: 0.9 }">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="lucide lucide-trash2-icon lucide-trash-2">
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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