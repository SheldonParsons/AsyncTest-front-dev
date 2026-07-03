<!-- 点赞：hover 时弹一下 + 火花，播放一次。 -->
<template>
  <svg class="thumbs-up" viewBox="6 6 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      class="tu-shape"
      d="M13.2 18.4H9.8C8.7 18.4 7.9 19.2 7.9 20.3V27.1C7.9 28.2 8.7 29 9.8 29H13.2M13.2 18.4V29M13.2 18.4L17.5 10.8C18.1 9.8 19.6 10.2 19.6 11.4V16.2H25.6C27.2 16.2 28.4 17.7 28 19.3L26.4 26.2C26.1 27.6 24.8 29 23.3 29H13.2"
      stroke="currentColor"
      stroke-width="2.25"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path class="tu-burst" d="M25.6 9.6L27.7 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <path class="tu-burst" d="M30.2 15H33.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
</template>

<style scoped>
.thumbs-up { display: block; width: 100%; height: 100%; overflow: visible; }
.tu-shape { transform-origin: 20px 20px; }
.tu-burst { opacity: 0; stroke-dasharray: 8; stroke-dashoffset: 8; }
.thumbs-up:hover .tu-shape { animation: tu-pop 900ms cubic-bezier(0.25, 0.1, 0.25, 1) both; }
.thumbs-up:hover .tu-burst { animation: tu-burst 900ms cubic-bezier(0.25, 0.1, 0.25, 1) both; }

@keyframes tu-pop {
  0%, 100% { transform: translateY(0) scale(1); }
  34% { transform: translateY(-2px) scale(1.08); }
  58% { transform: translateY(0) scale(0.98); }
}
@keyframes tu-burst {
  0%, 24% { opacity: 0; stroke-dashoffset: 8; }
  38% { opacity: 0.82; stroke-dashoffset: 0; }
  72%, 100% { opacity: 0; stroke-dashoffset: -8; }
}

@media (prefers-reduced-motion: reduce) {
  .thumbs-up:hover .tu-shape,
  .thumbs-up:hover .tu-burst { animation: none; }
}
</style>
