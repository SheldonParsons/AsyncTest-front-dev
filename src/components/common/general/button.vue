<template>
    <motion.div
        class="ast-special-btn"
        @click="emit('click')"
        :whilePress="{ scale: 0.9 }"
        :style="{
            backgroundColor: bgColor,
            color: fontColor
        }"
    >
        <slot />
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
import { computed } from 'vue'

const props = defineProps({
    bgColor: { type: String, default: 'rgb(0, 0, 0)' },
    fontColor: { type: String, default: 'rgb(255, 255, 255)' }
})
const emit = defineEmits(['click'])
</script>

<style>
.ast-special-btn {
    padding: 6px 6px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    /* 不要在 CSS 里写死 background-color 和 color，交给 props 控制 */
}
</style>
