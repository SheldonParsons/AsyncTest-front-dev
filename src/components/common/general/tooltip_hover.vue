<template>
    <Tooltip.Provider>
        <Tooltip.Root v-model:open="open" :delay-duration="100">
            
            <Tooltip.Trigger as-child>
                <slot />
            </Tooltip.Trigger>

            <Tooltip.Portal>
                <Tooltip.Content force-mount :side-offset="sideOffset" :side="side" style="z-index: 9999;">
                    <AnimatePresence>
                        <motion.div 
                            v-if="open"
                            class="tooltip-box" 
                            :initial="{ opacity: 0, scale: 0.9 }"
                            :animate="{ opacity: 1, scale: 1 }" 
                            :exit="{ opacity: 0, scale: 0.9 }"
                            :transition="{ duration: 0.15 }"
                        >
                            {{ text }}
                            <Tooltip.Arrow class="tooltip-arrow" />
                        </motion.div>
                    </AnimatePresence>
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    </Tooltip.Provider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
// @ts-ignore
import { Tooltip } from 'reka-ui/namespaced'

defineProps({
    // 核心内容属性
    text: { type: String, required: true },
    // 侧边偏移量
    sideOffset: { type: Number, default: 5 },
    // 显示位置: top, right, bottom, left
    side: { type: String, default: 'top' }
})

const open = ref(false)
</script>

<style lang="scss" scoped>
.tooltip-box {
    background-color: #000; /* 纯黑背景 */
    color: #fff;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1;
    pointer-events: none; /* 防止遮挡鼠标 */
    white-space: nowrap;  /* 文字不换行 */
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.tooltip-arrow {
    fill: #000; /* 箭头颜色同背景 */
}
</style>