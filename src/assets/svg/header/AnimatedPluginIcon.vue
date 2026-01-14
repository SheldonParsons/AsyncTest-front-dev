<template>
  <div class="animated-icon" :class="{ 'is-hovered': isHovered }" @mouseenter="isHovered = true" @mouseleave="isHovered = false">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      :width="size"
      :height="size"
    >
      <!-- Puzzle piece / Plugin icon -->
      <path class="draw-path puzzle" d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.452-.968-.908a2.5 2.5 0 0 0-4.76 1.066 2.5 2.5 0 0 0 .362 1.292.98.98 0 0 1-.106 1.178l-1.611 1.611a2.407 2.407 0 0 1-1.704.706 2.407 2.407 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.878-.289c-.322.049-.618.222-.883.502a2.5 2.5 0 1 1-3.536-3.536c.28-.265.453-.561.502-.883a1.026 1.026 0 0 0-.289-.878L1.68 11.706A2.407 2.407 0 0 1 .973 10a2.407 2.407 0 0 1 .706-1.704L3.29 6.685a.98.98 0 0 1 1.178-.106 2.5 2.5 0 0 0 2.358-4.398.98.98 0 0 1 .276-.837L8.714.733a2.407 2.407 0 0 1 1.704-.706c.617 0 1.233.235 1.704.706l1.568 1.568c.23.23.556.338.878.289.322-.049.618-.222.883-.502a2.5 2.5 0 1 1 3.536 3.536c-.28.265-.453.561-.502.883" />
      <!-- Download arrow overlay -->
      <path class="draw-path download-arrow" d="M12 8v6m0 0l-2.5-2.5M12 14l2.5-2.5" />
    </svg>
    <div class="icon-glow"></div>
    <div class="pulse-ring"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  size: {
    type: Number,
    default: 22
  }
})

const isHovered = ref(false)
</script>

<style lang="scss" scoped>
.animated-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .draw-path {
    stroke-dasharray: 300;
    stroke-dashoffset: 0;
    transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1),
                stroke 0.3s ease,
                filter 0.3s ease;
  }

  .download-arrow {
    opacity: 0;
    transition: opacity 0.3s ease 0.3s;
  }

  .icon-glow {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(251, 146, 60, 0.3) 0%, transparent 70%);
    opacity: 0;
    transform: scale(0.8);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: none;
  }

  .pulse-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid rgba(251, 146, 60, 0.4);
    opacity: 0;
    transform: scale(1);
    pointer-events: none;
  }

  &:hover {
    svg {
      transform: scale(1.15);
    }

    .draw-path {
      stroke-dashoffset: 300;
      animation: draw 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      stroke: #fb923c;
      filter: drop-shadow(0 0 4px rgba(251, 146, 60, 0.6));
    }

    .puzzle {
      animation-delay: 0s;
    }

    .download-arrow {
      opacity: 1;
      animation: draw 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.4s forwards,
                 bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s;
    }

    .icon-glow {
      opacity: 1;
      transform: scale(1.8);
    }

    .pulse-ring {
      animation: pulse 1s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
  }
}

@keyframes draw {
  from {
    stroke-dashoffset: 300;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(2px);
  }
}

@keyframes pulse {
  0% {
    opacity: 0.6;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(2);
  }
}
</style>
