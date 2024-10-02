<template>
  <div class="tri">
    <div class="side">
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
    </div>
    <div class="side">
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
    </div>
    <div class="side">
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
    </div>
  </div>
</template>

<script setup></script>

<style lang="scss" scoped>
body {
  background-color: #0f0f0f;
}

.tri {
  width: 100%;
  height: 100%;
  position: relative;
  // left: 43%;
  // top: 54%;
}
.tri .side {
  width: 50px;
  height: 50px;
  position: absolute;
  transform-origin: center center;
}
.tri .side:nth-child(1) {
  transform: translateX(-10px);
}
.tri .side:nth-child(2) {
  transform: translateX(0px);
}
.tri .side:nth-child(3) {
  transform: translateX(10px);
}
.tri .side:nth-child(2) {
  transform: translateY(-15px);
}
.tri .ring {
  width: 5px;
  height: 5px;
  top: 60%;
  left: 43%;
  position: absolute;
  background: white;
  -webkit-animation-name: rotate, cromatic;
  animation-name: rotate, cromatic;
  -webkit-animation-duration: 3s, 3s;
  animation-duration: 3s, 3s;
  -webkit-animation-timing-function: linear, linear;
  animation-timing-function: linear, linear;
  -webkit-animation-iteration-count: infinite, infinite;
  animation-iteration-count: infinite, infinite;
  opacity: 0.5;
  //   box-shadow: 0 0 30px black;
  //   border-radius: 20%;
}

.side:nth-child(1) .ring:nth-child(0) {
  margin: 0 0 0 0px;
  z-index: 0;
  -webkit-animation-delay: 0s;
  animation-delay: 0s;
}

.side:nth-child(1) .ring:nth-child(1) {
  margin: 0 0 0 0.6666666667px;
  z-index: 1;
  -webkit-animation-delay: 0.0333333333s;
  animation-delay: 0.0333333333s;
}

.side:nth-child(1) .ring:nth-child(2) {
  margin: 0 0 0 1.3333333333px;
  z-index: 2;
  -webkit-animation-delay: 0.0666666667s;
  animation-delay: 0.0666666667s;
}

.side:nth-child(1) .ring:nth-child(3) {
  margin: 0 0 0 2px;
  z-index: 3;
  -webkit-animation-delay: 0.1s;
  animation-delay: 0.1s;
}

.side:nth-child(1) .ring:nth-child(4) {
  margin: 0 0 0 2.6666666667px;
  z-index: 4;
  -webkit-animation-delay: 0.1333333333s;
  animation-delay: 0.1333333333s;
}

.side:nth-child(1) .ring:nth-child(5) {
  margin: 0 0 0 3.3333333333px;
  z-index: 5;
  -webkit-animation-delay: 0.1666666667s;
  animation-delay: 0.1666666667s;
}

.side:nth-child(1) .ring:nth-child(6) {
  margin: 0 0 0 4px;
  z-index: 6;
  -webkit-animation-delay: 0.2s;
  animation-delay: 0.2s;
}

.side:nth-child(1) .ring:nth-child(7) {
  margin: 0 0 0 4.6666666667px;
  z-index: 7;
  -webkit-animation-delay: 0.2333333333s;
  animation-delay: 0.2333333333s;
}

.side:nth-child(1) .ring:nth-child(8) {
  margin: 0 0 0 5.3333333333px;
  z-index: 8;
  -webkit-animation-delay: 0.2666666667s;
  animation-delay: 0.2666666667s;
}

.side:nth-child(1) .ring:nth-child(9) {
  margin: 0 0 0 6px;
  z-index: 9;
  -webkit-animation-delay: 0.3s;
  animation-delay: 0.3s;
}

.side:nth-child(1) .ring:nth-child(10) {
  margin: 0 0 0 6.6666666667px;
  z-index: 10;
  -webkit-animation-delay: 0.3333333333s;
  animation-delay: 0.3333333333s;
}

