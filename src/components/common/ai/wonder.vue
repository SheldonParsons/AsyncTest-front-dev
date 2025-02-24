<template>

<div class="stage" :style="{ '--content-text': `'${contentText}'` }">
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
  <div class="layer"></div>
</div>
</template>

<script setup lang="ts">
// 定义一个 prop 来接收外部传入的内容
const props = defineProps({
  contentText: {
    type: String,
    default: 'Knowledge!'
  }
})

</script>

<style lang="scss" scoped>
.stage {
  height: 10px;   // 缩小高度
  width: 100%;    // 缩小宽度
  margin: auto;
  perspective: 9999px;
  transform-style: preserve-3d;
}

.layer {
  width: 100%;
  height: 100%;
  position: absolute;
  transform-style: preserve-3d;
  animation: ಠ_ಠ 5s infinite alternate ease-in-out -7.5s;
  animation-fill-mode: forwards;
  transform: rotateY(40deg) rotateX(10deg) translateZ(0);
}

.layer:after {
  font: 15px/0.65 'Monoton-Regular', "Kaushan Script", Futura, "Roboto", "Trebuchet MS", Helvetica, sans-serif;  // 缩小字体
  content: var(--content-text);
  white-space: pre;
  text-align: center;
  height: 100%;
  width: 100%;
  position: absolute;
//   top: 5px; // 缩小整体位置
  color: whitesmoke;
  letter-spacing: -1px;
  text-shadow: 0.4px 0 1px rgba(0, 0, 0, 0.13);  // 缩小阴影
}

.layer:nth-child(1):after { transform: translateZ(0px); }
.layer:nth-child(2):after { transform: translateZ(-0.15px); }
.layer:nth-child(3):after { transform: translateZ(-0.3px); }
.layer:nth-child(4):after { transform: translateZ(-0.45px); }
.layer:nth-child(5):after { transform: translateZ(-0.6px); }
.layer:nth-child(6):after { transform: translateZ(-0.75px); }
.layer:nth-child(7):after { transform: translateZ(-0.9px); }
.layer:nth-child(8):after { transform: translateZ(-1.05px); }
.layer:nth-child(9):after { transform: translateZ(-1.2px); }
.layer:nth-child(10):after { transform: translateZ(-1.35px); }
.layer:nth-child(11):after { transform: translateZ(-1.5px); }
.layer:nth-child(12):after { transform: translateZ(-1.65px); }
.layer:nth-child(13):after { transform: translateZ(-1.8px); }
.layer:nth-child(14):after { transform: translateZ(-1.95px); }
.layer:nth-child(15):after { transform: translateZ(-2.1px); }
.layer:nth-child(16):after { transform: translateZ(-2.25px); }
.layer:nth-child(17):after { transform: translateZ(-2.4px); }
.layer:nth-child(18):after { transform: translateZ(-2.55px); }
.layer:nth-child(19):after { transform: translateZ(-2.7px); }
.layer:nth-child(20):after { transform: translateZ(-2.85px); }

.layer:nth-child(n+10):after {
  -webkit-text-stroke: 0.3px rgba(0, 0, 0, 0.25);  // 缩小描边
}

.layer:nth-child(n+11):after {
  -webkit-text-stroke: 1.5px dodgerblue;
  text-shadow: 0.6px 0 0.6px #00366b, 0.5px 0.5px 0.5px #002951, 0 0.6px 0.6px #00366b;
}

.layer:nth-child(n+12):after {
  -webkit-text-stroke: 1.5px #0077ea;
}

.layer:last-child:after {
  -webkit-text-stroke: 1.7px rgba(0, 0, 0, 0.1);
}

.layer:first-child:after {
  color: #fff;
  text-shadow: none;
}

@keyframes ಠ_ಠ {
  100% {
    transform: rotateY(-10deg) rotateX(-10deg); 
  }
}

</style>