<template>
    <motion.div class="custom-tree-node" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :transition="{ duration: 1, delay: 0.1, ease: [0, 0.71, 0.2, 1.01] }" @mouseenter="handleNodeHover(true)"
        @mouseleave="handleNodeHover(false)">
        <DragHandle @pointerdown="onHandlePointerDown" v-if="hoveredNodeId === data.id && read_only === 0" :key="data.id"></DragHandle>
        <div v-else style="width: 14px;"></div>
        <!-- 节点内容 -->
        <motion.div class="node-content" :animate="{
        }" :transition="{ duration: 0.2 }">
            <motion.div class="node-info">
                <motion.div class="info">
                    <CheckBox :check="check" @change="changeCheck"></CheckBox>
                    <motion.span class="node-label" :animate="{ color: hoveredNodeId === data.id ? '#000' : '#333' }">
                        <IfAnimationIcon :key="data.id"></IfAnimationIcon>
                    </motion.span>
                    <motion.div :class="{ 'inactive-label': data.check === 'none' }" class="label">
                        <TooltipAnimation :isOpen="showIdTooltip">
                            <template #trigger><span style="color: rgba(0,0,0,0.5);" @click.stop="copyId(data.id)"
                                    @mouseenter="showIdTooltip = true" @mouseleave="showIdTooltip = false"># {{ data.id
                                    }}</span></template>
                            <template #default>
                                <div style="display: flex;flex-direction: column;gap: 5px;">
                                    <div>点击复制</div>
                                    <div style="color: rgba(255,255,255,0.5);">您可以通过步骤的ID找到它，</div>
                                    <div style="color: rgba(255,255,255,0.5);">并获取它的执行信息。</div>
                                </div>
                            </template>
                        </TooltipAnimation>
                        <div class="g-e">{{ data.label }}</div>
                    </motion.div>
                </motion.div>
                <motion.div class="action" :class="{ 'action-hidden': read_only > 0 }">
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
import IfAnimationIcon from '@/views/case/content/case_content/runner/tree/components/if_animation.vue'
import ActionGroup from '@/views/case/content/case_content/runner/tree/components/action_group.vue'
import { ref } from 'vue'
import useClipboard from 'vue-clipboard3/dist/esm/index.js'
import TooltipAnimation from '@/components/common/general/tooltip.vue'

const emit: any = defineEmits(['changeHover', 'canDragAction', 'changeCheck', 'action'])
const props = defineProps<{
    data: any
    hoveredNodeId: number | null
    check: string,
    action_group: any,
    read_only: number
}>()

const showIdTooltip = ref(false)

async function copyId(step_id: number) {
    const { toClipboard } = useClipboard()
    await toClipboard(step_id.toString())
    window.$toast({ title: '已复制' })
}


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
    background: linear-gradient(80deg,
            rgba(150, 165, 34, 0.1) 0%,
            rgba(155, 188, 37, 0.1) 40%,
            rgba(255, 255, 255, 0.1) 90%);
    border-radius: 6px 6px 0 0;
    border-left: 2px solid rgba(86, 87, 88, 0.04);
    border-top: 2px solid rgba(86, 87, 88, 0.04);
    border-right: 2px solid rgba(86, 87, 88, 0.04);
    transition: all 0.2s ease;
    background-clip: padding-box;

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
        display: flex;
        align-items: center;
        gap: 5px;

        .id-area {
            color: #919191;
        }
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

    .action.action-hidden {
        visibility: hidden;
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