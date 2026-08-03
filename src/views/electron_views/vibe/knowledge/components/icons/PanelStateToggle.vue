<template>
  <object
    ref="objectEl"
    class="panel-state-toggle-object"
    :data="panelStateToggleUrl"
    type="image/svg+xml"
    :aria-label="props.ariaLabel"
    @load="handleLoad"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const panelStateToggleUrl = `${import.meta.env.BASE_URL}motion/panel-state-toggle.svg`

const props = withDefaults(defineProps<{
  collapsed: boolean
  color?: string
  ariaLabel?: string
}>(), {
  color: '',
  ariaLabel: '切换面板状态',
})
const emit = defineEmits<{ 'panel-toggle': [collapsed: boolean] }>()

const objectEl = ref<HTMLObjectElement | null>(null)
let svgRoot: SVGSVGElement | null = null
let panelToggleListener: EventListener | null = null
let pointerDownListener: EventListener | null = null

function detachListener() {
  if (svgRoot && panelToggleListener) svgRoot.removeEventListener('paneltoggle', panelToggleListener)
  if (svgRoot && pointerDownListener) svgRoot.removeEventListener('pointerdown', pointerDownListener)
  svgRoot = null
  panelToggleListener = null
  pointerDownListener = null
}

function syncCollapsedState() {
  if (!svgRoot) return
  svgRoot.classList.toggle('is-collapsed', props.collapsed)
  svgRoot.setAttribute('aria-pressed', String(props.collapsed))
  svgRoot.style.setProperty('outline', 'none', 'important')
  if (props.color) svgRoot.style.color = props.color
  else svgRoot.style.removeProperty('color')
}

function handleLoad() {
  detachListener()
  svgRoot = objectEl.value?.contentDocument?.documentElement as unknown as SVGSVGElement | null
  if (!svgRoot) return
  objectEl.value?.style.setProperty('outline', 'none', 'important')
  syncCollapsedState()
  // 鼠标按下时阻止嵌入文档取得浏览器默认焦点，避免切换实例时闪出橙色焦点环。
  // 键盘事件不经过 pointerdown，仍可由 SVG 自身的 Enter / Space 处理。
  pointerDownListener = (event: Event) => {
    event.preventDefault()
    objectEl.value?.blur()
    ;(svgRoot as unknown as HTMLElement | null)?.blur()
  }
  panelToggleListener = (event: Event) => {
    const collapsed = Boolean((event as CustomEvent<{ collapsed?: boolean }>).detail?.collapsed)
    emit('panel-toggle', collapsed)
  }
  svgRoot.addEventListener('pointerdown', pointerDownListener)
  svgRoot.addEventListener('paneltoggle', panelToggleListener)
}

watch(() => [props.collapsed, props.color], syncCollapsedState)
onBeforeUnmount(detachListener)
</script>

<style scoped>
.panel-state-toggle-object {
  display: block;
  border: 0;
  outline: none;
}
</style>
