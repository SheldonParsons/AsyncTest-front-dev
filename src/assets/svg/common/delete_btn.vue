<template>
  <div class="icon-button-div g-unselect">
    <svg
      t="1744794343234"
      class="icon"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="4204"
      width="256"
      height="256"
    >
      <path
        d="M938.666667 170.666667a42.666667 42.666667 0 0 1 0 85.333333h-85.333334v597.333333a128 128 0 0 1-120.490666 127.786667L725.333333 981.333333H298.666667a128 128 0 0 1-127.786667-120.490666L170.666667 853.333333V256H85.333333a42.666667 42.666667 0 1 1 0-85.333333h853.333334z m-170.666667 85.333333H256v597.333333a42.666667 42.666667 0 0 0 37.674667 42.368L298.666667 896h426.666666a42.666667 42.666667 0 0 0 42.368-37.674667L768 853.333333V256z m-341.333333 85.333333a42.666667 42.666667 0 0 1 42.666666 42.666667v341.333333a42.666667 42.666667 0 0 1-85.333333 0V384a42.666667 42.666667 0 0 1 42.666667-42.666667z m170.666666 0a42.666667 42.666667 0 0 1 42.666667 42.666667v341.333333a42.666667 42.666667 0 0 1-85.333333 0V384a42.666667 42.666667 0 0 1 42.666666-42.666667zM341.333333 42.666667h341.333334a42.666667 42.666667 0 0 1 0 85.333333H341.333333a42.666667 42.666667 0 1 1 0-85.333333z"
        fill="#000000"
        p-id="4205"
      ></path>
    </svg>
  </div>
</template>

<script setup></script>
<style lang="scss" scoped>
.icon-button-div {
  display: inline-flex;
  padding: 4px;
  margin: 4px;
  background-color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 1.5rem;
  height: 1.5rem;

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

  > svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2)); // 图标微投影
  }
}
</style>