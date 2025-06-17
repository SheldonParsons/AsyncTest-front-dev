<template>
    <input
      ref="inputRef"
      :value="modelValue"
      class="auto-resize-input"
      :style="{ width: inputWidth + 'px', color: textColor }"
      :maxlength="maxLength"
      @input="handleInput"
      @mouseover="isHovering = true"
      @mouseleave="isHovering = false"
    >
  </template>
  
  <script setup>
import { ref, computed, onMounted, onUnmounted, nextTick,watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: null,
    default: ''
  },
  maxLength: {
    type: null,
    default: 50
  },
  inputWidth: {
    type: Number,
    default: 30
  }
})

watch(() => props.modelValue, () => {
  calculateWidth()
})

const emit = defineEmits(['update:modelValue'])

// 响应式状态
const inputRef = ref(null)
const measureSpan = ref(null)
const isHovering = ref(false)

// 计算文本颜色
const textColor = computed(() => {
  return isHovering.value ? '#000' : '#929292'
})

// 初始化测量元素
onMounted(async () => {
  // measureSpan.value = document.createElement('span')
  // measureSpan.value.style.cssText = `
  //   position: absolute;
  //   visibility: hidden;
  //   white-space: pre;
  //   font-family: inherit;
  //   font-size: inherit;
  //   font-weight: inherit;
  //   letter-spacing: inherit;
  // `
  // document.body.appendChild(measureSpan.value)
  
  // // 等待两个tick确保样式同步
  // await nextTick()
  // await nextTick()
  
  // syncFontStyle()
  // calculateInitialWidth()
})

// 清理测量元素
onUnmounted(() => {
  if (measureSpan.value) {
    document.body.removeChild(measureSpan.value)
  }
})

// 同步字体样式
const syncFontStyle = () => {
  if (inputRef.value) {
    const style = window.getComputedStyle(inputRef.value)
    measureSpan.value.style.font = style.font
    // 同步更多可能影响宽度的样式
    measureSpan.value.style.letterSpacing = style.letterSpacing
    measureSpan.value.style.textTransform = style.textTransform
  }
}

// 处理输入事件
const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
  // calculateWidth()
}

// 初始宽度计算
const calculateInitialWidth = () => {
  if (!measureSpan.value || !inputRef.value) return
  
  // 确保内容同步
  measureSpan.value.textContent = props.modelValue || ''
  
  // 强制重绘
  void measureSpan.value.offsetWidth
  
  calculateWidth()
}

// 通用宽度计算
const calculateWidth = () => {
  nextTick(() => {
    if (!measureSpan.value || !inputRef.value) return
    
    // 获取完整样式
    const style = window.getComputedStyle(inputRef.value)
    
    // 计算字符宽度
    measureSpan.value.textContent = props.modelValue || ''
    const contentWidth = measureSpan.value.offsetWidth
    
    // 计算边框宽度（更精确的方式）
    const leftBorder = parseInt(style.borderLeftWidth) || 0
    const rightBorder = parseInt(style.borderRightWidth) || 0
    const borderWidth = leftBorder + rightBorder
    
    // 应用限制规则
    const minWidth = 20
    const maxWidth = 200
    const calculatedWidth = contentWidth + borderWidth
    
    inputWidth.value = Math.min(maxWidth, Math.max(calculatedWidth, minWidth))
  })
}
  </script>
  
  <style scoped>
  .auto-resize-input {
    min-width: 30px;
    max-width: 200px;
    padding: 0px 4px;
    border-radius: 4px;
    border: 0 !important;
    outline: none !important;
    box-shadow: none !important;
    background-color: transparent;
    transition: all 0.2s ease;
    color: #929292;
  }
  
  .auto-resize-input:hover {
    background-color: #b3b3b3;
    color: #000;
    cursor: text;
  }
  
  .auto-resize-input:focus,
  .auto-resize-input:active,
  .auto-resize-input:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
  </style>