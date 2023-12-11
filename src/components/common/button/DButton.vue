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
  border: 1px solid transparent;
  border-radius: 8px;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(
      90deg,
      var(--global-theme-light-color),
      var(--global-theme-color)
    );
  text-align: center;
  .text {
    color: var(--global-theme-color);
    line-height: var(--dynamic-height);
  }
}
.customization-button:hover {
  background-image: linear-gradient(
      to right,
      var(--el-color-primary-light-9),
      var(--el-color-primary-light-9)
    ),
    linear-gradient(
      90deg,
      var(--global-theme-light-color),
      var(--global-theme-color)
    );
}
.customization-button:active {
  .text {
    color: var(--el-color-primary-light-9);
  }
  background-image: linear-gradient(
      to right,
      var(--el-color-primary-light-7),
      var(--el-color-primary-light-7)
    ),
    linear-gradient(
      90deg,
      var(--global-theme-light-color),
      var(--global-theme-color)
    );
}
</style>
