<template>
  <CodexPanelToggle
    v-bind="{ ...$attrs, ...props }"
    class="codex-panel-toggle-mirrored-static"
    @update:expanded="forwardExpanded"
    @update:isOpen="forwardIsOpen"
    @update:collapsed="forwardCollapsed"
    @toggle="forwardToggle"
    @panel-toggle="forwardPanelToggle"
  />
</template>

<script setup lang="ts">
import CodexPanelToggle from './CodexPanelToggle.vue'

interface CodexPanelToggleMirroredStaticProps {
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

const props = withDefaults(defineProps<CodexPanelToggleMirroredStaticProps>(), {
  expanded: undefined,
  isOpen: undefined,
  collapsed: undefined,
  size: 22.4,
  iconOnly: false,
  color: '',
  ariaLabel: '切换面板状态',
  ariaControls: undefined,
  title: undefined,
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:expanded', value: boolean): void
  (event: 'update:isOpen', value: boolean): void
  (event: 'update:collapsed', value: boolean): void
  (event: 'toggle', value: boolean): void
  (event: 'panel-toggle', collapsed: boolean): void
}>()

function forwardExpanded(value: boolean): void {
  emit('update:expanded', value)
}

function forwardIsOpen(value: boolean): void {
  emit('update:isOpen', value)
}

function forwardCollapsed(value: boolean): void {
  emit('update:collapsed', value)
}

function forwardToggle(value: boolean): void {
  emit('toggle', value)
}

function forwardPanelToggle(expanded: boolean): void {
  // PanelStateToggle's contract exposes the collapsed value to its parent.
  emit('panel-toggle', !expanded)
}
</script>

<style scoped lang="scss">
/* Static state artwork: mirror the shared geometry and remove only glyph motion. */
.codex-panel-toggle-mirrored-static :deep(.codex-panel-toggle__svg) {
  transform-box: fill-box;
  transform-origin: center;
  transform: scaleX(-1);
}

.codex-panel-toggle-mirrored-static :deep(.codex-panel-toggle__divider),
.codex-panel-toggle-mirrored-static :deep(.codex-panel-toggle__frame) {
  transition: none !important;
}
</style>
