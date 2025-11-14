<script setup lang="ts">
import { motion } from 'motion-v'
import { AnimateNumber } from 'motion-plus-vue'

/**
 * 1. 使用 defineProps 接收 v-model 绑定的值 (即 'modelValue' prop)
 * 并提供了默认值 0
 */
const props = withDefaults(defineProps<{
    modelValue?: number
}>(), {
    modelValue: 0
})

/**
 * 2. 容器样式 (添加了 justifyContent: 'center' 以便数字居中)
 */
const container = {
    backgroundColor: "black",
    borderRadius: '0px',
    padding: "0px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center", // <-- 添加此行以居中
    fontFamily: `"Azeret Mono", monospace`,
    minWidth: "14px", // 可以设置一个最小宽度以避免数字变化时宽度跳动
}

const number = {
    fontSize: '0.9rem',
    fontVariantNumeric: 'tabular-nums',
}
</script>

<template>
    <motion.div :style="container">
        <AnimateNumber :style="number" :value="props.modelValue"></AnimateNumber>
    </motion.div>
</template>