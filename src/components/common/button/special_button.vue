<template>
  <motion.button ref="buttonRef" class="md-button" @pointerdown="onPointerDown" @pointerup="removeLastRipple"
    @pointercancel="removeLastRipple" @pointerleave="removeLastRipple" @blur="removeLastRipple" @keydown="onKeyDown"
    @keyup="onKeyUp" :while-hover="{
      borderColor: '#8df0cc',
      backgroundColor: 'rgb(48, 48, 48)'
    }" :initial="{
      borderColor: '#8df0ccaa',
      backgroundColor: 'black'
    }" :transition="{
      duration: 0.2,
      ease: 'linear'
    }">
    <div style="display: flex;align-items: center;justify-content: center;gap: 5px;">
      <BtnLight style="height: 1rem;"></BtnLight>
      <slot class="c-icon"></slot>
    </div>
    <span class="ripple-container" aria-hidden>
      <AnimatePresence>
        <motion.span v-for="ripple in ripples" :key="ripple.id" class="ripple" :style="{
          width: ripple.size + 'px',
          height: ripple.size + 'px',
          left: ripple.x - ripple.size / 2 + 'px',
          top: ripple.y - ripple.size / 2 + 'px'
        }" :initial="{ opacity: 0, transform: 'scale(0)' }" :animate="{
          opacity: 0.4,
          transform: 'scale(1)',
          transition: { duration: 0.3 }
        }" :exit="{ opacity: 0 }" :transition="{
              duration: 0.55,
              ease: 'easeOut'
            }" />
      </AnimatePresence>
    </span>
  </motion.button>
</template>
<script setup lang="ts">
import { ref } from "vue"
import { motion, AnimatePresence, useDomRef } from "motion-v"
import BtnLight from "@/assets/svg/tree/btn_light.vue";

/**
 * Ripple type definition
 */
type Ripple = {
  id: number
  x: number
  y: number
  size: number
}

const ripples = ref<Ripple[]>([])
let idv = 0
const buttonRef = useDomRef()

/**
 * Create a new ripple at the given origin
 */
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

/**
 * Remove the last ripple
 */
function removeLastRipple() {
  if (ripples.value.length) ripples.value.pop()
}

/**
 * Handle pointer down event
 */
function onPointerDown(event: PointerEvent) {
  if (event.isPrimary !== false) {
    createRipple(event.clientX, event.clientY)
  }
}

/**
 * Handle keydown event for keyboard-triggered ripples
 */
function onKeyDown(event: KeyboardEvent) {
  if (event.repeat) return
  if (event.key === " " || event.key === "Enter") {
    const button = buttonRef.value
    if (!button) return
    const rect = button.getBoundingClientRect()
    createRipple(rect.left + rect.width / 2, rect.top + rect.height / 2)
  }
}

/**
 * Remove ripple on keyup
 */
function onKeyUp(event: KeyboardEvent) {
  if (event.key === " " || event.key === "Enter") {
    removeLastRipple()
  }
}
</script>



<style scoped>
.md-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 15px;
  border-radius: 4px;
  text-transform: uppercase;
  background-color: black;
  color: white;
  border: 1px solid var(--accent);
  user-select: none;
  cursor: pointer;
  overflow: hidden;
  letter-spacing: 0.2px;
  -webkit-tap-highlight-color: transparent;
}

.ripple-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background-color: currentColor;
  will-change: opacity, transform;
}
</style>
