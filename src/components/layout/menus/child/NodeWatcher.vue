<script setup lang="ts">
import { watch, defineProps, defineEmits } from 'vue'

// 接收 node 和 data
const props = defineProps({
    node: {
        type: Object,
        required: true
    },
    data: {
        type: Object,
        required: true
    }
})

// 定义我们要发出的事件
const emit = defineEmits(['node-expanded', 'node-collapsed'])

// ---- 核心：监听 node.expanded 属性 ----
watch(
    () => props.node.expanded,
    (newValue, oldValue) => {
        if (newValue === true && oldValue === false) {
            emit('node-expanded', props.data, props.node)
        } else if (newValue === false && oldValue === true) {
            emit('node-collapsed', props.data, props.node)
        }
    }
)
</script>

<template>
</template>