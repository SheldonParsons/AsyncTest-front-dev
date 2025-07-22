<script setup lang="ts">
import { motion } from 'motion-v'
// 从 motion-v 导入 Variants 类型
import type { Variants } from 'motion-v'

const draw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (custom) => {
    const i = typeof custom === 'number' ? custom : Number(custom) || 0
    const delay = i * 0.1
    return {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay, type: 'spring', duration: 0.2, bounce: 0 },
        opacity: { delay, duration: 0.01 },
      },
    }
  },
}

const shape = {
  strokeWidth: 2,
  strokeLinecap: 'round',
  fill: 'transparent',
}
</script>

<template>
  <motion.svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" :variants="draw"
    initial="hidden" animate="visible" class="case-drag-handle">
    <motion.path :variants="draw" :custom="0" :style="shape" d="M5 6h15" />
    <motion.path :variants="draw" :custom="1" :style="shape" d="M5 12h15" />
    <motion.path :variants="draw" :custom="2" :style="shape" d="M5 18h15" />
  </motion.svg>
</template>

<style lang="scss" scoped>
.case-drag-handle {
  /* 把 currentColor 从纯黑改成比如深灰 */
  color: #999;
  /* 或者 #666、#777，看你要多淡 */

  /* 如果你想更轻盈，可以再降低 stroke 的透明度 */
  stroke-opacity: 0.6;
  /* 0.0 ～ 1.0 之间，数值越小越淡 */

  cursor: grab;
  outline: none;

  path {
    outline: none;
  }
}
</style>
