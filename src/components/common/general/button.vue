<template>
    <motion.div class="ast-special-btn" @click="emit('click')" :whilePress="{ scale: 0.9 }">
        <slot />
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
const emit = defineEmits(['click'])
</script>


<style>
.ast-special-btn {
    background-color: rgb(0, 0, 0);
    color: rgb(255, 255, 255);
    padding: 6px 6px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
}
</style>