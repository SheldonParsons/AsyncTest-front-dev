<template>
  <div
    class="thinking-orb-status"
    :style="shimmerStyle"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    :aria-label="props.ariaLabel || undefined"
  >
    <canvas
      ref="canvasRef"
      class="thinking-orb-canvas"
      :style="canvasStyle"
      aria-hidden="true"
    />
    <span class="thinking-orb-label">{{ props.label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MODE_DRAWS, resolvePreset, type OrbState } from 'thinking-orbs/engine'
import { continuousAnimationDelay } from '../motionContinuity'

// Animation geometry: thinking-orbs, MIT © Jakub Antalik.
// 官方提供 20 / 64 两套独立调参；小尺寸状态使用官方 20px preset，
// CSS 显示为原 46px 的一半，避免把 64px 点阵硬压缩后显得过密。
const ORB_SIZE = 20 as const
const ORB_DISPLAY_SIZE = 23
const props = withDefaults(defineProps<{
  /** Keep the compact status wrapper reusable for other long-running states. */
  state?: OrbState
  label?: string
  ariaLabel?: string
}>(), {
  state: 'composing',
  label: 'Thinking',
  ariaLabel: '',
})
const canvasRef = ref<HTMLCanvasElement | null>(null)
const shimmerStyle = { '--vibe-shimmer-delay': continuousAnimationDelay() }
const canvasStyle = computed(() => ({
  width: `${ORB_DISPLAY_SIZE}px`,
  height: `${ORB_DISPLAY_SIZE}px`,
}))

let animationFrame = 0
let running = false
let visible = true
let intersectionObserver: IntersectionObserver | null = null
let reducedMotionQuery: MediaQueryList | null = null

// `working` is used by project switching; keep an explicit preset reference so
// that this path remains obvious, while other states stay supported too.
const workingPreset = resolvePreset('working', ORB_SIZE)
// The default remains `composing` so the existing conversation status keeps
// its established motion.
const resolvedPreset = props.state === 'working'
  ? workingPreset
  : resolvePreset(props.state, ORB_SIZE)
const { mode, speed, opts } = resolvedPreset
const drawFrame = MODE_DRAWS[mode]

function paint(timeSeconds: number) {
  const canvas = canvasRef.value
  if (!canvas) return
  const context = canvas.getContext('2d')
  if (!context) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, ORB_SIZE, ORB_SIZE)
  // Vibe 对话区是固定浅色背景；false 使用官方 light ink 配置。
  drawFrame(context, ORB_SIZE, timeSeconds, false, opts)
}

function loop() {
  paint((performance.now() / 1000) * speed)
  if (running) animationFrame = requestAnimationFrame(loop)
}

function stop() {
  running = false
  cancelAnimationFrame(animationFrame)
}

function start() {
  if (running || reducedMotionQuery?.matches || !visible || document.visibilityState === 'hidden') return
  running = true
  animationFrame = requestAnimationFrame(loop)
}

function syncMotionPreference() {
  if (reducedMotionQuery?.matches) {
    stop()
    paint(0.6)
  } else {
    start()
  }
}

function syncDocumentVisibility() {
  if (document.visibilityState === 'hidden') stop()
  else start()
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(ORB_SIZE * dpr)
  canvas.height = Math.round(ORB_SIZE * dpr)

  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotionQuery.addEventListener('change', syncMotionPreference)
  document.addEventListener('visibilitychange', syncDocumentVisibility)

  paint(reducedMotionQuery.matches ? 0.6 : (performance.now() / 1000) * speed)
  if (typeof IntersectionObserver === 'undefined') {
    start()
    return
  }
  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting
    if (visible) start()
    else stop()
  })
  intersectionObserver.observe(canvas)
})

onBeforeUnmount(() => {
  stop()
  intersectionObserver?.disconnect()
  reducedMotionQuery?.removeEventListener('change', syncMotionPreference)
  document.removeEventListener('visibilitychange', syncDocumentVisibility)
})
</script>

<style scoped>
.thinking-orb-status {
  width: fit-content;
  min-height: 23px;
  /* 抵消时间线行距和过程区尾距，让状态紧跟最后一条思考内容。 */
  margin-top: -6px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  font-weight: 560;
  line-height: 1.4;
  white-space: nowrap;
}

.thinking-orb-canvas {
  flex: none;
  display: block;
}

.thinking-orb-label {
  display: inline-block;
  padding: 2px 0 3px;
  background: linear-gradient(
    100deg,
    rgba(15, 15, 15, 0.38) 18%,
    rgba(15, 15, 15, 0.92) 48%,
    rgba(15, 15, 15, 0.38) 78%
  );
  background-size: 220% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: thinking-label-shimmer 1.8s linear infinite;
  animation-delay: var(--vibe-shimmer-delay, 0ms);
}

@keyframes thinking-label-shimmer {
  from { background-position: 220% 0; }
  to { background-position: -220% 0; }
}

.thinking-orb-status-enter-active,
.thinking-orb-status-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 220ms ease;
  transform-origin: left center;
}

.thinking-orb-status-enter-from {
  opacity: 0;
  transform: translateY(4px) scale(0.96);
  filter: blur(2px);
}

.thinking-orb-status-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.94);
  filter: blur(3px);
}

@media (max-width: 720px) {
  .thinking-orb-status {
    min-height: 23px;
    font-size: 14px;
    transform: scale(0.92);
    transform-origin: left center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .thinking-orb-status-enter-active,
  .thinking-orb-status-leave-active {
    transition: opacity 80ms linear;
  }

  .thinking-orb-status-enter-from,
  .thinking-orb-status-leave-to {
    opacity: 0;
    transform: none;
    filter: none;
  }

  .thinking-orb-label {
    background: none;
    color: rgba(15, 15, 15, 0.58);
    -webkit-text-fill-color: currentColor;
    animation: none;
  }
}
</style>
