<template>
  <div class="window-header">
    <div v-if="isMac" class="mac-traffic-hole"></div>

    <div class="header-content no-drag">
      <slot />
    </div>

    <div class="drag-spacer"></div>

    <WinWindowControls
      v-if="isMac"
      @minimize="minimize"
      @maximizeToggle="maximize"
      @close="close"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import WinWindowControls from './WinWindowControls.vue';

const route = useRoute();
const windowKey = computed(() => (route.query.windowKey as string) || 'main');
const isMac = computed(() => window.electronAPI?.platform === 'darwin');

function minimize() {
  window.electronAPI?.wm?.control(windowKey.value, 'minimize');
}
function maximize() {
  window.electronAPI?.wm?.control(windowKey.value, 'maximizeToggle');
}
function close() {
  window.electronAPI?.wm?.control(windowKey.value, 'close');
}
</script>

<style scoped>
.window-header {
  height: 55px;
  position: relative;
  display: flex;
  align-items: stretch;
  /* border-bottom: 1px solid rgba(0,0,0,0.08); */
}

.no-drag { -webkit-app-region: no-drag; }

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drag-spacer {
  flex: 1 1 auto;
  -webkit-app-region: drag;
}

.mac-traffic-hole {
  width: 88px;
  -webkit-app-region: no-drag;
}
</style>