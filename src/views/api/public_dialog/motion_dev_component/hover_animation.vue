<template>
    <div class="hover-container">
        <Tooltip.Provider>
            <Tooltip.Root v-model:open="open">
                <Tooltip.Trigger class="tooltip-trigger" @mouseenter="open = true" @mouseleave="open = false">
                    <motion.div style="width: 250px;" class="g-ellipsis" @click="copy_data(value)">
                        <TypewriteAnimation :text="value.length > 0 ? value :
                            '动态值（空）'"></TypewriteAnimation>
                    </motion.div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <AnimatePresence>
                        <Tooltip.Content v-if="open" as-child :side-offset="10">
                            <motion.div class="tooltip-content" :initial="{ opacity: 0, y: 20, scale: 0.8 }"
                                :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.8,
                                    transition: { duration: 0.1 },
                                }" :transition="{
                                    ...spring,
                                    opacity: { ...spring, bounce: 0 },
                                }">
                                <motion.div :style="{ wordBreak: 'break-all' }">
                                    <motion.div :style="{ wordBreak: 'break-all' }">{{ value.length > 0 ? value :
                                        '动态值（空）' }}</motion.div>
                                </motion.div>
                                <Tooltip.Arrow class="tooltip-arrow" />
                            </motion.div>
                        </Tooltip.Content>
                    </AnimatePresence>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    </div>
</template>
<script setup lang="ts">
import { AnimatePresence, motion } from "motion-v"
// @ts-ignore
import { Tooltip } from "reka-ui/namespaced"
import { ref } from "vue"
import TypewriteAnimation from "@/views/api/public_dialog/motion_dev_component/typewrite_animation.vue"
import useClipboard from "vue-clipboard3/dist/esm/index.js";
const open = ref(false)

async function copy_data(data: string) {
    if (data.length === 0) {
        window.$toast?.({
            title: '内容为空',
            actionText: '关闭',
            type: 'info',
            duration: 3000,
        })
        return
    }

    const { toClipboard } = useClipboard();
    await toClipboard(data);
    window.$toast?.({
        title: '已复制',
        actionText: '关闭',
        type: 'success',
        duration: 3000,
    })
}

const spring: any = {
    visualDuration: 0.3,
    type: "spring",
    bounce: 0.6,
}

const props = defineProps({
    value: {
        default: '动态值',
        type: String
    }
})
</script>
<style>
.hover-container {
    display: flex;
    align-items: center;
    justify-content: center;
}

.tooltip-content {
    border-radius: 8px;
    padding: 10px 15px;
    font-size: 14px;
    line-height: 1;
    background-color: #000000;
    user-select: none;
    will-change: transform, opacity;
    color: #ffffff;
    max-width: 400px!important;
    z-index: 9999;
    /* 确保 tooltip 在最上层 */
}

.tooltip-arrow {
    fill: #000000;
}

/* 全局样式，确保 reka-ui 的 portal 在最上层 */
:global([data-reka-ui-portal]) {
    z-index: 9999 !important;
}

/* 确保 tooltip 内容在 dialog 之上 */
:global([role="tooltip"]) {
    z-index: 9999 !important;
}

.tooltip-trigger {
    font-family: inherit;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #0f1115;
    background-color: #0b1011;
    border: 1px solid #1d2628;
    color: #f5f5f5;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
}
</style>
