<template>
  <div class="icon-button-div g-unselect">
    <svg t="1744794389725" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
      p-id="5742" width="256" height="256">
      <path
        d="M934.4 136.3456A38.4 38.4 0 0 1 995.84 182.1952l-2.3552 3.1488-571.5456 689.5104a38.4 38.4 0 0 1-53.8624 5.248l-2.9184-2.6368L28.1344 539.1104a38.4 38.4 0 0 1 51.4816-56.832l2.9184 2.6112L389.76 793.344 934.4 136.3456z"
        fill="#000000" p-id="5743"></path>
    </svg>
  </div>
</template>

<style lang="scss" scoped>
.icon-button-div {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px !important;
  margin: 0px !important;
  background-color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  box-sizing: border-box !important;
  width: 25px !important;
  height: 25px !important;

  /* 悬停效果 */
  &:hover {
    // background-color: #111;
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 255, 0.1); // 添加微光效
    transform: scale(1.1) translateZ(0);
  }

  /* 点击瞬间效果 */
  &:active {
    transform: scale(0.95) translateZ(0);
    // background-color: #000;
    box-shadow: inset 0 1px 3px rgba(255, 255, 255, 0.1),
      // 内阴影模拟按压
      0 1px 2px rgba(0, 0, 0, 0.1);
    transition-duration: 0.1s;
  }

  /* 键盘焦点效果 */
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #000, 0 0 0 4px rgba(255, 255, 255, 0.3);
  }

  >svg {
    width: 14px;
    height: 14px;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2)); // 图标微投影
  }
}
</style>
