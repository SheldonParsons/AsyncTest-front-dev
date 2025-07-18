<template>
    <div class="text-container" ref="containerRef">
        <motion.span>{{ text }}</motion.span>
    </div>
</template>
<script setup lang="ts">
import { animate, stagger, motion } from "motion-v"
import { splitText } from "motion-plus"
import { ref, onMounted, watch } from "vue"

const containerRef = ref<HTMLDivElement | null>(null)

const props = defineProps({
    text: {
        default: '',
        type: String,
    },
})

/**
 * 封装动画函数
 */
function runAnimation() {
    if (!containerRef.value) return

    const span = containerRef.value.querySelector("span")
    if (!span) return

    // 先清空旧的动画 span 内容
    span.innerHTML = props.text

    const { words } = splitText(span)

    animate(
        words,
        { opacity: [0, 1], y: [10, 0] },
        {
            type: "spring",
            duration: 2,
            bounce: 0,
            delay: stagger(0.05),
        }
    )
}

onMounted(() => {
    document.fonts.ready.then(() => {
        if (containerRef.value) containerRef.value.style.visibility = "visible"
        runAnimation()
    })
})

// ✅ 监听 text 变化
watch(() => props.text, () => {
    runAnimation()
})
</script>




<style lang="scss" scoped>
.text-container {
    display: flex;
    justify-content: start;
    align-items: center;
    width: 100%;
    text-align: left;
    visibility: hidden;
}

.split-word {
    will-change: transform, opacity;
}
</style>