.side:nth-child(1) .ring:nth-child(11) {
  margin: 0 0 0 7.3333333333px;
  z-index: 11;
  -webkit-animation-delay: 0.3666666667s;
  animation-delay: 0.3666666667s;
}

.side:nth-child(1) .ring:nth-child(12) {
  margin: 0 0 0 8px;
  z-index: 12;
  -webkit-animation-delay: 0.4s;
  animation-delay: 0.4s;
}

.side:nth-child(1) .ring:nth-child(13) {
  margin: 0 0 0 8.6666666667px;
  z-index: 13;
  -webkit-animation-delay: 0.4333333333s;
  animation-delay: 0.4333333333s;
}

.side:nth-child(1) .ring:nth-child(14) {
  margin: 0 0 0 9.3333333333px;
  z-index: 14;
  -webkit-animation-delay: 0.4666666667s;
  animation-delay: 0.4666666667s;
}

.side:nth-child(1) .ring:nth-child(15) {
  margin: 0 0 0 10px;
  z-index: 15;
  -webkit-animation-delay: 0.5s;
  animation-delay: 0.5s;
}

.side:nth-child(1) .ring:nth-child(16) {
  margin: 0 0 0 10.6666666667px;
  z-index: 16;
  -webkit-animation-delay: 0.5333333333s;
  animation-delay: 0.5333333333s;
}

.side:nth-child(1) .ring:nth-child(17) {
  margin: 0 0 0 11.3333333333px;
  z-index: 17;
  -webkit-animation-delay: 0.5666666667s;
  animation-delay: 0.5666666667s;
}

.side:nth-child(1) .ring:nth-child(18) {
  margin: 0 0 0 12px;
  z-index: 18;
  -webkit-animation-delay: 0.6s;
  animation-delay: 0.6s;
}

.side:nth-child(1) .ring:nth-child(19) {
  margin: 0 0 0 12.6666666667px;
  z-index: 19;
  -webkit-animation-delay: 0.6333333333s;
  animation-delay: 0.6333333333s;
}

.side:nth-child(1) .ring:nth-child(20) {
  margin: 0 0 0 13.3333333333px;
  z-index: 20;
  -webkit-animation-delay: 0.6666666667s;
  animation-delay: 0.6666666667s;
}

.side:nth-child(1) .ring:nth-child(21) {
  margin: 0 0 0 14px;
  z-index: 21;
  -webkit-animation-delay: 0.7s;
  animation-delay: 0.7s;
}

.side:nth-child(1) .ring:nth-child(22) {
  margin: 0 0 0 14.6666666667px;
  z-index: 22;
  -webkit-animation-delay: 0.7333333333s;
  animation-delay: 0.7333333333s;
}

.side:nth-child(1) .ring:nth-child(23) {
  margin: 0 0 0 15.3333333333px;
  z-index: 23;
  -webkit-animation-delay: 0.7666666667s;
  animation-delay: 0.7666666667s;
}

.side:nth-child(1) .ring:nth-child(24) {
  margin: 0 0 0 16px;
  z-index: 24;
  -webkit-animation-delay: 0.8s;
  animation-delay: 0.8s;
}

.side:nth-child(1) .ring:nth-child(25) {
  margin: 0 0 0 16.6666666667px;
  z-index: 25;
  -webkit-animation-delay: 0.8333333333s;
  animation-delay: 0.8333333333s;
}

.side:nth-child(1) .ring:nth-child(26) {
  margin: 0 0 0 17.3333333333px;
  z-index: 26;
  -webkit-animation-delay: 0.8666666667s;
  animation-delay: 0.8666666667s;
}

.side:nth-child(1) .ring:nth-child(27) {
  margin: 0 0 0 18px;
  z-index: 27;
  -webkit-animation-delay: 0.9s;
  animation-delay: 0.9s;
}

.side:nth-child(1) .ring:nth-child(28) {
  margin: 0 0 0 18.6666666667px;
  z-index: 28;
  -webkit-animation-delay: 0.9333333333s;
  animation-delay: 0.9333333333s;
}

