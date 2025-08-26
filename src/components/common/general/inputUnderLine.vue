<template>
  <div class="input-line-container" :style="{ maxWidth: maxWidthContainer === -1 ? '' : maxWidthContainer + 'px' }">
    <input class="line-input" :style="{ background: 'transparent' }" v-model="modelValue" :placeholder="placeholder"
      @keyup.enter="enter" />
    <div :style="{ background: `linear-gradient(to right,rgba(255, 255, 255, 0) 0%,${bgcolor} 20%)` }">
      <motion.span ref="counterRef" :style="{
        color: mapRemainingToColor(charactersRemaining),
        willChange: 'transform',
      }">
        {{ charactersRemaining }}
      </motion.span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { motion, transform, useAnimate } from 'motion-v'

// 定义 v-model 支持
const modelValue = defineModel<string>()

const emit = defineEmits(['change', 'enter'])

watch(modelValue, (newVal: any) => {
  emit('change', newVal)
})

function enter() {
  emit("enter", modelValue.value)
}

const props = defineProps({
  placeholder: {
    type: String,
    default: '#000000',
  },
  maxLength: {
    type: Number,
    default: 50,
  },
  maxWidthContainer: {
    type: Number,
    default: -1
  },
  bgcolor: {
    type: String,
    default: 'white'
  }
})

const charactersRemaining = computed(() => props.maxLength - (modelValue.value?.length || 0))
const [counterRef, animate]: any = useAnimate()
const mapRemainingToColor = transform([2, 6], ['#ff008c', '#ccc'])

watch(charactersRemaining, (newVal) => {
  if (newVal > 6) return

  const mapRemainingToSpringVelocity = transform([0, 5], [50, 0])

  animate(
    counterRef.value,
    { scale: 1 },
    {
      type: 'spring',
      velocity: mapRemainingToSpringVelocity(newVal),
      stiffness: 700,
      damping: 80,
    }
  )
})
</script>
<style>
.input-line-container {
  position: relative;
  font-size: 14px;
  line-height: 1;
  outline: none;
  box-sizing: border-box;
  width: 100%;
}

.line-input {
  color: black;
  border-bottom: 2px solid #1d2628;
  border-top: 0px;
  border-left: 0px;
  border-right: 0px;
  padding: 10px;
  padding-right: 40px;
  border-radius: 0px !important;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  font-weight: 500;
}

/* .line-input:focus {
  border-color: var(--hue-blue);
} */

.input-line-container div {
  color: #ccc;
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  padding: 10px;
  padding-right: 0px;
  padding-left: 30px;
}

.input-line-container div span {
  display: block;
}
</style>
