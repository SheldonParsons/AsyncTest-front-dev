<template>
    <motion.div class="ast-special-btn" :class="{ 'disabled': disabled }" @click="handleClick"
        :whilePress="disabled ? {} : { scale: 0.9 }" :style="buttonStyle">
        <slot />
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
import { computed } from 'vue'

const props = defineProps({
    // 基础样式
    bgColor: { type: String, default: 'rgb(0, 0, 0)' },
    fontColor: { type: String, default: 'rgb(255, 255, 255)' },
    borderColor: { type: String, default: 'rgb(0, 0, 0)' },

    // 新增：尺寸控制
    padding: { type: String, default: '6px' },
    borderRadius: { type: String, default: '8px' },

    // 新增：禁用状态
    disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

// 使用 computed 属性来动态计算样式
const buttonStyle = computed(() => {
    if (props.disabled) {
        return {
            backgroundColor: '#f0f0f0', // 禁用时的背景色
            color: '#a0a0a0',         // 禁用时的文字颜色
            borderColor: '#dcdcdc',
            padding: props.padding,
            borderRadius: props.borderRadius,
        }
    }
    console.log(props.padding);
    
    return {
        backgroundColor: props.bgColor,
        color: props.fontColor,
        borderColor: props.borderColor,
        padding: props.padding,
        borderRadius: props.borderRadius,
    }
})

// 点击事件处理
function handleClick() {
    if (!props.disabled) {
        emit('click')
    }
}
</script>

<style scoped>
.ast-special-btn {
    border: none;
    cursor: pointer;
    /* 样式由 props 和 computed 属性动态控制 */
    transition: background-color 0.2s ease, color 0.2s ease;
}

.ast-special-btn.disabled {
    cursor: not-allowed;
}
</style>
