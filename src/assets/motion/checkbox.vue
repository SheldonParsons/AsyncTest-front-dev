<template>
  <div class="checkbox-container">
    <Checkbox.Root class="root" v-if="check === 'check' || check === 'none'"
      :class="{ checked: check !== 'none' && read_only === 0, checkedRead: check !== 'none' && read_only > 0 }"
      as-child>
      <motion.button :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.95 }"
        :style="{ cursor: read_only ? 'not-allowed' : 'pointer' }" @click.stop="toggleChecked" data-primary-action>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4">
          <motion.path d="M4 12L10 18L20 6" :animate="{ pathLength: check === 'check' ? 1 : 0 }" :transition="{
            type: 'spring',
            bounce: 0,
            duration: check === 'check' ? 0.3 : 0.1,
          }" :stroke-linecap="strokeLinecap" :style="{
            pathLength,
          }" />
        </svg>
      </motion.button>
    </Checkbox.Root>
    <Checkbox.Root v-if="check === 'part'" class="root"
      :class="{ checked: check !== 'none' && read_only === 0, checkedRead: check !== 'none' && read_only > 0 }"
      as-child>
      <motion.button :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.95 }" @click.stop="toggleChecked"
        data-primary-action>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4">
          <motion.path d="M5 12h14" :animate="{ pathLength: check === 'part' ? 1 : 0 }" :transition="{
            type: 'spring',
            bounce: 0,
            duration: check === 'part' ? 0.3 : 0.1,
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
// @ts-ignore
import { Checkbox } from 'reka-ui/namespaced'
import { motion, useMotionValue, useTransform } from 'motion-v'

const props = defineProps({
  check: {
    type: null
  },
  read_only: {
    default: 0,
    type: Number
  }
})
const emit = defineEmits(['change'])

const isChecked = ref(false)
const pathLength = useMotionValue(isChecked.value ? 1 : 0)
const strokeLinecap = useTransform(() =>
  pathLength.get() === 0 ? "none" : "round"
)

const toggleChecked = () => {
  if (props.read_only) {
    return
  }
  if (props.check === 'none' || props.check === 'part') {
    emit('change', 'check')
  } else if (props.check === 'check') {
    emit('change', 'none')
  }
}
</script>
<style>
.checkbox-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.checked {
  background-color: #1d2628 !important;
  border: 2px solid #1d2628;
}

.checkedRead {
  background-color: #1d26283d !important;
  border: 2px solid #1d26283d;
}

.root {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 5px;

  cursor: pointer;
  padding: 0px;
  background-color: transparent;
}

/* .root:focus-visible {
  outline: none;
  border-color: #0b1011;
} */
</style>
