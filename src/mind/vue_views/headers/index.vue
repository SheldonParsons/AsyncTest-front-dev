<template>
  <div class="window-header" :class="{ 'has-win-controls': !isMac }">
    <div v-if="isMac" class="mac-traffic-hole"></div>

    <div class="header-content">
      <slot />
    </div>

    <div v-if="!isMac" class="win-controls-reserve"></div>

    <div class="drag-spacer"></div>

    <WinWindowControls v-if="!isMac" @minimize="minimize" @maximizeToggle="maximize" @close="close" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import WinWindowControls from './WinWindowControls.vue';

const route = useRoute();
const windowKey = computed(() => {
  const raw = route.query.windowKey;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
});
const isMac = computed(() => window.electronAPI?.platform === 'darwin');

function dispatchWindowAction(action: 'minimize' | 'maximizeToggle' | 'close') {
  const key = windowKey.value;
  if (!key) {
    console.error('[mind-window] Missing windowKey for window control action:', action);
    return;
  }
  void window.electronAPI?.wm?.control(key, action);
}

function minimize() {
  dispatchWindowAction('minimize');
}
function maximize() {
  dispatchWindowAction('maximizeToggle');
}
function close() {
  dispatchWindowAction('close');
}
</script>

<style scoped>
.window-header {
  height: 55px;
  flex: 0 0 55px;
  position: relative;
  display: flex;
  align-items: stretch;
  /* border-bottom: 1px solid rgba(0,0,0,0.08); */
}

.no-drag {
  -webkit-app-region: no-drag;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 auto;
  min-width: 0;
  -webkit-app-region: drag;
}

.window-header.has-win-controls .header-content {
  padding-left: 5px;
}

.drag-spacer {
  flex: 0 0 0;
  -webkit-app-region: drag;
}

.win-controls-reserve {
  flex: 0 0 135px;
}

.window-header.has-win-controls .drag-spacer {
  flex-basis: 6px;
}

.mac-traffic-hole {
  width: 88px;
  -webkit-app-region: no-drag;
}
</style>
