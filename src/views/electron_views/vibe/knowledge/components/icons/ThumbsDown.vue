<!-- 点踩：hover 时弹一下 + 火花，播放一次。 -->
<template>
  <svg class="thumbs-down" viewBox="6 6 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      class="td-shape"
      d="M13.2 21.6H9.8C8.7 21.6 7.9 20.8 7.9 19.7V12.9C7.9 11.8 8.7 11 9.8 11H13.2M13.2 21.6V11M13.2 21.6L17.5 29.2C18.1 30.2 19.6 29.8 19.6 28.6V23.8H25.6C27.2 23.8 28.4 22.3 28 20.7L26.4 13.8C26.1 12.4 24.8 11 23.3 11H13.2"
      stroke="currentColor"
      stroke-width="2.25"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path class="td-burst" d="M25.6 30.4L27.7 32.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <path class="td-burst" d="M30.2 25H33.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
</template>

<style scoped>
.thumbs-down { display: block; width: 100%; height: 100%; overflow: visible; }
.td-shape { transform-origin: 20px 20px; }
.td-burst { opacity: 0; stroke-dasharray: 8; stroke-dashoffset: 8; }
.thumbs-down:hover .td-shape { animation: td-pop 900ms cubic-bezier(0.25, 0.1, 0.25, 1) both; }
.thumbs-down:hover .td-burst { animation: td-burst 900ms cubic-bezier(0.25, 0.1, 0.25, 1) both; }

@keyframes td-pop {
  0%, 100% { transform: translateY(0) scale(1); }
  34% { transform: translateY(2px) scale(1.08); }
  58% { transform: translateY(0) scale(0.98); }
}
@keyframes td-burst {
  0%, 24% { opacity: 0; stroke-dashoffset: 8; }
  38% { opacity: 0.82; stroke-dashoffset: 0; }
  72%, 100% { opacity: 0; stroke-dashoffset: -8; }
}

@media (prefers-reduced-motion: reduce) {
  .thumbs-down:hover .td-shape,
  .thumbs-down:hover .td-burst { animation: none; }
}
</style>
