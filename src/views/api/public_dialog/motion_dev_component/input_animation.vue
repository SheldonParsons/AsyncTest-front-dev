<template>
  <div class="input-container">
    <input v-model="modelValue" :placeholder="placeholder" />
    <div>
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

const emit = defineEmits<{
  (e: 'change', value: string): void
}>()

watch(modelValue, (newVal: any) => {
  emit('change', newVal)
})

const props = defineProps({
  placeholder: {
    type: String,
    default: '#000000',
  },
  maxLength: {
    type: Number,
    default: 50,
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
.input-container,
input {
  position: relative;
  font-size: 14px;
  line-height: 1;
  outline: none;
}

input {
  background-color: white;
  color: black;
  border: 2px solid #1d2628;
  border-radius: 10px;
  padding: 10px;
  padding-right: 40px;
  width: 200px;
}

input:focus {
  border-color: var(--hue-blue);
}

.input-container div {
  color: #ccc;
  background: linear-gradient(to right,
      rgba(255, 255, 255, 0) 0%,
      #ffffff 20%);
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  padding: 10px;
  padding-right: 0px;
  padding-left: 30px;
}

.input-container div span {
  display: block;
}
</style>
