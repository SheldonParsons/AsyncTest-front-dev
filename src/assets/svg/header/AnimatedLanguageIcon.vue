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
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
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
    transform: scale(1.15) rotate(15deg);
    color: #059669;
    filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.4));
  }
}
</style>
