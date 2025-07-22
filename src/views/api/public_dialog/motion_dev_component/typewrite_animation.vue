<template>
    <div class="type-write-title">
        <motion.span class="type-write-monospace">
            <RowValue :value="children" />
        </motion.span>
        <motion.div class="type-write-cursor" :animate="{
            opacity: [1, 1, 0, 0],
            transition: {
                duration: 1,
                repeat: Infinity,
                times: [0, 0.5, 0.5, 1]
            }
        }" />
    </div>
</template>
<script setup lang="ts">
import { animate, motion, useMotionValue, RowValue } from 'motion-v'
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
    text: {
        type: String,
        default: 'Hello world!'
    }
})

const children = useMotionValue('')
let animation: any = null

const startAnimation = () => {
    animation = animate(0, props.text.length, {
        duration: 1.5,
        ease: 'linear',
        onUpdate: (latest) => {
            children.set(props.text.slice(0, Math.ceil(latest)))
        }
    })
}

onMounted(() => {
    startAnimation()
})

onUnmounted(() => {
    if (animation) animation.stop()
})

watch(() => props.text, () => {
    if (animation) animation.stop()
    startAnimation()
})
</script>



<style>
.type-write-title {
    position: relative;
    margin: 0px;
    display: flex;
}

.type-write-monospace {
    font-family: "Azeret Mono", monospace;
    overflow: hidden;
    max-width: 95%;
}

.type-write-cursor {
    /* position: absolute; */
    background: #ff0088;
    width: 2px;
    opacity: 0;
    margin-right: 2px;
}
</style>
