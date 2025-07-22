<template>
    <motion.div class="custom-tree-node" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :transition="{ duration: 1, delay: 0.1, ease: [0, 0.71, 0.2, 1.01] }" @mouseenter="handleNodeHover(true)"
        @mouseleave="handleNodeHover(false)">
        <DragHandle @pointerdown="onHandlePointerDown" v-if="hoveredNodeId === data.id" :key="data.id"></DragHandle>
        <div v-else style="width: 14px;"></div>
        <!-- 节点内容 -->
        <motion.div class="node-content" :animate="{
        }" :transition="{ duration: 0.2 }">
            <motion.div class="node-info">
                <motion.span class="node-label" :animate="{ color: hoveredNodeId === data.id ? '#000' : '#333' }">
                    {{ data.label }}:{{ data.id }}
                </motion.span>
                <motion.span class="node-count" :initial="{ opacity: 0 }" :animate="{ opacity: 0.6 }"
                    :transition="{ delay: 0.1 }">
                    {{ data.children ? `(${data.children.length})` : '' }}
                </motion.span>
            </motion.div>
        </motion.div>
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
import CheckBox from '@/assets/motion/checkbox.vue'
import DragHandle from '@/views/case/content/case_content/tree/components/draghandle.vue'

const emit: any = defineEmits(['changeHover', 'canDragAction', 'changeCheck'])
const props = defineProps<{
    data: any
    hoveredNodeId: number | null
    check: string
}>()

const changeCheck = (type: string) => {
    emit('changeCheck', type)
}

const handleNodeHover = (isHovering: boolean) => {
    emit('changeHover', isHovering ? props.data.id : -1)
}

const onHandlePointerDown = (_: any) => {
    emit('canDragAction', true)
    const wrapper = _.currentTarget as HTMLElement
    wrapper.style.visibility = 'hidden'
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
    border: 2px solid #56575814;
    padding: 7px 16px;
    background-color: rgba(86, 87, 88, .04);
    border-radius: 6px;
    transition: all 0.2s ease;
}

.node-info {
    display: flex;
    align-items: center;
    gap: 8px;
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