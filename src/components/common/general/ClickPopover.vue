<template>
    <PopoverRoot>
        <PopoverTrigger as-child>
            <slot name="trigger"/>
        </PopoverTrigger>
        <PopoverPortal>
            <PopoverContent side="bottom" :side-offset="5">
                <motion.div class="tooltip-content" :initial="{ opacity: 0, y: 10, scale: 0.96 }"
                        :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{ opacity: 0, y: 10, scale: 0.96 }"
                        :transition="{ type: 'spring', bounce: 0.3, visualDuration: 0.22 }">

                    <slot />
                </motion.div>
            </PopoverContent>
        </PopoverPortal>
    </PopoverRoot>
</template>

<script setup lang="ts">
import { motion } from 'motion-v'
import { PopoverArrow, PopoverClose, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

defineProps({
    sideOffset: { type: Number, default: 8 },
    side: { type: String, default: 'bottom' },
    isOpen: { type: Boolean, default: true },
})

const emit = defineEmits(['update:isOpen'])

</script>

<style lang="scss" scoped>
.tooltip-content {
    background: white;
    color: black;
    padding: 0px;
    border-radius: 8px;
    font-size: 13px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.16);
    user-select: none;
    pointer-events: auto;
    max-width: 500px;
    z-index: 999;
}
</style>