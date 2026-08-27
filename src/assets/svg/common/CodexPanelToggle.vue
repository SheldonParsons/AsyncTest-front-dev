<template>
  <button
    class="codex-panel-toggle"
    :class="{ 'is-collapsed': !resolvedExpanded }"
    type="button"
    :disabled="props.disabled"
    :aria-label="resolvedAriaLabel"
    :aria-expanded="resolvedExpanded"
    :aria-pressed="resolvedExpanded"
    :aria-controls="props.ariaControls"
    :title="props.title || resolvedAriaLabel"
    :data-state="resolvedExpanded ? 'expanded' : 'collapsed'"
    :style="toggleStyle"
    @click="handleToggle"
  >
    <svg
      class="codex-panel-toggle__svg"
      :width="GEOMETRY.canvas.width"
      :height="GEOMETRY.canvas.height"
      :viewBox="GEOMETRY.canvas.viewBox"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
    >
      <title>{{ resolvedAriaLabel }}</title>
      <rect
        class="codex-panel-toggle__frame"
        :x="GEOMETRY.frame.x"
        :y="GEOMETRY.frame.y"
        :width="GEOMETRY.frame.width"
        :height="GEOMETRY.frame.height"
        :rx="GEOMETRY.frame.radius"
        stroke="currentColor"
        :stroke-width="GEOMETRY.strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        class="codex-panel-toggle__divider"
        :d="DIVIDER_PATH"
        stroke="currentColor"
        :stroke-width="GEOMETRY.strokeWidth"
        stroke-linecap="round"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  CODEX_PANEL_TOGGLE_COLLAPSED_COLOR,
  CODEX_PANEL_TOGGLE_COLLAPSED_FILL,
  CODEX_PANEL_TOGGLE_DEFAULT_COLOR,
  CODEX_PANEL_TOGGLE_DIVIDER_PATH,
  CODEX_PANEL_TOGGLE_EXPANDED_FILL,
  CODEX_PANEL_TOGGLE_GEOMETRY,
} from './codexPanelToggleGeometry'

interface CodexPanelToggleProps {
  /** `true` means the panel is open and the divider is in its full position. */
  expanded?: boolean
  /** Alias for `expanded`, useful when the parent models an open state. */
  isOpen?: boolean
  /** Backwards-compatible inverse alias for callers that model collapse. */
  collapsed?: boolean
  /** SVG/button size. Numbers are interpreted as CSS pixels. */
  size?: number | string
  /** Optional icon color; defaults to the Codex dark neutral. */
  color?: string
  ariaLabel?: string
  ariaControls?: string
  title?: string
  disabled?: boolean
}

const props = defineProps<CodexPanelToggleProps>()

const emit = defineEmits<{
  (event: 'update:expanded', value: boolean): void
  (event: 'update:isOpen', value: boolean): void
  (event: 'update:collapsed', value: boolean): void
  (event: 'toggle', value: boolean): void
  /** Emits the expanded value for parity with the existing panel toggle API. */
  (event: 'panel-toggle', value: boolean): void
}>()

const GEOMETRY = CODEX_PANEL_TOGGLE_GEOMETRY
const DIVIDER_PATH = CODEX_PANEL_TOGGLE_DIVIDER_PATH

const hasExplicitState = computed(
  () => props.expanded !== undefined || props.isOpen !== undefined || props.collapsed !== undefined,
)

const internalExpanded = ref(
  props.isOpen ?? props.expanded ?? (props.collapsed === undefined ? true : !props.collapsed),
)

const resolvedExpanded = computed(() => {
  if (props.isOpen !== undefined) return props.isOpen
  if (props.expanded !== undefined) return props.expanded
  if (props.collapsed !== undefined) return !props.collapsed
  return internalExpanded.value
})

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel
  return resolvedExpanded.value ? 'Collapse panel' : 'Expand panel'
})

function cssSize(value: number | string | undefined): string {
  if (value === undefined) return `${GEOMETRY.canvas.width}px`
  return typeof value === 'number' ? `${value}px` : value
}

