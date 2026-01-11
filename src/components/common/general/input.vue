<template>
  <div 
    class="input-container" 
    :class="{ 'is-disabled': disabled }"
    :style="{ maxWidth: maxWidthContainer === -1 ? '' : maxWidthContainer + 'px' }"
  >
    <input 
      class="normal-input" 
      v-model="modelValue" 
      :placeholder="placeholder" 
      :disabled="disabled"
    />
    
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
const modelValue = defineModel<string>({ default: '' })

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
  },
  maxWidthContainer: {
    type: Number,
    default: -1
  },
  // 1. 新增 disabled 属性
  disabled: {
    type: Boolean,
    default: false
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
  box-sizing: border-box;
  width: 100%;
}

.normal-input {
  background-color: white;
  color: black;
  border: 2px solid #1d2628;
  border-radius: 10px;
  padding: 10px;
  padding-right: 40px;
  width: 100%;
  transition: border-color 0.2s, background-color 0.2s; /* 添加过渡让状态切换更丝滑 */
}

.normal-input:focus {
  border-color: var(--hue-blue);
}

.input-container div {
  color: #ccc;
  /* 默认情况下的白色渐变 */
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
  pointer-events: none; /* 确保计数器不会遮挡点击 */
}

.input-container div span {
  display: block;
}

/* --- 2. Disabled 状态样式 --- */

/* 容器处于禁用状态时，输入框的样式 */
.input-container.is-disabled .normal-input {
  background-color: #f5f7fa; /* 常见的浅灰色禁用背景 */
  color: #a8abb2;            /* 文字变淡 */
  border-color: #e4e7ed;     /* 边框变淡 */
  cursor: not-allowed;       /* 鼠标变为禁止图标 */
}

/* 禁用状态下，覆盖原本的 focus 样式，防止边框变蓝 */
.input-container.is-disabled .normal-input:focus {
  border-color: #e4e7ed;
}

/* 容器处于禁用状态时，调整右侧计数器的渐变背景 */
/* 必须把原本的纯白渐变改成对应背景灰色的渐变，否则会有一块突兀的白色 */
.input-container.is-disabled div {
  background: linear-gradient(to right,
      rgba(245, 247, 250, 0) 0%,
      #f5f7fa 20%);
}
</style>