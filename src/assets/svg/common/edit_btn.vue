<template>
  <div class="icon-button-div g-unselect">
    <svg t="1744789996360" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
      p-id="4036" width="256" height="256">
      <path
        d="M550.229333 42.666667v85.333333H170.666667a42.666667 42.666667 0 0 0-42.368 37.674667L128 170.666667v682.666666a42.666667 42.666667 0 0 0 37.674667 42.368L170.666667 896h682.666666a42.666667 42.666667 0 0 0 42.368-37.674667L896 853.333333v-380.16h85.333333V853.333333a128 128 0 0 1-120.490666 127.786667L853.333333 981.333333H170.666667a128 128 0 0 1-127.786667-120.490666L42.666667 853.333333V170.666667a128 128 0 0 1 120.490666-127.786667L170.666667 42.666667h379.562666z m418.602667 12.501333a42.666667 42.666667 0 0 1 3.541333 56.32l-3.541333 4.010667-554.666667 554.666666a42.666667 42.666667 0 0 1-63.872-56.32l3.541334-4.010666 554.666666-554.666667a42.666667 42.666667 0 0 1 60.330667 0z"
        fill="#000000" p-id="4037"></path>
      <path
        d="M554.666667 85.333333m-42.666667 0a42.666667 42.666667 0 1 0 85.333333 0 42.666667 42.666667 0 1 0-85.333333 0Z"
        fill="#000000" p-id="4038"></path>
      <path
        d="M938.666667 469.333333m-42.666667 0a42.666667 42.666667 0 1 0 85.333333 0 42.666667 42.666667 0 1 0-85.333333 0Z"
        fill="#000000" p-id="4039"></path>
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
