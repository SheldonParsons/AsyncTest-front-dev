<!-- 运行中 / 思考中：三点弹跳 + 灰色外框，常驻循环动画。 -->
<template>
  <svg class="running-dots" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle class="rd-ring" cx="20" cy="20" r="13.5" stroke="currentColor" stroke-width="1.6" />
    <circle class="rd-dot rd-dot-1" cx="13" cy="20" r="2.7" fill="currentColor" />
    <circle class="rd-dot rd-dot-2" cx="20" cy="20" r="2.7" fill="currentColor" />
    <circle class="rd-dot rd-dot-3" cx="27" cy="20" r="2.7" fill="currentColor" />
  </svg>
</template>

<style scoped>
.running-dots {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.rd-ring {
  opacity: 0.24;
}
.rd-dot {
  transform-origin: center;
  opacity: 0.72;
  animation: rd-bounce 900ms cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
}
.rd-dot-2 { animation-delay: 120ms; }
.rd-dot-3 { animation-delay: 240ms; }

@keyframes rd-bounce {
  0%, 100% { opacity: 0.5; transform: translateY(0) scale(0.92); }
  38% { opacity: 1; transform: translateY(-4px) scale(1.05); }
  62% { opacity: 0.78; transform: translateY(1px) scale(0.96); }
}

@media (prefers-reduced-motion: reduce) {
  .rd-dot { animation: none; }
}
</style>
