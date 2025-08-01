<template>
    <motion.div class="mini-btn-filter" :whilePress="{ scale: 0.9 }">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="lucide lucide-ellipsis-icon lucide-ellipsis">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
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