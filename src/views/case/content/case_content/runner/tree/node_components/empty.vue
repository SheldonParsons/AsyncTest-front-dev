<template>
    <motion.div class="custom-tree-node" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :data-id="data.id"
        :transition="{ duration: 1, delay: 0.1, ease: [0, 0.71, 0.2, 1.01] }" @mouseenter="handleNodeHover(true)"
        @mouseleave="handleNodeHover(false)">
        <div style="width: 14px;"></div>
        <!-- 节点内容 -->
        <motion.div class="node-content" :animate="{
        }" :transition="{ duration: 0.2 }">
            <motion.div class="node-info">
                <motion.span class="node-label" :animate="{ color: hoveredNodeId === data.id ? '#000' : '#333' }">
                    拖入或点击以 添加步骤
                </motion.span>
            </motion.div>
        </motion.div>
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'

const emit: any = defineEmits(['changeHover',])
const props = defineProps<{
    data: any
    hoveredNodeId: number | null
}>()
const handleNodeHover = (isHovering: boolean) => {
    emit('changeHover', isHovering ? props.data.id : -1)
}
</script>


<style lang="scss" scoped>
.custom-tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    margin-right: 5px !important;
}

.node-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 2px dotted #0a0a0a14;
    padding: 10px 16px;
    background-color: white;
    border-radius: 6px;
    transition: all 0.2s ease;
    cursor: pointer;
}

@keyframes blink {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0;
    }
}

.drag-hover {
    border: 2px dotted #163172;
    animation: blink 1s infinite;
    will-change: opacity;
}

.node-content:hover {
    border: 2px dotted #163172;
    animation: blink 1s infinite;
    will-change: opacity;

    .node-label {
        color: #163172 !important;
    }
}

.node-info {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    width: 100%;
}

.node-label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    transition: color 0.2s ease;
}

.node-count {
    font-size: 12px;
    color: #999;
}
</style>