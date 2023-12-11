<template>
  <div class="container-wave">
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
    <div class="wave"></div>
  </div>
</template>

<script setup></script>

<style lang="scss" scoped>
// fun to customize, guaranteed. act now.
$size: 50px; // project size
$max-w: 10em; // biggest wave
$min-w: 0.25em; // smallest wave
$r: $max-w - $min-w; // width range
$speed: 1500ms; // wave speed
$f: 20; // number of waves
$s-w: 0.2em; // wave width
$c: #1abc9c; // wave color

body {
  background: #2c3e50;
}

.container-wave {
  position: relative;
  width: $max-w;
  height: calc($max-w / 2) + 1;
  font-size: calc($size / ($max-w / 1em));
  overflow: hidden;
}

.wave {
  border-width: $s-w;
  border-style: solid;
  position: absolute;
  animation: wave $speed infinite alternate;
  transform: rotate(-44.5deg);
  $a: 1; // alpha
  @for $i from 1 through $f {
    &:nth-child(#{$i}) {
      $w: $max-w - (calc($r/$f) * $i);
      @if $i > 1 {
        $a: 1 - (calc(1 / ($f + 1)) * $i);
      }
      width: $w;
      height: $w;
      bottom: calc($w / 2) * -1;
      left: calc($max-w - $w) / 2;
      animation-delay: $i * calc($speed / $f);
      border-color: transparent transparent rgba($c, $a) rgba($c, $a);
      border-radius: $w;
    }
  }
}

@keyframes wave {
  to {
    transform: rotate(135deg);
  }
}
</style>