const toggleStyle = computed<Record<string, string>>(() => ({
  '--codex-panel-toggle-size': cssSize(props.size),
  '--codex-panel-toggle-duration': `${GEOMETRY.transitionDurationMs}ms`,
  '--codex-panel-toggle-easing': GEOMETRY.transitionEasing,
  '--codex-panel-toggle-divider-offset-x': `${GEOMETRY.divider.collapsedOffsetX}px`,
  '--codex-panel-toggle-divider-scale-y': `${GEOMETRY.divider.collapsedScaleY}`,
  '--codex-panel-toggle-expanded-color': CODEX_PANEL_TOGGLE_DEFAULT_COLOR,
  '--codex-panel-toggle-collapsed-color': CODEX_PANEL_TOGGLE_COLLAPSED_COLOR,
  '--codex-panel-toggle-frame-fill-expanded': CODEX_PANEL_TOGGLE_EXPANDED_FILL,
  '--codex-panel-toggle-frame-fill-collapsed': CODEX_PANEL_TOGGLE_COLLAPSED_FILL,
  ...(props.color ? { '--codex-panel-toggle-color': props.color } : {}),
}))

watch(
  () => [props.expanded, props.isOpen, props.collapsed],
  () => {
    if (hasExplicitState.value) internalExpanded.value = resolvedExpanded.value
  },
)

function handleToggle(): void {
  if (props.disabled) return

  const nextExpanded = !resolvedExpanded.value
  if (!hasExplicitState.value) internalExpanded.value = nextExpanded

  emit('update:expanded', nextExpanded)
  emit('update:isOpen', nextExpanded)
  emit('update:collapsed', !nextExpanded)
  emit('toggle', nextExpanded)
  emit('panel-toggle', nextExpanded)
}
</script>

<style scoped lang="scss">
.codex-panel-toggle {
  --codex-panel-toggle-size: 40px;
  --codex-panel-toggle-duration: 280ms;
  --codex-panel-toggle-easing: cubic-bezier(.22, 1, .36, 1);
  --codex-panel-toggle-expanded-color: #191c1f;
  --codex-panel-toggle-collapsed-color: #88898a;
  --codex-panel-toggle-frame-fill-expanded: #fff;
  --codex-panel-toggle-frame-fill-collapsed: transparent;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--codex-panel-toggle-size);
  height: var(--codex-panel-toggle-size);
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--codex-panel-toggle-color, var(--codex-panel-toggle-expanded-color));
  cursor: pointer;
  appearance: none;
  transition: background-color 150ms ease, color 180ms ease;

  &:hover:not(:disabled) {
    background: rgba(15, 15, 15, 0.07);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }
}

.codex-panel-toggle__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.codex-panel-toggle__frame {
  fill: var(--codex-panel-toggle-frame-fill-expanded);
  transition: fill 180ms ease;
}

.codex-panel-toggle__divider {
  transform-box: fill-box;
  transform-origin: center;
  transition: transform var(--codex-panel-toggle-duration) var(--codex-panel-toggle-easing);
  will-change: transform;
}

/* The frame stays mounted; only the divider travels to the compact handle. */
.codex-panel-toggle.is-collapsed .codex-panel-toggle__divider {
  transform: translateX(var(--codex-panel-toggle-divider-offset-x, 4px))
    scaleY(var(--codex-panel-toggle-divider-scale-y, .42));
}

.codex-panel-toggle.is-collapsed {
  color: var(--codex-panel-toggle-color, var(--codex-panel-toggle-collapsed-color));
}

.codex-panel-toggle.is-collapsed .codex-panel-toggle__frame {
  fill: var(--codex-panel-toggle-frame-fill-collapsed);
}

@media (prefers-reduced-motion: reduce) {
  .codex-panel-toggle,
  .codex-panel-toggle__divider,
  .codex-panel-toggle__frame {
    transition: none;
  }
}
</style>
