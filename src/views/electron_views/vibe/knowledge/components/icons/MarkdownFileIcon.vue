<template>
  <span class="markdown-file-icon" :style="iconStyle" aria-hidden="true">MD</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  size?: number
  fontSize?: number
  radius?: number
}>()

const iconStyle = computed(() => ({
  width: props.size ? `${props.size}px` : undefined,
  height: props.size ? `${props.size}px` : undefined,
  borderRadius: props.radius ? `${props.radius}px` : undefined,
  fontSize: props.fontSize ? `${props.fontSize}px` : undefined,
}))
</script>

<style scoped>
.markdown-file-icon {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  box-sizing: border-box;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #fff;
  -webkit-text-fill-color: #fff;
  font-size: var(--markdown-file-icon-font-size, 9px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -.02em;
  user-select: none;
}
</style>