.side:nth-child(1) .ring:nth-child(29) {
  margin: 0 0 0 19.3333333333px;
  z-index: 29;
  -webkit-animation-delay: 0.9666666667s;
  animation-delay: 0.9666666667s;
}

.side:nth-child(1) .ring:nth-child(30) {
  margin: 0 0 0 20px;
  z-index: 30;
  -webkit-animation-delay: 1s;
  animation-delay: 1s;
}

.side:nth-child(2) .ring:nth-child(0) {
  margin: 0px 0 0 0px;
  z-index: 30;
  -webkit-animation-delay: 2s;
  animation-delay: 2s;
}

.side:nth-child(2) .ring:nth-child(1) {
  margin: 0.5px 0 0 -0.3333333333px;
  z-index: 29;
  -webkit-animation-delay: 2.0333333333s;
  animation-delay: 2.0333333333s;
}

.side:nth-child(2) .ring:nth-child(2) {
  margin: 1px 0 0 -0.6666666667px;
  z-index: 28;
  -webkit-animation-delay: 2.0666666667s;
  animation-delay: 2.0666666667s;
}

.side:nth-child(2) .ring:nth-child(3) {
  margin: 1.5px 0 0 -1px;
  z-index: 27;
  -webkit-animation-delay: 2.1s;
  animation-delay: 2.1s;
}

.side:nth-child(2) .ring:nth-child(4) {
  margin: 2px 0 0 -1.3333333333px;
  z-index: 26;
  -webkit-animation-delay: 2.1333333333s;
  animation-delay: 2.1333333333s;
}

.side:nth-child(2) .ring:nth-child(5) {
  margin: 2.5px 0 0 -1.6666666667px;
  z-index: 25;
  -webkit-animation-delay: 2.1666666667s;
  animation-delay: 2.1666666667s;
}

.side:nth-child(2) .ring:nth-child(6) {
  margin: 3px 0 0 -2px;
  z-index: 24;
  -webkit-animation-delay: 2.2s;
  animation-delay: 2.2s;
}

.side:nth-child(2) .ring:nth-child(7) {
  margin: 3.5px 0 0 -2.3333333333px;
  z-index: 23;
  -webkit-animation-delay: 2.2333333333s;
  animation-delay: 2.2333333333s;
}

.side:nth-child(2) .ring:nth-child(8) {
  margin: 4px 0 0 -2.6666666667px;
  z-index: 22;
  -webkit-animation-delay: 2.2666666667s;
  animation-delay: 2.2666666667s;
}

.side:nth-child(2) .ring:nth-child(9) {
  margin: 4.5px 0 0 -3px;
  z-index: 21;
  -webkit-animation-delay: 2.3s;
  animation-delay: 2.3s;
}

.side:nth-child(2) .ring:nth-child(10) {
  margin: 5px 0 0 -3.3333333333px;
  z-index: 20;
  -webkit-animation-delay: 2.3333333333s;
  animation-delay: 2.3333333333s;
}

.side:nth-child(2) .ring:nth-child(11) {
  margin: 5.5px 0 0 -3.6666666667px;
  z-index: 19;
  -webkit-animation-delay: 2.3666666667s;
  animation-delay: 2.3666666667s;
}

.side:nth-child(2) .ring:nth-child(12) {
  margin: 6px 0 0 -4px;
  z-index: 18;
  -webkit-animation-delay: 2.4s;
  animation-delay: 2.4s;
}

.side:nth-child(2) .ring:nth-child(13) {
  margin: 6.5px 0 0 -4.3333333333px;
  z-index: 17;
  -webkit-animation-delay: 2.4333333333s;
  animation-delay: 2.4333333333s;
}

.side:nth-child(2) .ring:nth-child(14) {
  margin: 7px 0 0 -4.6666666667px;
  z-index: 16;
  -webkit-animation-delay: 2.4666666667s;
  animation-delay: 2.4666666667s;
}

