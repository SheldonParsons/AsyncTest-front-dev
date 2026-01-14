<template>
  <div class="icon-wrapper">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      :width="size"
      :height="size"
      class="icon-svg"
    >
      <path class="door" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline class="arrow" points="16 17 21 12 16 7" />
      <line class="arrow-line" x1="21" y1="12" x2="9" y2="12" />
    </svg>
  </div>
</template>

<script setup lang="ts">
defineProps({
  size: {
    type: Number,
    default: 20
  }
})
</script>

<style lang="scss" scoped>
.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;

  .icon-svg {
    transition: all 0.3s ease;

    .arrow, .arrow-line {
      transition: transform 0.3s ease;
    }
  }

  &:hover .icon-svg {
    color: #dc2626;
    filter: drop-shadow(0 0 4px rgba(220, 38, 38, 0.3));

    .arrow, .arrow-line {
      transform: translateX(3px);
    }
  }
}
</style>
