<template>
  <div class="cont">
    <div class="cube">
      <div class="side"></div>
      <div class="side"></div>
      <div class="side"></div>
      <div class="side"></div>
      <div class="side"></div>
      <div class="side"></div>
    </div>
  </div>
</template>

<script setup></script>

<style lang="scss" scoped>
@property --hue {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
div {
  transform-style: preserve-3d;
  box-sizing: border-box;
}

.cont {
  --clr: hsl(var(--hue) 80% 80%);
  --hue2: calc(var(--hue) + 90deg);
  --clr2: hsl(var(--hue2) 80% 80%);
  color: var(--clr);
  filter: drop-shadow(0 0 0.08vmin currentcolor); // 再次缩小阴影
  animation: clr-chg infinite 10s linear;
}

.cube {
  width: 2vmin;  // 调整为头像大小
  aspect-ratio: 1;
  position: relative;
  rotate: 1 1 1 45deg;
  animation: rot infinite 20s linear;
}
.cube:hover {
  animation-play-state: paused;
}
.cube:hover .side {
  --clr2: color-mix(in lab, var(--clr), #fff);
  box-shadow: 0 0 2vmin currentcolor;
}

.side {
  --ang: 45deg;
  position: absolute;
  inset: 0;
  font-size: 0.8rem; // 缩小字体
  background-image: repeating-linear-gradient(var(--ang), #dc050500 0 2%, var(--clr) 0 4%, #ed010100 0 7%, var(--clr2) 0 8.5%, #e3000000 0);
}
// 再次缩小每个面的 translate 值
.side:nth-of-type(1) { translate: 0 0 1vmin; }
.side:nth-of-type(2) { rotate: y 90deg; translate: 1vmin; transform: rotatez(270deg); }
.side:nth-of-type(3) { rotate: y 90deg; translate: -1vmin; transform: rotatez(90deg); }
.side:nth-of-type(4) { rotate: x 90deg; translate: 0 1vmin; transform: rotatez(270deg); }
.side:nth-of-type(5) { rotate: x 90deg; translate: 0 -1vmin; --ang: 135deg; }
.side:nth-of-type(6) { translate: 0 0 -1vmin; transform: rotatez(180deg); }

@keyframes rot {
  to {
    transform: rotatex(1080deg) rotatey(360deg) rotatez(720deg);
  }
}
@keyframes clr-chg {
  from {
    --hue: 0deg;
  }
  to {
    --hue: 360deg;
  }
}
body {
  display: grid;
  place-content: center;
  min-height: 100vh;
  margin: 0;
  background: 
  radial-gradient(at 100% 20%, #09d12725, #eb030300 70%), 
  radial-gradient(at 20% 20%, #05d90525, #f9050500 70%), 
  radial-gradient(at 20% 100%, #08cb7925, #e3050500 70%), 
  radial-gradient(at 100% 100%, #08df8925, #e7010100 70%), #03923c;
  background-blend-mode: color-dodge;
}
</style>