.side:nth-child(2) .ring:nth-child(15) {
  margin: 7.5px 0 0 -5px;
  z-index: 15;
  -webkit-animation-delay: 2.5s;
  animation-delay: 2.5s;
}

.side:nth-child(2) .ring:nth-child(16) {
  margin: 8px 0 0 -5.3333333333px;
  z-index: 14;
  -webkit-animation-delay: 2.5333333333s;
  animation-delay: 2.5333333333s;
}

.side:nth-child(2) .ring:nth-child(17) {
  margin: 8.5px 0 0 -5.6666666667px;
  z-index: 13;
  -webkit-animation-delay: 2.5666666667s;
  animation-delay: 2.5666666667s;
}

.side:nth-child(2) .ring:nth-child(18) {
  margin: 9px 0 0 -6px;
  z-index: 12;
  -webkit-animation-delay: 2.6s;
  animation-delay: 2.6s;
}

.side:nth-child(2) .ring:nth-child(19) {
  margin: 9.5px 0 0 -6.3333333333px;
  z-index: 11;
  -webkit-animation-delay: 2.6333333333s;
  animation-delay: 2.6333333333s;
}

.side:nth-child(2) .ring:nth-child(20) {
  margin: 10px 0 0 -6.6666666667px;
  z-index: 10;
  -webkit-animation-delay: 2.6666666667s;
  animation-delay: 2.6666666667s;
}

.side:nth-child(2) .ring:nth-child(21) {
  margin: 10.5px 0 0 -7px;
  z-index: 9;
  -webkit-animation-delay: 2.7s;
  animation-delay: 2.7s;
}

.side:nth-child(2) .ring:nth-child(22) {
  margin: 11px 0 0 -7.3333333333px;
  z-index: 8;
  -webkit-animation-delay: 2.7333333333s;
  animation-delay: 2.7333333333s;
}

.side:nth-child(2) .ring:nth-child(23) {
  margin: 11.5px 0 0 -7.6666666667px;
  z-index: 7;
  -webkit-animation-delay: 2.7666666667s;
  animation-delay: 2.7666666667s;
}

.side:nth-child(2) .ring:nth-child(24) {
  margin: 12px 0 0 -8px;
  z-index: 6;
  -webkit-animation-delay: 2.8s;
  animation-delay: 2.8s;
}

.side:nth-child(2) .ring:nth-child(25) {
  margin: 12.5px 0 0 -8.3333333333px;
  z-index: 5;
  -webkit-animation-delay: 2.8333333333s;
  animation-delay: 2.8333333333s;
}

.side:nth-child(2) .ring:nth-child(26) {
  margin: 13px 0 0 -8.6666666667px;
  z-index: 4;
  -webkit-animation-delay: 2.8666666667s;
  animation-delay: 2.8666666667s;
}

.side:nth-child(2) .ring:nth-child(27) {
  margin: 13.5px 0 0 -9px;
  z-index: 3;
  -webkit-animation-delay: 2.9s;
  animation-delay: 2.9s;
}

.side:nth-child(2) .ring:nth-child(28) {
  margin: 14px 0 0 -9.3333333333px;
  z-index: 2;
  -webkit-animation-delay: 2.9333333333s;
  animation-delay: 2.9333333333s;
}

.side:nth-child(2) .ring:nth-child(29) {
  margin: 14.5px 0 0 -9.6666666667px;
  z-index: 1;
  -webkit-animation-delay: 2.9666666667s;
  animation-delay: 2.9666666667s;
}

.side:nth-child(2) .ring:nth-child(30) {
  margin: 15px 0 0 -10px;
  z-index: 0;
  -webkit-animation-delay: 3s;
  animation-delay: 3s;
}

.side:nth-child(3) .ring:nth-child(0) {
  margin: 0px 0 0 0px;
  z-index: 0;
  -webkit-animation-delay: 1s;
  animation-delay: 1s;
}

