<template>
  <div class="icon-button-div g-unselect">
    <svg
      t="1745579042030"
      class="icon"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="11367"
    >
      <path
        d="M204.8 512m-76.8 0a76.8 76.8 0 1 0 153.6 0 76.8 76.8 0 1 0-153.6 0Z"
        fill="#000000"
        p-id="11368"
      ></path>
      <path
        d="M512 512m-76.8 0a76.8 76.8 0 1 0 153.6 0 76.8 76.8 0 1 0-153.6 0Z"
        fill="#000000"
        p-id="11369"
      ></path>
      <path
        d="M819.2 512m-76.8 0a76.8 76.8 0 1 0 153.6 0 76.8 76.8 0 1 0-153.6 0Z"
        fill="#000000"
        p-id="11370"
      ></path>
    </svg>
  </div>
</template>

<script setup></script>

<style lang="scss" scoped>
.icon-button-div {
  display: flex;
  justify-content: center;
  align-items: center;
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
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2)); // 图标微投影
  }
}
</style>
