<template>
    <div class="radio-container">
        <RadioGroup.Root v-model="model" class="root">
            <div v-for="item in items" :key="item.key" class="item-wrapper">
                <RadioGroup.Item :value="item.key" :id="item.key" as-child>
                    <motion.button class="radio-item" :style="{ scale, willChange: 'transform' }">
                        <div
                            style="position: absolute;border: 2px solid black;border-radius: 50%;box-sizing: border-box;background: white;width: 100%;height: 100%;top: 0;">
                        </div>
                        <AnimatePresence>
                            <RadioGroup.Indicator as-child>
                                <motion.div initial="hidden" animate="visible" exit="hidden" class="indicator">
                                    <motion.div class="border" :style="{ borderWidth }" :variants="{
                                        visible: {
                                            borderColor: '#ffff',
                                            scale: 1
                                        },
                                        hidden: {
                                            borderColor: '#fff0',
                                            scale: 0.95
                                        }
                                    }" :transition="{
                                        duration: 0.2,
                                        ease: 'easeOut'
                                    }" />
                                    <motion.div class="dot" :variants="{
                                        visible: {
                                            scale: 1,
                                            opacity: 1
                                        },
                                        hidden: {
                                            scale: 0,
                                            opacity: 0
                                        }
                                    }" :transition="{
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 25
                                    }" />
                                </motion.div>
                            </RadioGroup.Indicator>
                        </AnimatePresence>
                    </motion.button>
                </RadioGroup.Item>
                <label class="label" :for="item.key">
                    {{ item.value }}
                </label>
            </div>
        </RadioGroup.Root>
    </div>
</template>

<script setup lang="ts">
// @ts-ignore
import { RadioGroup } from 'reka-ui/namespaced'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion-v'

// 使用 defineModel 来支持 v-model
const model = defineModel<string>()

// 定义 props
defineProps<{
    items: { key: string; value: string }[]
}>()

const scale = useMotionValue(1)
const borderWidth = useTransform(scale, [0.95, 1.05], [3, 1.5])
</script>

<style lang="scss" scoped>
.radio-container {
    display: flex;
    align-items: center;
    justify-content: start;
    width: 100%;

    .root {
        display: flex;
        gap: 25px; // 调整项目间距
        width: 100%;
        justify-content: start;
    }

    .item-wrapper {
        display: flex;
        align-items: center;
    }

    .radio-item {
        background-color: #0b1011;
        border: 1px solid #1d2628;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        outline: none;
        cursor: pointer;
        padding: 0; // 移除默认内边距
    }

    .indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        position: relative;
    }

    .border {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border-style: solid;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #ff2a00;
    }

    .label {
        display: inline-block;
        white-space: nowrap;
        color: black;
        padding-left: 10px; // 调整标签间距
        font-size: 16px; // 调整字体大小
        line-height: 1;
        cursor: pointer;
        font-size: 0.9rem;
    }
}
</style>
