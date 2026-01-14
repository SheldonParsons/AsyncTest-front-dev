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
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
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
  }

  &:hover .icon-svg {
    transform: scale(1.1) rotate(90deg);
    color: #059669;
    filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.4));
  }
}
</style>
