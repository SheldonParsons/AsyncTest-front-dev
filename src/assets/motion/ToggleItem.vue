<template>
  <Toolbar.ToggleItem :value="value" asChild>
    <motion.button
      class="toggle-item"
      :initial="{ scale: 1, backgroundColor: '#2b323d00' }"
      :animate="(selected && isMultiple) ? { backgroundColor: '#2b323dff' } : {}"
      :while-press="{ scale: 0.9 }"
      :while-focus="{ boxShadow: '0 0 0 2px #ff0088' }"
      :aria-label="ariaLabel"
    >
      <span>
        跟随默认
      </span>
      <AnimatePresence :initial="false">
        <motion.div
          v-if="selected && !isMultiple"
          class="selected-indicator"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :exit="{ opacity: 0 }"
          layout-id="selected-indicator-toggle"
        />
      </AnimatePresence>
    </motion.button>
  </Toolbar.ToggleItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
// @ts-ignore
import { Toolbar } from 'reka-ui/namespaced'
import { motion, AnimatePresence } from 'motion-v'

const props = defineProps<{
  value: string
  modelValue: string | string[]
  icon: string
  ariaLabel?: string
  withFocus?: boolean
}>()

const isMultiple = computed(() => Array.isArray(props.modelValue))
const selected = computed(() =>
  isMultiple.value
    ? (props.modelValue as string[]).includes(props.value)
    : props.modelValue === props.value
)
</script>
