<template>
<div class="text">Params</div>
</template>

<style scoped lang="scss">body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-content: center;
    background-color: #000;
    font-family: system-ui, sans-serif;
  }
  .text {
    cursor: pointer;
    font-weight: 600;
    font-size: 15px;
    color: #1f202000;
    //-webkit-text-stroke: 1px #1f2020;
    position: relative;
    background-clip: text;
    overflow: clip;
    background-color: #207f56;
    font-family: 'PlayBall';
    &:before, &:after {
      content: '';
      position: absolute;
      //z-index: -1;
      background-color: #3cf5;
      width: 180%;
      top: 50%;
      left: 50%;
      aspect-ratio: 1;
      translate: -50% 0;
      border-top-left-radius: 60% 80%;
      border-top-right-radius: 50% 80%;
      border-bottom-left-radius: 60% 80%;
      border-bottom-right-radius: 50% 80%;
      mix-blend-mode: multiply;
      //background-blend-mode: color;
      animation: rot 10s linear infinite;
    }
    &:after {
      animation-delay: -4s;
      animation-duration: 8s;
    }
  }
  @keyframes rot {
    to {
      rotate: 360deg;
    }
  }
</style>