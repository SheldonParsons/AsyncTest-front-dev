<!-- motion:down-arrow-settle · /Users/sheldon/Documents/GithubProject/Sheldon-motion/outputs/down-arrow-settle.svg -->
<template>
  <svg class="down-arrow-settle" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g class="down-arrow">
      <path d="M20 11V27" stroke="currentColor" stroke-width="2.45" stroke-linecap="round" />
      <path d="M12.9 19.9L20 27L27.1 19.9" stroke="currentColor" stroke-width="2.45" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </svg>
</template>

<style scoped>
.down-arrow-settle {
  display: block;
  width: 100%;
  height: 100%;
  color: #111827;
  overflow: visible;
}

.down-arrow {
  transform-origin: 20px 20px;
  animation: down-arrow-drop 1100ms cubic-bezier(.45, 0, .55, 1) infinite;
}

@keyframes down-arrow-drop {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(4px); }
}

@media (prefers-reduced-motion: reduce) {
  .down-arrow { animation: none; }
}
</style>
