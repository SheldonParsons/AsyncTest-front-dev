<template>
  <main class="vibe-landing">
    <div class="vk-drag" aria-hidden="true" />

    <header class="vk-topbar">
      <div class="brand">
        <span class="brand-dot" aria-hidden="true" />
        <span class="brand-text">AsyncTest <span class="brand-sep">·</span> Vibe</span>
      </div>
    </header>

    <section class="vk-stage" @keydown.enter="openKnowledge" tabindex="0">
      <PlantGrowth :key="plantKey" :size="168" class="vk-plant" />

      <h1 class="vk-headline">
        把模糊的需求，
        <span class="vk-headline-accent">长成可维护的事实。</span>
      </h1>
      <p class="vk-lede">
        从一句话开始描述你的系统。Vibe 会把对话沉淀为对象、能力、规则、链路、口径与影响——一棵可被检索、被治理、被追溯的认知树。
      </p>

      <div class="vk-pill-row" aria-label="Vibe capabilities">
        <span class="vk-pill"><i class="dot" />录入</span>
        <span class="vk-pill"><i class="dot" />补丁</span>
        <span class="vk-pill"><i class="dot" />事实</span>
        <span class="vk-pill"><i class="dot" />召回</span>
        <span class="vk-pill"><i class="dot" />治理</span>
        <span class="vk-pill"><i class="dot" />影响</span>
      </div>

      <button class="vk-cta" type="button" @click="openKnowledge">
        <span>进入 Vibe 知识库</span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </button>

      <p class="vk-shortcut">
        <kbd>Enter</kbd> 直接进入
      </p>
    </section>

    <footer class="vk-footer">
      <span class="vk-footer-tag">Requirement Modeling · Preview</span>
      <span class="vk-footer-sep" aria-hidden="true">·</span>
      <span class="vk-footer-meta">v0.1</span>
    </footer>

    <VibeModelSettings />
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PlantGrowth from './knowledge/PlantGrowth.vue'
import VibeModelSettings from './VibeModelSettings.vue'

const router = useRouter()
const route = useRoute()
const plantKey = ref(0)

function openKnowledge() {
  router.push({ name: 'vibeKnowledge', query: route.query })
}

onMounted(() => {
  plantKey.value += 1
})
</script>

<style scoped lang="scss">
.vibe-landing {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  padding: 0 32px 28px;
  box-sizing: border-box;
  color: #1d1d1f;
  background:
    radial-gradient(circle at 50% 38%, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0) 34%),
    linear-gradient(180deg, #fbfbfa 0%, #f4f4f2 100%);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.vk-drag {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 36px;
  z-index: 30;
  -webkit-app-region: drag;
}

.vk-topbar {
  flex-shrink: 0;
  height: 40px;
  display: flex;
  align-items: center;
  padding-top: 0;
  box-sizing: border-box;
  -webkit-app-region: drag;

  > * { -webkit-app-region: no-drag; }
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 58px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(15, 15, 15, 0.06);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
}

.brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2f7441, #8cc760);
  box-shadow: 0 0 0 2px rgba(140, 199, 96, 0.18);
}

.brand-text {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #2a2a2c;
}

.brand-sep {
  margin: 0 4px;
  color: rgba(15, 15, 15, 0.28);
}

.vk-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  outline: none;
  text-align: center;
  padding: 12px 0 28px;
}

.vk-plant {
  width: 100%;
  pointer-events: none;
  flex-shrink: 0;
  margin-bottom: 4px;
}

.vk-headline {
  max-width: 720px;
  margin: 4px 0 0;
  font-size: 34px;
  font-weight: 660;
  line-height: 1.18;
  letter-spacing: -0.01em;
  color: #161618;
}

.vk-headline-accent {
  background: linear-gradient(135deg, #2f7441 0%, #6ba84a 60%, #b6c668 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.vk-lede {
  max-width: 580px;
  margin: 8px 0 4px;
  color: rgba(15, 15, 15, 0.58);
  font-size: 13.5px;
  line-height: 1.7;
  font-weight: 400;
}

.vk-pill-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
}

.vk-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(15, 15, 15, 0.07);
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: rgba(15, 15, 15, 0.66);
  letter-spacing: 0.01em;
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);

  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(15, 15, 15, 0.35);
  }
}

.vk-cta {
  margin-top: 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px 11px 22px;
  border: none;
  border-radius: 999px;
  background: #161618;
  color: #f7f7f5;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow:
    0 1px 2px rgba(15, 15, 15, 0.12),
    0 12px 28px rgba(15, 15, 15, 0.18);
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.18s ease;
  }

  &:hover {
    background: #000;
    transform: translateY(-1px);
    box-shadow:
      0 1px 2px rgba(15, 15, 15, 0.16),
      0 16px 36px rgba(15, 15, 15, 0.22);

    svg { transform: translateX(2px); }
  }

  &:active {
    transform: translateY(0);
  }
}

.vk-shortcut {
  margin: 6px 0 0;
  color: rgba(15, 15, 15, 0.42);
  font-size: 11.5px;
  font-weight: 400;

  kbd {
    display: inline-block;
    padding: 1px 6px;
    margin-right: 4px;
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(15, 15, 15, 0.12);
    border-bottom-width: 2px;
    border-radius: 5px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px;
    color: #2a2a2c;
  }
}

.vk-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-top: 12px;
  color: rgba(15, 15, 15, 0.36);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.vk-footer-tag { font-weight: 600; text-transform: uppercase; }
.vk-footer-sep { opacity: 0.5; }
.vk-footer-meta { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

@media (max-width: 760px) {
  .vk-headline { font-size: 26px; }
  .vk-lede { font-size: 13px; max-width: 480px; }
  .vk-plant { /* size controlled via :size prop on responsive screens */ }
}
</style>
