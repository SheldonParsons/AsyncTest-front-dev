<template>
  <div class="vibe-hero" :class="{ 'is-leaving': leaving }">
    <!-- Electron 窗口拖拽区（顶部一条，别的元素都 no-drag） -->
    <div class="window-drag" />
    <div v-if="showWinControls" class="win-ctl-zone hero-window-controls">
      <VibeWindowControls
        class="win-ctl"
        :maximized="winMaximized"
        @minimize="winControl('minimize')"
        @maximize-toggle="winControl('maximizeToggle')"
        @close="winControl('close')"
      />
    </div>

    <!-- three.js 画布（背景帧序列 + 粒子都在这里渲染；帧序列见 public/frames + Page.js） -->
    <canvas ref="canvasEl" class="webgl" />
    <img id="data-texture" src="" alt="" style="display:none" />

    <!-- 品牌 -->
    <header class="site-header">
      <div class="brand">
        <img
          class="brand-logo"
          src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/ast_vibe_light_new.svg"
          alt="AsyncTest Vibe"
        >
        <span class="brand-name">AsyncTest Vibe</span>
      </div>
    </header>

    <!-- 三段标语（滚轮翻页，粒子随之 morph；Page.js 靠 .section / .smooth 定位） -->
    <div id="fake-scroll">
      <div class="wrapper">
        <div class="smooth">
          <section class="section">
            <div class="section-text">
              <h1 class="headline-cn">让知识开口</h1>
              <p class="headline-en">AsyncTest Vibe — Knowledge, Answered.</p>
              <p class="subtitle">有问，皆有据。</p>
            </div>
          </section>

          <section class="section">
            <div class="section-text">
              <h1 class="headline-cn">让知识生长</h1>
              <p class="headline-en">AsyncTest Vibe — Knowledge, Evolving.</p>
              <p class="subtitle">知识，自生长。</p>
            </div>
          </section>

          <section class="section">
            <div class="section-text">
              <h1 class="headline-cn">让知识自洽</h1>
              <p class="headline-en">AsyncTest Vibe — Knowledge, in Harmony.</p>
              <p class="subtitle">一改，而自洽。</p>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- 进入知识库：仅第三张（末页）淡入 -->
    <button class="enter-btn" :class="{ 'is-visible': atLastSection }" type="button" @click="openKnowledge">
      进入知识库
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VibeWindowControls from './knowledge/components/VibeWindowControls.vue'

const router = useRouter()
const route = useRoute()

const canvasEl = ref<HTMLCanvasElement | null>(null)
let experience: any = null

// 当前页码由粒子引擎（Page.js）通过 vibe:section 事件广播上来。
const sectionIndex = ref(0)
const sectionLast = ref(2) // 末页下标（3 段 → 2），引擎会用真实值覆盖
const leaving = ref(false)
const atLastSection = computed(() => sectionIndex.value >= sectionLast.value)
const showWinControls = computed(() => !!window.electronAPI)
const winKey = computed(() => (route.query.windowKey as string) || 'vibe-workbench')
const winMaximized = ref(false)
let offMaximizeState: (() => void) | null = null

function onSectionEvt(e: Event) {
  const d = (e as CustomEvent).detail || {}
  if (typeof d.index === 'number') sectionIndex.value = d.index
  if (typeof d.last === 'number') sectionLast.value = d.last
  // 背景帧序列由引擎（Page.js）按滚动位置自行驱动，这里只更新按钮所需的页码。
}

onMounted(async () => {
  trackMaximizeState()
  // 先挂监听，确保能收到引擎初始化时广播的第 0 页。
  window.addEventListener('vibe:section', onSectionEvt)
  // 只在客户端加载 three 引擎：动态 import 避免 SSR 阶段触碰 window / WebGL / .frag 着色器。
  try {
    const mod = await import('./hero/experience/Experience.js')
    const Experience = (mod as any).default
    if (canvasEl.value) experience = new Experience(canvasEl.value)
  } catch (e) {
    // 粒子起不来也不至于白屏——标语仍在（HTML）。
    console.error('[vibe-hero] 粒子首屏初始化失败：', e)
  }
})

let enterTimer: ReturnType<typeof setTimeout> | null = null

onBeforeUnmount(() => {
  offMaximizeState?.()
  window.removeEventListener('vibe:section', onSectionEvt)
  if (enterTimer) { clearTimeout(enterTimer); enterTimer = null }
  // 停 RAF + 移除全部全局监听（滚轮/指针/resize）+ 置空单例，防泄漏、防死首屏劫持滚轮。
  try { experience && experience.destroy && experience.destroy() } catch (e) { /* noop */ }
  experience = null
})

function openKnowledge() {
  if (leaving.value) return
  leaving.value = true // 触发 hero 缩放 + 淡出 + 模糊转场
  enterTimer = setTimeout(() => {
    router.push({ name: 'vibeKnowledge', query: route.query })
  }, 620)
}

function winControl(action: 'minimize' | 'maximizeToggle' | 'close') {
  window.electronAPI?.wm?.control(winKey.value, action)
}

