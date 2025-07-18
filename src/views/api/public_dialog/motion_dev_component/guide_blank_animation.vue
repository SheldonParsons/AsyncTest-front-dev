<template>
    <motion.li class="guide-item" :style="{ justifyContent: isHovered ? 'flex-end' : 'flex-start' }"
        :whileHover="{ scale: 1.05 }" @hoverStart="onHoverStart" @hoverEnd="isHovered = false">
        <motion.span layout class="text">
            <span class="number-label">#{{ item.number }}</span>
            {{ item.label }}
        </motion.span>
        <motion.span layout class="text" aria-hidden>
            <span class="number-label">#{{ item.number }}</span>
            {{ item.label }}
        </motion.span>


        <Cursor :show="isHovered" follow :offset="{ x: 30, y: 30 }" :variants="{
            default: {
                clipPath: 'inset(0% 0% 0% 0%)',
                transition: enterTransition,
            },
            exit: {
                clipPath: 'inset(50% 50% 50% 50%)',
                transition: exitTransition,
            },
        }" :style="{ skewX, skewY, originX: 0, originY: 0 }">
            <motion.div class="image-container" :variants="{
                default: { scale: 1, transition: enterTransition },
                exit: { scale: 1.5, transition: exitTransition },
            }">

                <img style="border-radius: 10px;" :src="item.image" width="345" height="174"
                    :alt="`Photo of ${item.label}`" />
            </motion.div>
        </Cursor>
    </motion.li>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { motion } from "motion-v"
import { Cursor } from "motion-plus-vue"

defineProps<{
    item: { label: string; number: number; image: string }
    index: number,
    skewX: any,
    skewY: any
}>()

function onHoverStart() {
    isHovered.value = true
    console.log("hover start")
}

const isHovered = ref(false)

const enterTransition: any = {
    duration: 0.5,
    ease: [0, 0.54, 0.37, 0.97],
}

const exitTransition: any = {
    duration: 0.2,
    ease: "easeIn",
}

const skewX = defineModel<any>("skewX") // 可用 defineModel 或 props 传入
const skewY = defineModel<any>("skewY")
</script>


<style lang="scss" scoped>
.guide-item {
    position: relative;
    cursor: pointer;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    height: 48px;
}

.text {
    color: black;
    font-size: 48px;
    font-weight: bold;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 10px;
    line-height: 48px;
}

.number-label {
    font-size: 48px;
    font-weight: bold;
    text-transform: uppercase;
    opacity: 0.5;
    font-variant-numeric: tabular-nums;
}

.image-container {
    width: 345px;
    height: 174px;
    border-radius: 10px;
}
</style>
