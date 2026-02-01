<template>
    <Tooltip.Provider>
        <motion.div class="step-action-group-container">
            <div v-for="(item, index) in group" :key="index" @mouseenter="onEnter(item)" @mouseleave="onLeave">
                <Tooltip.Root :open="openItem === item">
                    <Tooltip.Trigger class="tooltip-trigger-switch" as-child>
                        <div class="item" @click.stop="action(item)"
                            :style="{ backgroundColor: itemBackgroundColor, color: itemColor }">
                            <component v-if="icons[item]" :is="icons[item]" />
                            <div v-else class="remote-icon-wrapper">
                                <img :src="getRemoteIconUrl(item)" class="remote-icon-img" alt="" />
                            </div>
                        </div>
                    </Tooltip.Trigger>

                    <Tooltip.Portal>
                        <Tooltip.Content force-mount v-if="openItem === item" as-child :side-offset="10">
                            <motion.div class="tooltip-content" :initial="{ opacity: 0, y: 20, scale: 0.8 }"
                                :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.8,
                                    transition: { duration: 0.1 },
                                }" :transition="{
                                    ...spring,
                                    opacity: { ...spring, bounce: 0 } as any,
                                } as any">
                                <motion.div :style="{ wordBreak: 'break-all' }">
                                    <motion.div>{{ actionDesc[item] }}</motion.div>
                                </motion.div>
                                <Tooltip.Arrow class="tooltip-arrow" />
                            </motion.div>
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip.Root>
            </div>
        </motion.div>
    </Tooltip.Provider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { motion } from 'motion-v'
// @ts-ignore
import { Tooltip } from 'reka-ui/namespaced'

import CopyIcon from '@/assets/logo/final/match_vue/copy.vue'
import BanIcon from '@/assets/logo/final/match_vue/ban.vue'
import DeleteIcon from '@/assets/logo/final/match_vue/delete.vue'
import AddSiblingIcon from '@/assets/logo/final/match_vue/add_sibling.vue'
import AddChildIcon from '@/assets/logo/final/match_vue/add_child.vue'
import BatchIcon from '@/assets/logo/final/match_vue/edit.vue'

// props & emits
const props = defineProps({
    group: {
        tye: null,
        default: ['copy', 'disable', 'delete', 'addSiblingStep', 'addChildStep']
    },
    actionDesc: {
        type: null,
        default: {
            copy: '复制',
            disable: '禁用/启用',
            delete: '删除',
            addSiblingStep: '添加相邻步骤',
            addChildStep: '添加子步骤'
        }
    },
    // 新增：背景颜色 prop
    itemBackgroundColor: {
        type: String,
        default: 'rgb(227, 227, 227)'
    },
    // 新增：文字和图标颜色 prop
    itemColor: {
        type: String,
        default: 'rgb(148, 148, 148)'
    },
    other_icons: {
        type: null,
        default: () => []
    }
})

const emit = defineEmits(['action'])

// 图标组件映射
const icons: Record<string, any> = {
    copy: CopyIcon,
    disable: BanIcon,
    delete: DeleteIcon,
    addSiblingStep: AddSiblingIcon,
    addChildStep: AddChildIcon,
    batchEdit: BatchIcon
}


// 动画参数
const spring = {
    type: 'spring',
    bounce: 0.6,
    visualDuration: 0.3
}

// 当前打开的 Tooltip key
const openItem = ref<string | null>(null)
let hideTimer: number | null = null

function onEnter(item: string) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
    openItem.value = item
}

function onLeave(e: MouseEvent) {
    const { currentTarget, relatedTarget } = e
    // 如果还在同一个包裹容器内，就不算真正离开
    if (currentTarget instanceof Node &&
        relatedTarget instanceof Node &&
        currentTarget.contains(relatedTarget)) {
        return
    }
    // 轻微延迟再隐藏，避免边缘抖动
    hideTimer = window.setTimeout(() => openItem.value = null, 80)
}

// 触发外部事件
function action(t: string) {
    emit('action', t)
}

const getRemoteIconUrl = (name: string): string | undefined => {
    const iconData: any = props.other_icons.find((i: any) => i.name === name)
    return iconData ? iconData.url : undefined
}
</script>

<style lang="scss" scoped>
.step-action-group-container {
    display: flex;
    justify-content: start;
    align-items: center;
    border-radius: 5px;
    cursor: pointer;

    .tooltip-trigger-switch {
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
    }

    .item {
        display: flex;
        align-items: center;
        padding: 5px;
    }

    .item:hover {
        background-color: rgba(132, 132, 132, 0.3) !important;
        color: rgb(0, 0, 0) !important;
    }

    svg {
        width: 0.7rem;
        height: 0.7rem;
    }

    .remote-icon-wrapper {
        width: 0.7rem;
        height: 0.7rem;
        overflow: hidden; // 关键：隐藏原本的图片
        display: flex; // 保持内部 img 对齐
        align-items: center;
        justify-content: center;

        .remote-icon-img {
            width: 100%;
            height: 100%;
            // 1. 将原始图片移到容器左侧看不见的地方 (-100%)
            transform: translateX(-100%);
            // 2. 利用 drop-shadow 把影子投射回容器中央
            //    currentColor 让影子继承父级文字颜色
            //    $icon-size 必须和上面的宽度一致，才能正好投射回来
            filter: drop-shadow(0.7rem 0 0 currentColor);
        }
    }
}

.step-action-group-container>div:first-child .item {
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
}

.step-action-group-container>div:last-child .item {
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
}

.tooltip-content {
    background: black;
    padding: 8px;
    border-radius: 8px;
    color: white;
    font-size: 0.8rem;
}

.tooltip-arrow {
    /* 可根据需求自定义箭头样式 */
}

.tooltip-text {
    word-break: break-all;
}
</style>
