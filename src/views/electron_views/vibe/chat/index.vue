<template>
  <main class="vibe-chat-placeholder">
    <div class="vibe-drag-region" aria-hidden="true" />
    <section class="panel">
      <p class="eyebrow">Chat</p>
      <h1>后续开放</h1>
      <p>这里会承接基于 Vibe 知识库的问答、工具调用和任务型 Agent。</p>
      <button type="button" @click="backToWorkbench">返回工作台</button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function backToWorkbench() {
  router.push({ name: 'vibeWorkbench' })
}
</script>

<style scoped lang="scss">
.vibe-chat-placeholder {
  min-height: 100vh;
  padding-top: 28px;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  padding-left: 32px;
  padding-right: 32px;
  padding-bottom: 32px;
  background: #f7f7f8;
  color: #171717;
}

.vibe-drag-region {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 28px;
  z-index: 10;
  -webkit-app-region: drag;
}

.panel {
  width: min(460px, 100%);
  padding: 32px;
  border: 1px solid rgba(24, 24, 27, 0.1);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.eyebrow {
  margin: 0 0 10px;
  color: #71717a;
  font-size: 13px;
  font-weight: 650;
}

h1 {
  margin: 0;
  font-size: 26px;
  letter-spacing: 0;
}

p {
  margin: 12px 0 24px;
  color: #64676d;
  font-size: 14px;
  line-height: 1.7;
}

button {
  height: 36px;
  padding: 0 16px;
  border: 1px solid rgba(24, 24, 27, 0.16);
  border-radius: 8px;
  background: #18181b;
  color: #ffffff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.16s ease, transform 0.16s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
}
</style>
