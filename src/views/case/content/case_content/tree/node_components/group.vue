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
                <CheckBox :check="check" @change="changeCheck"></CheckBox>
                <motion.span class="node-label" :animate="{ color: hoveredNodeId === data.id ? '#000' : '#333' }">
                    <GroupAnimationIcon :key="data.id"></GroupAnimationIcon>
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
import GroupAnimationIcon from '@/views/case/content/case_content/tree/components/group_animation.vue'

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
    margin-right: 5px;
}

.node-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 16px;
    background-color: rgba(86, 87, 88, .03);
    border-radius: 6px 6px 0 0;
    border-left: 2px solid rgba(86, 87, 88, 0.04);
    border-top: 2px solid rgba(86, 87, 88, 0.04);
    border-right: 2px solid rgba(86, 87, 88, 0.04);
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
    display: flex;
    align-items: center;
    gap: 5px;
}

.node-count {
    font-size: 12px;
    color: #999;
}

.node-actions {
    display: flex;
    gap: 4px;
    transition: all 0.2s ease;
}

.node-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 0 0 4px 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #666;
}

.node-action-btn:hover {
    border-color: #333;
    color: #000;
}

.node-action-btn.delete:hover {
    border-color: #ff4444;
    color: #ff4444;
}
</style>