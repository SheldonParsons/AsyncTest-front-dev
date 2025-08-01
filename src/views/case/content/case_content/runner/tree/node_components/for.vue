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
                <motion.div class="info">
                    <CheckBox :check="check" @change="changeCheck"></CheckBox>
                    <motion.span class="node-label" :animate="{ color: hoveredNodeId === data.id ? '#000' : '#333' }">
                        <LoopAnimationIcon :key="data.id"></LoopAnimationIcon>
                    </motion.span>
                    <motion.div :class="{ 'inactive-label': data.check === 'none' }" class="label">{{ data.label }}
                    </motion.div>
                </motion.div>
                <motion.div class="action">
                    <ActionGroup :group="action_group" @action="action"></ActionGroup>
                </motion.div>
            </motion.div>
        </motion.div>
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
import CheckBox from '@/assets/motion/checkbox.vue'
import DragHandle from '@/views/case/content/case_content/runner/tree/components/draghandle.vue'
import LoopAnimationIcon from '@/views/case/content/case_content/runner/tree/components/loop_animation.vue'
import ActionGroup from '@/views/case/content/case_content/runner/tree/components/action_group.vue'

const emit: any = defineEmits(['changeHover', 'canDragAction', 'changeCheck'])
const props = defineProps<{
    data: any
    hoveredNodeId: number | null
    check: string,
    action_group: Array<string>
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
const action = (t: string) => {
    emit('action', t, props.data)
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
    box-sizing: border-box;
    max-width: calc(100% - 14px);
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

    .node-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        /* Ensure that .info and .action take up the full width of .node-info */
        gap: 8px;
    }

    .info {
        display: flex;
        align-items: center;
        gap: 8px;
        /* Take 90% of .node-info width */
        max-width: calc(100% - 90px - 8px);
        min-width: 100px;
        width: 100%;
        /* Prevent it from expanding beyond 90% */
    }

    .checkbox-container {
        width: 14px;
        /* Fixed width */
        height: 14px;
    }

    .node-label {
        min-width: 30px;
        /* Minimum width */
        font-size: 14px;
        font-weight: 500;
        color: #333;
        transition: color 0.2s ease;
        display: flex;
        align-items: center;
        flex-shrink: 0;
        /* Prevent shrinking */
    }

    .label {
        flex-grow: 1;
        /* Allow this to take up remaining space */
        overflow: hidden;
        /* Hide overflow */
        text-overflow: ellipsis;
        max-width: calc(100% - 30px - 14px - 16px);
        min-width: 0;
        /* Show ellipsis when content overflows */
        white-space: nowrap;
        /* Prevent wrapping */
    }

    .inactive-label {
        color: #d3d3d3;
        /* 淡灰色 */
        text-decoration: line-through;
        /* 横线穿过文字 */
    }

    .action {
        flex: 0 0 10%;
        /* Take 10% of .node-info width */
        min-width: 90px;
        display: flex;
        align-items: center;
        justify-content: start;
        flex-shrink: 0;
                display: flex;
        justify-content: end;
    }
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