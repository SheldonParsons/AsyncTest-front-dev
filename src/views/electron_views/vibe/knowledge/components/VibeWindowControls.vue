<template>
  <div class="win-controls no-drag">
    <button class="btn" title="最小化" aria-label="最小化" @click="$emit('minimize')">
      <!-- lucide: minus -->
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /></svg>
    </button>

    <button
      class="btn"
      :title="maximized ? '还原' : '最大化'"
      :aria-label="maximized ? '还原' : '最大化'"
      @click="$emit('maximizeToggle')"
    >
      <!-- 已最大化 → 还原图标（lucide: square-arrow-out-down-left）；否则 lucide: square -->
      <svg v-if="maximized" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 21h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6" /><path d="m3 21 9-9" /><path d="M9 21H3v-6" /></svg>
      <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /></svg>
    </button>

    <button class="btn close" title="关闭" aria-label="关闭" @click="$emit('close')">
      <!-- lucide: x -->
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  maximized?: boolean
}>()

defineEmits<{
  minimize: []
  maximizeToggle: []
  close: []
}>()
</script>

<style scoped>
.no-drag { -webkit-app-region: no-drag; }

.win-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 23px;
}

.btn {
  height: 100%;
  width: 26px;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(15, 15, 15, 0.55);
  border-radius: 5px;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}

.btn:hover {
  background: rgba(15, 15, 15, 0.08);
  color: rgba(15, 15, 15, 0.85);
}

.btn:active {
  background: rgba(15, 15, 15, 0.14);
}

/* close hover：红底白字，贴近 Win 原生 */
.btn.close:hover {
  background: #e81123;
  color: #fff;
}
.btn.close:active {
  background: #c50f1f;
  color: #fff;
}

.icon {
  width: 13px;
  height: 13px;
}
</style>
