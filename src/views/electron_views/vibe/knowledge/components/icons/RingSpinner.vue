<!-- motion:ring-spinner · /Users/sheldon/Documents/GithubProject/Sheldon-motion/outputs/ring-spinner.svg -->
<template>
  <svg class="ring-spinner" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="20" cy="20" r="9" stroke="#D8DBD9" stroke-width="3" />
    <circle
      class="spinner-arc"
      cx="20"
      cy="20"
      r="9"
      stroke="#6B706E"
      stroke-width="3"
      stroke-linecap="round"
      pathLength="100"
      stroke-dasharray="70 30"
    />
  </svg>
</template>

<style scoped>
.ring-spinner {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.spinner-arc {
  transform-origin: 20px 20px;
  animation: ring-spinner-turn 3s linear infinite;
}

@keyframes ring-spinner-turn {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spinner-arc { animation-duration: 2.4s; }
}
</style>
