<!-- 已完成：对勾（默认静止显示），hover 时重绘一次。 -->
<template>
  <svg class="check-complete" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle class="cc-ring" cx="20" cy="20" r="13.5" fill="currentColor" />
    <path
      class="cc-mark"
      d="M12.8 20.7L17.4 25.2L28.2 14.8"
      stroke="#fff"
      stroke-width="2.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.check-complete {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.cc-ring {
  opacity: 0.9;
  transform-origin: 20px 20px;
}
.cc-mark {
  stroke-dasharray: 24;
  stroke-dashoffset: 0;
  transform-origin: 20px 20px;
}
.check-complete:hover .cc-ring {
  animation: cc-ring 950ms cubic-bezier(0.25, 0.1, 0.25, 1) both;
}
.check-complete:hover .cc-mark {
  animation: cc-mark 950ms cubic-bezier(0.25, 0.1, 0.25, 1) both;
}

@keyframes cc-ring {
  0%, 100% { transform: scale(1); }
  34% { transform: scale(1.1); }
  68% { transform: scale(0.98); }
}
@keyframes cc-mark {
  0% { opacity: 0; stroke-dashoffset: 24; transform: scale(0.96); }
  36% { opacity: 1; stroke-dashoffset: 0; transform: scale(1.02); }
  100% { opacity: 1; stroke-dashoffset: 0; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .check-complete:hover .cc-ring,
  .check-complete:hover .cc-mark { animation: none; }
}
</style>
