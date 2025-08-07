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
                        <TimeAnimationIcon :key="data.id"></TimeAnimationIcon>
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
import TimeAnimationIcon from '@/views/case/content/case_content/runner/tree/components/time_animation.vue'
import ActionGroup from '@/views/case/content/case_content/runner/tree/components/action_group.vue'
import { ref } from 'vue'
import useClipboard from 'vue-clipboard3/dist/esm/index.js'
import TooltipAnimation from '@/components/common/general/tooltip.vue'

const emit: any = defineEmits(['changeHover', 'canDragAction', 'changeCheck'])
const props = defineProps<{
    data: any
    hoveredNodeId: number | null
    check: string,
    action_group: Array<string>
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
    border: 2px solid #56575814;
    padding: 7px 16px;
    background-color: rgba(86, 87, 88, .03);
    border-radius: 6px;
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
        max-width: calc(100% - 65px - 8px);
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
        min-width: 65px;
        display: flex;
        align-items: center;
        justify-content: start;
        flex-shrink: 0;
        display: flex;
        justify-content: end;
    }
}


.gradient-text {
    /* 定义背景渐变 */
    /* 将背景裁剪到文字（仅 WebKit 内核生效）*/
    -webkit-background-clip: text;
    /* 文字本身透明，这样才能显示背景 */
    -webkit-text-fill-color: transparent;
    /* 对非 WebKit 浏览器，也可以加上普通 background-clip */
    background-clip: text;
    /* 如果希望支持 Firefox，需要开启 text-fill-color 的标准属性（目前仍需前缀或兼容写法） */
    color: transparent;
    font-weight: 800;
}



.node-count {
    font-size: 12px;
    color: #999;
}
</style>