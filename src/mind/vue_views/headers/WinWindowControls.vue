<template>
  <div class="win-controls no-drag">
    <button class="btn minimize" title="Minimize" aria-label="Minimize" @click="$emit('minimize')">
      <svg viewBox="0 0 10 10" class="icon" aria-hidden="true">
        <path d="M2 7.5h6" />
      </svg>
    </button>

    <button class="btn" title="Maximize" aria-label="Maximize" @click="$emit('maximizeToggle')">
      <svg viewBox="0 0 10 10" class="icon" aria-hidden="true">
        <path d="M2.5 2.5h5v5h-5z" />
      </svg>
    </button>

    <button class="btn close" title="Close" aria-label="Close" @click="$emit('close')">
      <svg viewBox="0 0 10 10" class="icon" aria-hidden="true">
        <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  minimize: []
  maximizeToggle: []
  close: []
}>();
</script>

<style scoped>
.no-drag { -webkit-app-region: no-drag; }

.win-controls {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  height: 23px;
  display: flex;
  align-items: center;
  padding-left: 5px;
}

.btn {
  height: 100%;
  width: 25px;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(0,0,0,0.5);
  cursor: pointer;
  border-radius: 5px;
}

.btn:hover {
  background: rgba(0,0,0,0.08);
}

.btn:active {
  background: rgba(0,0,0,0.14);
}

.btn.close:hover {
  background: #e81123;
  color: #fff;
}

.btn.close:active {
  background: #c50f1f;
  color: #fff;
}

.btn.minimize .icon {
  transform: translateY(-3px);
}

.icon {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  stroke-width: 1;
  stroke-linecap: square;
  stroke-linejoin: miter;
  fill: none;
  opacity: 0.95;
}

.btn:nth-child(2) .icon {
  stroke-width: 1.0;
}
</style>
