<!-- 滚动到底部：向下箭头，常驻循环轻微下坠动画。 -->
<template>
  <svg class="scroll-down" viewBox="8 8 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g class="sd-arrow">
      <path d="M20 11V27" stroke="currentColor" stroke-width="2.45" stroke-linecap="round" />
      <path d="M12.9 19.9L20 27L27.1 19.9" stroke="currentColor" stroke-width="2.45" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <path class="sd-line" d="M13.5 31.2H26.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" />
  </svg>
</template>

<style scoped>
.scroll-down {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.sd-arrow {
  transform-origin: 20px 20px;
  animation: sd-drop 1500ms ease-in-out infinite;
}
.sd-line {
  opacity: 0;
  animation: sd-line 1500ms ease-in-out infinite;
}

@keyframes sd-drop {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(1.6px); }
}

/* 箭头下坠到底时，落地横线短暂闪现 */
@keyframes sd-line {
  0%, 36% { opacity: 0; }
  50% { opacity: 0.8; }
  64%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .sd-arrow,
  .sd-line { animation: none; }
}
</style>
