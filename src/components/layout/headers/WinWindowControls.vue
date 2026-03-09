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

/* 右上角，按钮高度约 30% header（55px * 0.3 ≈ 16.5） */
.win-controls {
  position: absolute;
  top: 0px;
  right: 0px;
  height: 23px;
  display: flex;
  align-items: center;
  padding-left: 5px;
}

/* 默认：完全透明、无边框、无底色 */
.btn {
  height: 100%;
  width: 25px;            /* Win11 更接近 36~46，这里偏紧凑 */
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(0,0,0,0.5);
  border-radius: 0px;     /* 微圆角 */
  cursor: pointer;
  border-radius: 5px;
}

/* hover：才出现浅灰底（无边框） */
.btn:hover {
  background: rgba(0,0,0,0.08);
}

/* active：更深一点 */
.btn:active {
  background: rgba(0,0,0,0.14);
}

/* close hover：红底白字，接近原生 */
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

/* SVG 图标：用 stroke 更像原生（线条细） */
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

/* 最大化方框稍微偏细一点更像系统 */
.btn:nth-child(2) .icon {
  stroke-width: 1.0;
}
</style>