.side:nth-child(3) .ring:nth-child(1) {
  margin: -0.5px 0 0 -0.3333333333px;
  z-index: 1;
  -webkit-animation-delay: 1.0333333333s;
  animation-delay: 1.0333333333s;
}

.side:nth-child(3) .ring:nth-child(2) {
  margin: -1px 0 0 -0.6666666667px;
  z-index: 2;
  -webkit-animation-delay: 1.0666666667s;
  animation-delay: 1.0666666667s;
}

.side:nth-child(3) .ring:nth-child(3) {
  margin: -1.5px 0 0 -1px;
  z-index: 3;
  -webkit-animation-delay: 1.1s;
  animation-delay: 1.1s;
}

.side:nth-child(3) .ring:nth-child(4) {
  margin: -2px 0 0 -1.3333333333px;
  z-index: 4;
  -webkit-animation-delay: 1.1333333333s;
  animation-delay: 1.1333333333s;
}

.side:nth-child(3) .ring:nth-child(5) {
  margin: -2.5px 0 0 -1.6666666667px;
  z-index: 5;
  -webkit-animation-delay: 1.1666666667s;
  animation-delay: 1.1666666667s;
}

.side:nth-child(3) .ring:nth-child(6) {
  margin: -3px 0 0 -2px;
  z-index: 6;
  -webkit-animation-delay: 1.2s;
  animation-delay: 1.2s;
}

.side:nth-child(3) .ring:nth-child(7) {
  margin: -3.5px 0 0 -2.3333333333px;
  z-index: 7;
  -webkit-animation-delay: 1.2333333333s;
  animation-delay: 1.2333333333s;
}

.side:nth-child(3) .ring:nth-child(8) {
  margin: -4px 0 0 -2.6666666667px;
  z-index: 8;
  -webkit-animation-delay: 1.2666666667s;
  animation-delay: 1.2666666667s;
}

.side:nth-child(3) .ring:nth-child(9) {
  margin: -4.5px 0 0 -3px;
  z-index: 9;
  -webkit-animation-delay: 1.3s;
  animation-delay: 1.3s;
}

.side:nth-child(3) .ring:nth-child(10) {
  margin: -5px 0 0 -3.3333333333px;
  z-index: 10;
  -webkit-animation-delay: 1.3333333333s;
  animation-delay: 1.3333333333s;
}

.side:nth-child(3) .ring:nth-child(11) {
  margin: -5.5px 0 0 -3.6666666667px;
  z-index: 11;
  -webkit-animation-delay: 1.3666666667s;
  animation-delay: 1.3666666667s;
}

.side:nth-child(3) .ring:nth-child(12) {
  margin: -6px 0 0 -4px;
  z-index: 12;
  -webkit-animation-delay: 1.4s;
  animation-delay: 1.4s;
}

.side:nth-child(3) .ring:nth-child(13) {
  margin: -6.5px 0 0 -4.3333333333px;
  z-index: 13;
  -webkit-animation-delay: 1.4333333333s;
  animation-delay: 1.4333333333s;
}

.side:nth-child(3) .ring:nth-child(14) {
  margin: -7px 0 0 -4.6666666667px;
  z-index: 14;
  -webkit-animation-delay: 1.4666666667s;
  animation-delay: 1.4666666667s;
}

.side:nth-child(3) .ring:nth-child(15) {
  margin: -7.5px 0 0 -5px;
  z-index: 15;
  -webkit-animation-delay: 1.5s;
  animation-delay: 1.5s;
}

.side:nth-child(3) .ring:nth-child(16) {
  margin: -8px 0 0 -5.3333333333px;
  z-index: 16;
  -webkit-animation-delay: 1.5333333333s;
  animation-delay: 1.5333333333s;
}

.side:nth-child(3) .ring:nth-child(17) {
  margin: -8.5px 0 0 -5.6666666667px;
  z-index: 17;
  -webkit-animation-delay: 1.5666666667s;
  animation-delay: 1.5666666667s;
}

