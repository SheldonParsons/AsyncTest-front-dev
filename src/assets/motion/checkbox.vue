<template>
  <div class="checkbox-container">
    <Checkbox.Root class="root" :class="{ checked: isChecked }" as-child>
      <motion.button :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.95 }" @press="toggleChecked"
        data-primary-action>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4">
          <motion.path d="M4 12L10 18L20 6" :animate="{ pathLength: isChecked ? 1 : 0 }" :transition="{
            type: 'spring',
            bounce: 0,
            duration: isChecked ? 0.3 : 0.1,
          }" :stroke-linecap="strokeLinecap" :style="{
            pathLength,
          }" />
        </svg>
      </motion.button>
    </Checkbox.Root>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Checkbox } from 'reka-ui/namespaced'
import { motion, useMotionValue, useTransform } from 'motion-v'

const isChecked = ref(false)
const pathLength = useMotionValue(isChecked.value ? 1 : 0)
const strokeLinecap = useTransform(() =>
  pathLength.get() === 0 ? "none" : "round"
)

const toggleChecked = () => {
  isChecked.value = !isChecked.value
}
const check_type = ref(false)

function changeTypeHandle() {
  check_type.value = !check_type.value
}
</script>
<style>
.checkbox-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.checked {
  background-color: #1d2628!important;
}

.root {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 2px solid #1d2628;
  cursor: pointer;
  padding: 0px;
  background-color: transparent;
}

.root:focus-visible {
  outline: none;
  border-color: #0b1011;
}
</style>
