<script setup lang="ts">
import { ref, onMounted } from 'vue'
// @ts-ignore
import { Switch, Tooltip } from 'reka-ui/namespaced';
import { AnimatePresence, motion } from "motion-v"

const open = ref(false)

const emit = defineEmits(['action'])

const spring: any = {
    visualDuration: 0.3,
    type: "spring",
    bounce: 0.6,
}

const checked: any = ref(false)
const props = defineProps({
    data: {
        type: Boolean,
        default: false
    }
})

const toggleChecked = () => {
    emit('action', checked.value)
}

onMounted(() => {
    checked.value = props.data
})
</script>

<template>
    <div class="hover-container">
        <Tooltip.Provider>
            <Tooltip.Root v-model:open="open">
                <Tooltip.Trigger class="tooltip-trigger-switch" @mouseenter="open = true" @mouseleave="open = false">
                    <div class="switch-container">
                        
                        <Switch.Root v-model="checked" :class="{ checked_animation: checked }" @click="toggleChecked">
                            <motion.button class="switch" :initial="false" :animate="{
                                backgroundColor: checked ? 'black' : 'var(--hue-6-transparent)'
                            }" :style="{
                                justifyContent: checked ? 'flex-end' : 'flex-start'
                            }" :while-focus="{
                                boxShadow: '0 0 0 5px #0f1115, 0 0 0 10px var(--hue-6-transparent)',
                                transition: { duration: 0.2 }
                            }">
                                <Switch.Thumb as-child>
                                    <motion.div class="thumb-inner" :data-checked="checked" :layout="true" :transition="{
                                        type: 'spring',
                                        stiffness: 500,
                                        damping: 30
                                    }" />
                                </Switch.Thumb>
                            </motion.button>
                        </Switch.Root>
                    </div>
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
                                    <motion.div>启用：{{checked ? '固定值' : '动态值'}}</motion.div>
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

<style lang="scss" scope>
.tooltip-trigger-switch {
    border: none;
    background-color: white;
    padding: 0px;
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
    max-width: 200px;
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

.switch-container {
    --hue-6-transparent: #9a9a9a44;
    display: flex;
    align-items: center;
    background-color: white;

    button {
        border: none;
        background-color: white;
        outline: none;
        padding: 0px;
    }

    .switch {
        width: 50px;
        padding: 5px;
        background-color: var(--hue-6-transparent);
        border-radius: 9999px;
        position: relative;
        outline: none;
        cursor: pointer;
        display: flex;
        border: none;
        outline: none;
    }

    // .switch:focus {
    //     box-shadow: 0 0 0 5px #0f1115, 0 0 0 10px var(--hue-6-transparent);
    //     transition: box-shadow 0.2s;
    // }

    .thumb {
        display: flex;
        width: 100%;
    }

    .thumb-inner {
        display: block;
        width: 15px;
        height: 15px;
        background-color: white;
        border-radius: 50%;
    }

    .label {
        color: #f5f5f5;
        font-size: 15px;
        line-height: 1;
        padding-left: 15px;
    }
}
</style>
