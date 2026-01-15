<template>
    <TooltipAnimation :isOpen="showIdTooltip === true">
        <template #trigger>
            <slot>
                <motion.div :while-press="{ scale: 0.9 }" class="default-btn" @mouseenter="showIdTooltip = true"
                    @mouseleave="showIdTooltip = false">
                    <SwitchSvg></SwitchSvg>
                </motion.div>
            </slot>
        </template>
        <template #default>
            <div>{{ type ? trueText : falseText }}</div>
        </template>
    </TooltipAnimation>
</template>

<script lang="ts" setup>
import { ref } from "vue"
import { motion } from 'motion-v'
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import SwitchSvg from '@/assets/svg/tree/switch.vue'

const props = defineProps({
    trueText: {
        default: "显示模型名",
        type: String
    },
    falseText: {
        default: "显示昵称",
        type: String
    },
    type: {
        default: false,
        type: Boolean
    }
})
const showIdTooltip = ref(false)
</script>

<style lang="scss" scope>
    .default-btn {
        padding: 3px;
        border-radius: 6px;
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