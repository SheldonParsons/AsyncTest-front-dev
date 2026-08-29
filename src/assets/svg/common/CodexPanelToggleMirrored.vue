<template>
  <CodexPanelToggle
    v-bind="{ ...$attrs, ...props }"
    class="codex-panel-toggle-mirrored"
  />
</template>

<script setup lang="ts">
import CodexPanelToggle from './CodexPanelToggle.vue'

interface CodexPanelToggleMirroredProps {
  expanded?: boolean
  isOpen?: boolean
  collapsed?: boolean
  size?: number | string
  iconOnly?: boolean
  color?: string
  ariaLabel?: string
  ariaControls?: string
  title?: string
  disabled?: boolean
}

defineOptions({ inheritAttrs: false })

const props = defineProps<CodexPanelToggleMirroredProps>()
</script>

<style scoped lang="scss">
/* Mirror the shared glyph around its own center; the button hit area stays unchanged. */
.codex-panel-toggle-mirrored :deep(.codex-panel-toggle__svg) {
  transform-box: fill-box;
  transform-origin: center;
  transform: scaleX(-1);
}
</style>
