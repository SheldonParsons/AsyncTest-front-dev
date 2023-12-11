<template>
  <div
    class="customization-button"
    :style="{ width: width + 'px', height: height + 'px' }"
  >
    <span
      class="text g-unselect"
      :style="{ '--dynamic-height': height + 'px' }"
      >{{ text }}</span
    >
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'

const props = defineProps({
  width: {
    type: Number,
    default: 40
  },
  height: {
    type: Number,
    default: 30
  },
  text: {
    type: String,
    default: ''
  }
})
const { width, height } = toRefs(props)
</script>

<style lang="scss" scoped>
.customization-button {
  cursor: pointer;
  background-color: white;
  border: 2px solid transparent;
  border-radius: 8px;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(
    90deg,
    var(--global-theme-light-color),
    var(--global-theme-color)
  );
  text-align: center;
  .text {
    color: white;
    line-height: var(--dynamic-height);
  }
}
.customization-button:hover {
  background-image: linear-gradient(
    90deg,
    var(--global-theme-light-color),
    var(--global-theme-light-color)
  );
}
.customization-button:active {
  background-image: linear-gradient(
    90deg,
    var(--global-theme-light-color),
    var(--global-theme-color)
  );
}
</style>
