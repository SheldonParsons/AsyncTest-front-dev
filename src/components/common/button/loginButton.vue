<template>
  <button class="login-button g-unselect" :disabled="disabled">
    {{ value }}
  </button>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'

const props = defineProps({
  value: String,
  disabled: {
    type: Boolean,
    default: false
  }
})
const { value } = toRefs(props)
</script>

<style lang="scss" scoped>
.login-button {
  //   background: #337ecc !important;

  background: #e6e8eb;
  border: 1px solid #282b5d !important;
  color: #303133 !important;
  cursor: pointer;
  font-size: 1.1rem;
  box-shadow: none !important;
  border-radius: $radius-regular;
  text-transform: uppercase;
  width: 100%;
  height: 50px;
  transition: 0.3s;
  font-weight: 400;
  outline: 0;
  font-family: $zh-font-family;
}
.login-button:active {
  background: rgba($color: #e6e8eb, $alpha: 0.8);
}
</style>
