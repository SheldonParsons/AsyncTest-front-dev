<script setup lang="ts">
import { Ticker } from 'motion-plus-vue'
import {
    defineProps,
    ref,
    onMounted,
    onUnmounted,
    watch,
    nextTick,
} from 'vue'

// 1. 定义组件接收的 props
const props = defineProps<{
    text: string
}>()

// 2. 创建 DOM 引用
const wrapperRef = ref<HTMLElement | null>(null) // 容器的引用
const contentRef = ref<HTMLElement | null>(null) // 隐藏的测量内容的引用
const shouldScroll = ref(false) // 决定是否滚动的状态

const checkScrollState = async () => {
    await nextTick()
    if (!wrapperRef.value || !contentRef.value) {
        return
    }
    const wrapperWidth = wrapperRef.value.offsetWidth
    const contentWidth = contentRef.value.offsetWidth
    shouldScroll.value = contentWidth > wrapperWidth
}

// 5. 在组件挂载、文本变化、窗口大小变化时重新检查
onMounted(() => {
    checkScrollState()
    window.addEventListener('resize', checkScrollState)
})

onUnmounted(() => {
    window.removeEventListener('resize', checkScrollState)
})

watch(() => props.text, checkScrollState)
</script>

<template>
    <div class="ticker-wrapper" ref="wrapperRef" :class="{ 'is-static': !shouldScroll }">
        <Ticker v-if="shouldScroll" class="ticker">
            <div class="item">{{ props.text }}</div>
        </Ticker>

        <div v-else class="item">
            {{ props.text }}
        </div>

        <div class="item measure" ref="contentRef">
            {{ props.text }}
        </div>
    </div>
</template>

<style scoped>
.ticker-wrapper {
    width: 100%;
    overflow: hidden;
}

.ticker-wrapper.is-static {
    display: flex;
    justify-content: center;
}

.ticker {
    width: 100%;
}

.item {
    font-size: 0.9rem;
    width: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    padding: 0 1em;
}

/* 隐藏的测量元素的样式 */
.item.measure {
    position: absolute;
    visibility: hidden;
    z-index: -1;
    top: -100px;
}
</style>