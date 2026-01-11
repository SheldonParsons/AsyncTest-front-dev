<template>
    <TooltipAnimation :isOpen="showIdTooltip">
        <template #trigger>
            <motion.div :while-press="{ scale: 0.9 }" class="default-btn" @mouseenter="showIdTooltip = true"
                @mouseleave="showIdTooltip = false">
                <slot></slot>
            </motion.div>
        </template>

        <template #default>
            <div>{{ text }}</div>
        </template>
    </TooltipAnimation>
</template>

<script lang="ts" setup>
import { ref } from "vue"
import { motion } from 'motion-v'
import TooltipAnimation from '@/components/common/general/tooltip.vue'

const props = defineProps({
    // 1. 接收一个字符串作为提示内容
    text: {
        type: String,
        default: ""
    }
})

const showIdTooltip = ref(false)
</script>

<style lang="scss" scope>
.default-btn {
    padding: 3px;
    border-radius: 4px;
    border: 1px solid #f0f0f0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: black;
    color: white;
    height: 15px;
    width: 15px;
    margin-right: 5px;

    svg {
        width: 15px;
    }
}
</style>