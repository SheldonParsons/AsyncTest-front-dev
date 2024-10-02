<template>
  <section>
    <span class="loader-11"></span>
  </section>
</template>

<script setup></script>

<style lang="scss" scoped>
$base: #fff;
$lite: var(--el-color-primary-light-8);
$brand: #009879;
*,
*:after,
*:before {
  box-sizing: border-box;
}
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

/* Track */
::-webkit-scrollbar-track {
  // background: $base;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: $brand;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #fff;
}
// body {
//   margin: 0;
//   padding-top: 50px;
//   display: flex;
//   flex-wrap: wrap;
//   background: $base;
//   &.pop {
//     overflow: hidden;
//   }
// }
section {
  min-width: 200px;
  min-height: 350px;
  width: 100%;
  height: 100%;
  padding: 10px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  cursor: pointer;
  transition: 0.3s linear;
  &:nth-child(2n + 1) {
    // background: rgba(#000, 0.1);
  }
  // &:hover {
  //   background: rgba(#000, 0.3);
  // }

  @media (max-width: 768px) {
    width: 50%;
  }
  @media (max-width: 480px) {
    width: 100%;
  }
}

@keyframes rotationBack {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(-360deg);
  }
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loader-12 {
  width: 48px;
  height: 48px;
  border: 3px dotted $lite;
  border-style: solid solid dotted dotted;
  border-radius: 50%;
  display: inline-block;
  position: relative;
  animation: rotation 2s linear infinite;
  &:after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    margin: auto;
    border: 3px dotted $brand;
    border-style: solid solid dotted;
    width: 48px/2;
    height: 48px/2;
    border-radius: 50%;
    animation: rotationBack 1s linear infinite;
    transform-origin: center center;
  }
}

.loader-11 {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: inline-block;
  position: relative;
  border: 3px solid;
  border-color: $lite $lite transparent transparent;
  animation: rotation 1s linear infinite;
  &:after,
  &:before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    margin: auto;
    border: 3px solid;
    border-color: transparent transparent $brand $brand;
    width: 48px - 8px;
    height: 48px - 8px;
    border-radius: 50%;
    animation: rotationBack 0.5s linear infinite;
    transform-origin: center center;
  }
  &:before {
    width: 48px - 16px;
    height: 48px - 16px;
    border-color: $lite $lite transparent transparent;
    animation: rotation 1.5s linear infinite;
  }
}

.loader-13 {
  width: 48px;
  height: 48px;
  border: 2px solid $lite;
  border-radius: 50%;
  display: inline-block;
  position: relative;
  animation: rotation 1s linear infinite;
  &:after {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    background: $brand;
    width: 3px;
    height: 48px/2;
    transform: translateX(-50%);
  }
}

.loader-16 {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: inline-block;
  position: relative;
  background: linear-gradient(
    0deg,
    rgba($brand, 0.2) 33%,
    rgba($brand, 1) 100%
  );
  animation: rotation 1s linear infinite;
  &:after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 48px - 6px;
    height: 48px - 6px;
    border-radius: 50%;
    background: $base;
  }
}
</style>