.side:nth-child(3) .ring:nth-child(18) {
  margin: -9px 0 0 -6px;
  z-index: 18;
  -webkit-animation-delay: 1.6s;
  animation-delay: 1.6s;
}

.side:nth-child(3) .ring:nth-child(19) {
  margin: -9.5px 0 0 -6.3333333333px;
  z-index: 19;
  -webkit-animation-delay: 1.6333333333s;
  animation-delay: 1.6333333333s;
}

.side:nth-child(3) .ring:nth-child(20) {
  margin: -10px 0 0 -6.6666666667px;
  z-index: 20;
  -webkit-animation-delay: 1.6666666667s;
  animation-delay: 1.6666666667s;
}

.side:nth-child(3) .ring:nth-child(21) {
  margin: -10.5px 0 0 -7px;
  z-index: 21;
  -webkit-animation-delay: 1.7s;
  animation-delay: 1.7s;
}

.side:nth-child(3) .ring:nth-child(22) {
  margin: -11px 0 0 -7.3333333333px;
  z-index: 22;
  -webkit-animation-delay: 1.7333333333s;
  animation-delay: 1.7333333333s;
}

.side:nth-child(3) .ring:nth-child(23) {
  margin: -11.5px 0 0 -7.6666666667px;
  z-index: 23;
  -webkit-animation-delay: 1.7666666667s;
  animation-delay: 1.7666666667s;
}

.side:nth-child(3) .ring:nth-child(24) {
  margin: -12px 0 0 -8px;
  z-index: 24;
  -webkit-animation-delay: 1.8s;
  animation-delay: 1.8s;
}

.side:nth-child(3) .ring:nth-child(25) {
  margin: -12.5px 0 0 -8.3333333333px;
  z-index: 25;
  -webkit-animation-delay: 1.8333333333s;
  animation-delay: 1.8333333333s;
}

.side:nth-child(3) .ring:nth-child(26) {
  margin: -13px 0 0 -8.6666666667px;
  z-index: 26;
  -webkit-animation-delay: 1.8666666667s;
  animation-delay: 1.8666666667s;
}

.side:nth-child(3) .ring:nth-child(27) {
  margin: -13.5px 0 0 -9px;
  z-index: 27;
  -webkit-animation-delay: 1.9s;
  animation-delay: 1.9s;
}

.side:nth-child(3) .ring:nth-child(28) {
  margin: -14px 0 0 -9.3333333333px;
  z-index: 28;
  -webkit-animation-delay: 1.9333333333s;
  animation-delay: 1.9333333333s;
}

.side:nth-child(3) .ring:nth-child(29) {
  margin: -14.5px 0 0 -9.6666666667px;
  z-index: 29;
  -webkit-animation-delay: 1.9666666667s;
  animation-delay: 1.9666666667s;
}

.side:nth-child(3) .ring:nth-child(30) {
  margin: -15px 0 0 -10px;
  z-index: 30;
  -webkit-animation-delay: 2s;
  animation-delay: 2s;
}

@-webkit-keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}

@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}
@-webkit-keyframes cromatic {
  0% {
    background-color: #ffff00;
  }
  15% {
    background-color: #008f59;
  }
  30% {
    background-color: #2771b2;
  }
  45% {
    background-color: #6e3795;
  }
  60% {
    background-color: #ff0000;
  }
  75% {
    background-color: #ff9201;
  }
  100% {
    background-color: #ffff00;
  }
}
@keyframes cromatic {
  0% {
    background-color: #ffff00;
  }
  15% {
    background-color: #008f59;
  }
  30% {
    background-color: #2771b2;
  }
  45% {
    background-color: #6e3795;
  }
  60% {
    background-color: #ff0000;
  }
  75% {
    background-color: #ff9201;
  }
  100% {
    background-color: #ffff00;
  }
}
</style>
