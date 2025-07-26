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
                    <ScriptAnimationIcon :key="data.id"></ScriptAnimationIcon>
                </motion.span>
            </motion.div>
        </motion.div>
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
import CheckBox from '@/assets/motion/checkbox.vue'
import DragHandle from '@/views/case/content/case_content/tree/components/draghandle.vue'
import ScriptAnimationIcon from '@/views/case/content/case_content/tree/components/script_animation.vue'

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
    background-color: rgba(86, 87, 88, .03);
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
    display: flex;
    align-items: center;
}

.post {
    background: linear-gradient(90deg, #FF7E5F, #FEB47B);
}

.get {
    background: linear-gradient(90deg, #30863e, #4fa380);
}

.put {
    background: linear-gradient(90deg, #373086, #5e5ab9);
}

.delete {
    background: linear-gradient(90deg, #d84d4d, #b95a5a);
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