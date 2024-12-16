<template>
  <div class="load">
    <hr />
    <hr />
    <hr />
    <hr />
  </div>
</template>
<style lang="scss" scoped>
.load {
  position: absolute;
  top: 50%;
  right:10%;
  transform: translate(-50%, -50%);
  /*change these sizes to fit into your project*/
  width: 20px;
  height: 20px;
}
.load hr {
  border: 0;
  margin: 0;
  width: 40%;
  height: 40%;
  position: absolute;
  border-radius: 50%;
  animation: spin 2s ease infinite;
}

.load :first-child {
  background: #00CC00;
  animation-delay: -1.5s;
}
.load :nth-child(2) {
  background: #009999;
  animation-delay: -1s;
}
.load :nth-child(3) {
  background: #FF7400;
  animation-delay: -0.5s;
}
.load :last-child {
  background: #FF0000;
}

@keyframes spin {
  0%,
  100% {
    transform: translate(0);
  }
  25% {
    transform: translate(160%);
  }
  50% {
    transform: translate(160%, 160%);
  }
  75% {
    transform: translate(0, 160%);
  }
}
</style>
