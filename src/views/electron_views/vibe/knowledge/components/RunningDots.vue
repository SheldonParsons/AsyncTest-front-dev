<template>
  <svg
    class="running-three-dots"
    width="16"
    height="16"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="等待回复中"
  >
    <circle class="bounce-dot dot-1" cx="13" cy="20" r="2.7" fill="currentColor" />
    <circle class="bounce-dot dot-2" cx="20" cy="20" r="2.7" fill="currentColor" />
    <circle class="bounce-dot dot-3" cx="27" cy="20" r="2.7" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
// 源自 Sheldon-motion 的 running-three-dots：原版只在 hover 触发，这里改成等待回复时持续播放。
</script>

<style scoped>
.running-three-dots { overflow: visible; }
.bounce-dot {
  transform-origin: center;
  opacity: 0.58;
  animation: three-dot-bounce 900ms cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
}
.dot-2 { animation-delay: 120ms; }
.dot-3 { animation-delay: 240ms; }

@keyframes three-dot-bounce {
  0%, 100% { opacity: 0.58; transform: translateY(0) scale(0.92); }
  38% { opacity: 1; transform: translateY(-4px) scale(1.05); }
  62% { opacity: 0.78; transform: translateY(1px) scale(0.96); }
}

@media (prefers-reduced-motion: reduce) {
  .bounce-dot { animation: none; }
}
</style>
