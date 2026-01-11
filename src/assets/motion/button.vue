<template>
    <motion.button 
        @click="emit('click')" 
        ref="buttonRef" 
        class="motion-md-button" 
        :class="{ 'is-danger': danger }"
        @pointerdown="onPointerDown"
        @pointerup="removeLastRipple" 
        @pointercancel="removeLastRipple" 
        @pointerleave="removeLastRipple"
        @blur="removeLastRipple" 
        @keydown="onKeyDown" 
        @keyup="onKeyUp"
        
        :initial="false" 
        :animate="currentVariant" 
        :while-hover="hoverVariant"
        :while-tap="tapVariant"
        :transition="{
            duration: 0.2,
            ease: 'easeInOut'
        }"
    >
        <span class="button-content">
            <slot></slot>
        </span>

        <span class="motion-ripple-container" aria-hidden>
            <AnimatePresence>
                <motion.span 
                    v-for="ripple in ripples" 
                    :key="ripple.id" 
                    class="motion-ripple" 
                    :style="{
                        width: ripple.size + 'px',
                        height: ripple.size + 'px',
                        left: ripple.x - ripple.size / 2 + 'px',
                        top: ripple.y - ripple.size / 2 + 'px'
                    }" 
                    :initial="{ opacity: 0, transform: 'scale(0)' }" 
                    :animate="{
                        opacity: danger ? 0.15 : 0.1, 
                        transform: 'scale(1)',
                        transition: { duration: 0.4 }
                    }" 
                    :exit="{ opacity: 0 }" 
                    :transition="{
                        duration: 0.5,
                        ease: 'easeOut'
                    }" 
                />
            </AnimatePresence>
        </span>
    </motion.button>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { motion, AnimatePresence, useDomRef, scale } from "motion-v"

const props = defineProps({
    danger: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['click'])

// --- 1. 配色方案 (Premium Dark & Deep Red) ---

// 黑色常态 (Default)
const blackTheme = {
    animate: {
        backgroundColor: '#09090b', // 极深灰 (接近黑)
        borderColor: '#27272a',     
        color: '#a1a1aa',
    },
    hover: {
        backgroundColor: '#27272a', // 提亮
        borderColor: '#52525b',     
        color: '#ffffff',           
        cursor: 'pointer',
        scale: 1.02
    }
}

// 红色危险 (Danger) - 调整了色号，确保能看出是红色
const redTheme = {
    animate: {
        // 常态：鲜明的正红色 (Tailwind red-600)
        backgroundColor: '#dc2626', 
        // 边框同色，融为一体
        borderColor: '#dc2626',     
        // 文字纯白，对比度拉满
        color: '#ffffff',           
    },
    hover: {
        // Hover：提亮，变得更鲜艳 (Tailwind red-500)
        backgroundColor: '#ef4444', 
        borderColor: '#ef4444',
        color: '#ffffff',
        cursor: 'pointer',
    }
}

// --- 2. 动态计算 Motion ---

// 关键修复：使用 animate 来控制常态，确保响应式生效
const currentVariant = computed(() => props.danger ? redTheme.animate : blackTheme.animate)
const hoverVariant = computed(() => props.danger ? redTheme.hover : blackTheme.hover)

const tapVariant = computed(() => ({
    scale: 0.98,
    // 点击时：黑色版变纯黑，红色版变深血红
    backgroundColor: props.danger ? '#1a0404' : '#000000'
}))

// --- 3. Ripple 逻辑 (不变) ---
type Ripple = { id: number; x: number; y: number; size: number }
const ripples = ref<Ripple[]>([])
let idv = 0
const buttonRef = useDomRef()

function createRipple(originX: number, originY: number) {
    const button = buttonRef.value
    if (!button) return
    const rect = button.getBoundingClientRect()
    const localX = originX - rect.left
    const localY = originY - rect.top
    const dx = Math.max(localX, rect.width - localX)
    const dy = Math.max(localY, rect.height - localY)
    const radius = Math.sqrt(dx * dx + dy * dy)
    const size = radius * 2
    const id = ++idv
    ripples.value.push({ id, x: localX, y: localY, size })
    return id
}

function removeLastRipple() { if (ripples.value.length) ripples.value.pop() }
function onPointerDown(event: PointerEvent) { if (event.isPrimary !== false) createRipple(event.clientX, event.clientY) }
function onKeyDown(event: KeyboardEvent) {
    if (event.repeat) return
    if (event.key === " " || event.key === "Enter") {
        const button = buttonRef.value; if (!button) return
        const rect = button.getBoundingClientRect()
        createRipple(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }
}
function onKeyUp(event: KeyboardEvent) { if (event.key === " " || event.key === "Enter") removeLastRipple() }
</script>

<style scoped>
.motion-md-button {
    box-sizing: border-box;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    
    padding: 0 16px;
    height: 40px; 
    
    white-space: nowrap;
    min-width: max-content;

    border: 1px solid transparent; 
    border-radius: 6px;
    
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1;
    
    user-select: none;
    cursor: pointer;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
    outline: none;

    /* 必须保留 CSS 过渡，防止 focus 样式突变 */
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.button-content {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

/* 黑色版 Focus */
.motion-md-button:focus-visible {
    border-color: #52525b !important; 
}

/* 红色版 Focus */
.motion-md-button.is-danger:focus-visible {
    border-color: #ef4444 !important; 
    box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.2); /* 红色版可以稍微带一点点光晕，警示感更强 */
}

.motion-ripple-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
    z-index: 1;
}

.motion-ripple {
    position: absolute;
    border-radius: 50%;
    background-color: #ffffff;
    will-change: opacity, transform;
}
</style>