function trackMaximizeState() {
  if (!window.electronAPI) return
  window.electronAPI.wm?.isMaximized?.(winKey.value)
    ?.then((v: boolean) => { winMaximized.value = !!v })
    ?.catch(() => {})
  offMaximizeState = window.electronAPI.on?.('wm:maximize-state', (_event: any, payload: { key?: string; maximized?: boolean } = {}) => {
    if (payload?.key !== winKey.value) return
    winMaximized.value = !!payload.maximized
  }) || null
}
</script>

<style scoped>
/*
 * 注意：这里不能 @import 在线字体（Google Fonts 等）。
 * index.html 的 CSP 是 style-src 'self'，打包后该 @import 会进入本路由的异步 CSS chunk，
 * 被 CSP 拦截后 Vite 的 preload 报错、路由组件加载失败，线上表现为整窗黑屏。
 * 需要 Jost 的话请把 woff2 放进 src/assets/font 用 @font-face 本地引入。
 */

.vibe-hero {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000;
  color: #fff;
  transition: opacity .6s ease, filter .6s ease, transform .6s ease;
}
/* 点击「进入知识库」时的转场：整屏缩放推进 + 淡出 + 轻微模糊 */
.vibe-hero.is-leaving {
  opacity: 0;
  filter: blur(6px);
  transform: scale(1.06);
}

.window-drag {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 34px;
  z-index: 8;
  -webkit-app-region: drag;
}

.win-ctl-zone {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 20;
  padding: 6px 8px 10px 16px;
  -webkit-app-region: no-drag;
  opacity: 0;
  transition: opacity 150ms ease;
}

.win-ctl-zone:hover {
  opacity: 1;
}

.win-ctl {
  position: static;
}

.hero-window-controls :deep(.btn) {
  color: rgba(255, 255, 255, 0.7);
}

.hero-window-controls :deep(.btn:hover) {
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.95);
}

.hero-window-controls :deep(.btn:active) {
  background: rgba(255, 255, 255, 0.2);
}

.hero-window-controls :deep(.btn.close:hover) {
  background: #e81123;
  color: #fff;
}

/* —— three.js 画布（背景视频 + 粒子都在此渲染，垫在文字下） —— */
.webgl {
  position: fixed;
  top: 0;
  left: 0;
  outline: none;
  z-index: 0;
}

/* —— 品牌 —— */
.site-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 5;
  padding: 32px 40px;
  box-sizing: border-box;
  pointer-events: none;
}
.brand { display: inline-flex; align-items: center; gap: 12px; pointer-events: auto; -webkit-app-region: no-drag; }
.brand-logo { height: 28px; width: auto; display: block; }
.brand-name {
  font-family: 'Jost', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 15px; font-weight: 500; letter-spacing: 0.06em; color: #f5f6ff;
}


/* —— 三段标语 —— */
#fake-scroll { position: absolute; width: 100%; height: 100%; overflow: hidden; top: 0; left: 0; z-index: 2; }
.wrapper { position: sticky; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; }
.smooth { display: block; position: relative; overflow: hidden; will-change: transform; }
.section { display: flex; align-items: center; justify-content: flex-start; height: 100dvh; position: relative; padding-left: 8%; padding-right: 8%; }
.section-text { max-width: 640px; z-index: 2; }
.headline-cn { font-family: 'PingFang SC', 'Microsoft YaHei', 'Jost', sans-serif; font-weight: 700; font-size: clamp(48px, 7vw, 104px); line-height: 1.08; color: #fff; margin: 0 0 18px; letter-spacing: 0.02em; }
.headline-en { font-family: 'Jost', sans-serif; font-weight: 500; font-size: clamp(16px, 1.6vw, 22px); letter-spacing: 0.02em; color: rgba(245,246,255,.85); margin: 0 0 28px; }
.subtitle { font-family: 'PingFang SC', 'Microsoft YaHei', 'Jost', sans-serif; font-weight: 400; font-size: clamp(16px, 1.5vw, 20px); letter-spacing: 0.08em; color: rgba(245,246,255,.6); margin: 0; }

/* —— 进入知识库 —— */
.enter-btn {
  position: fixed;
  left: 50%;
  bottom: 40px;
  /* 默认隐藏：淡出 + 下沉 + 不可点，仅到末页时 .is-visible 淡入 */
  transform: translateX(-50%) translateY(14px);
  opacity: 0;
  pointer-events: none;
  z-index: 6;
  -webkit-app-region: no-drag;
  display: inline-flex; align-items: center; gap: 8px;
  height: 44px; padding: 0 22px;
  border: 1px solid rgba(255,255,255,.28);
  border-radius: 999px;
  background: rgba(255,255,255,.06);
  backdrop-filter: blur(8px);
  color: #f5f6ff;
  font-family: 'Jost', 'PingFang SC', sans-serif;
  font-size: 15px; font-weight: 500; letter-spacing: 0.04em;
  cursor: pointer;
  transition: opacity .5s ease, transform .5s ease, background .2s ease, border-color .2s ease;
}
.enter-btn.is-visible { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
.enter-btn svg { width: 18px; height: 18px; transition: transform .2s ease; }
.enter-btn.is-visible:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.5); }
.enter-btn.is-visible:hover svg { transform: translateX(3px); }
.enter-btn.is-visible:active { transform: translateX(-50%) translateY(0) scale(.97); }
</style>
