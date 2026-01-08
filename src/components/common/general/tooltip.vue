<template>
    <Tooltip.Provider>
        <Tooltip.Root :open="isOpen">
            <!-- 触发内容（比如按钮、图标等），永远渲染 -->
            <Tooltip.Trigger as-child>
                <slot name="trigger"/>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content force-mount v-if="isOpen" :side-offset="sideOffset" :side="side" style="z-index: 9999;">
                    <motion.div class="tooltip-content" :initial="{ opacity: 0, y: 10, scale: 0.96 }"
                        :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{ opacity: 0, y: 10, scale: 0.96 }"
                        :transition="{ type: 'spring', bounce: 0.3, visualDuration: 0.22 }">
                        <slot />
                        <Tooltip.Arrow class="tooltip-arrow" />
                    </motion.div>
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    </Tooltip.Provider>
</template>

<script setup lang="ts">
import { motion } from 'motion-v'
// @ts-ignore
import { Tooltip } from 'reka-ui/namespaced'

defineProps({
    sideOffset: { type: Number, default: 8 },
    side: { type: String, default: 'top' },
    isOpen: { type: Boolean, default: false }
})
</script>

<style lang="scss" scoped>
.tooltip-content {
    background: rgba(30, 30, 30, 0.95);
    color: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    min-width: 32px;
    font-size: 13px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.16);
    user-select: none;
    pointer-events: auto;
    max-width: 500px;
}

.tooltip-arrow {
    /* 自定义箭头样式 */
}
</style>
