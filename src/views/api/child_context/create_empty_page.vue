<template>
  <div class="create-container">
    <div :class="['container', { expanded: showAll }]">
      <div class="list">
        <div class="list-item" @click="enterPage('api')">
          <div class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
                stroke-width="2"
              />
              <path d="M13 2v7h7" stroke-width="2" />
            </svg>
          </div>
          <div class="content">
            <div class="title">Interface</div>
            <div class="subtitle">创建接口文档</div>
          </div>
          <div class="date">点击进入</div>
        </div>

        <div class="list-item">
          <div class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                stroke-width="2"
              />
              <circle cx="12" cy="10" r="3" stroke-width="2" />
            </svg>
          </div>
          <div class="content">
            <div class="title">Local Data</div>
            <div class="subtitle">接口数据集</div>
          </div>
          <div class="date">敬请期待...</div>
        </div>

        <div class="list-item">
          <div class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"
                stroke-width="2"
              />
            </svg>
          </div>
          <div class="content">
            <div class="title">Fast Interface</div>
            <div class="subtitle">快捷接口</div>
          </div>
          <div class="date">敬请期待...</div>
        </div>
      </div>

      <button class="show-hide-btn">
        <span class="show">Show All</span>
        <span class="hide">Hide</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from "vue";
import tools from "@/utils/tools";
const showAll = ref(false);
const { proxy }: any = getCurrentInstance();
const emit = defineEmits(["go_page"]);
onMounted(() => {
  const showHideBtn: any = document.querySelector(".show-hide-btn");
  const container: any = document.querySelector(".container");
  showHideBtn.addEventListener("click", () => {
    // tools.message("暂未开放，敬请期待", proxy);
    document.startViewTransition(() => {
      showAll.value = !showAll.value;
    });
  });
});

function enterPage(t: String) {
  if (t === "api") {
    emit("go_page", t);
  }
}
</script>

<style scoped lang="scss">
.create-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center; /* 垂直居中 */
  height: calc(100vh - 200px);
}

.container {
  background: white;
  border-radius: 24px;
  padding: 24px;
  width: 400px;
//   margin-bottom: 300px;
  box-shadow: rgba(0, 0, 0, 0.1) 1px 1px 1px 1px,
    rgba(0, 0, 0, 0.1) 0px 0px 0px 0px, 
    rgba(0, 0, 0, 0.1) -6px -6px 6px 0px,
    rgba(0, 0, 0, 0.1) 4px 4px 4px 4px;
  view-transition-name: container;

  .list-item:nth-child(1) {
    margin-bottom: -21.5%;
  }

  .list-item:nth-child(2) {
    margin-bottom: -21.5%;
    transform: scale(0.95);
  }

  .list-item:nth-child(3) {
    transform: scale(0.9);
  }

  .hide {
    display: none;
  }

  &.expanded {
    .list-item:nth-child(1),
    .list-item:nth-child(2) {
      margin-bottom: 0;
      transform: scale(1);
    }

    .list-item:nth-child(3) {
      transform: scale(1);
    }

    .show {
      display: none;
    }

    .hide {
      display: block;
    }

    .show-hide-btn svg {
      transform: rotate(180deg);
      transition: transform 0.6s;
    }
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  view-transition-name: list;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 16px;
  border: 1px solid #e4e4e7;
  cursor: pointer;
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px;
}

.list-item:nth-child(1) {
  view-transition-name: list-item-1;
  z-index: 2;
}

.list-item:nth-child(2) {
  view-transition-name: list-item-2;
  z-index: 1;
}

.list-item:nth-child(3) {
  view-transition-name: list-item-3;
  z-index: 0;
}

.icon {
  width: 48px;
  height: 48px;
  background: #18181b;
  border-radius: 12px;
  display: grid;
  place-items: center;
}

.icon svg {
  width: 24px;
  height: 24px;
  color: white;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.title {
  font-size: 16px;
  font-weight: 500;
  color: #18181b;
}

.subtitle {
  font-size: 14px;
  color: #71717a;
}

.date {
  font-size: 14px;
  color: #71717a;
  text-align: right;
}

.show-hide-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  margin: 8px auto 0 auto;
  width: 140px;
  background: none;
  color: #71717a;
  border: 1px solid #e4e4e7;
  border-radius: 24px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  view-transition-name: show-hide-btn;

  span {
    display: inline-block;
    text-align: center;
    width: fit-content;
  }

  svg {
    transition: transform 0.3s;
    view-transition-name: show-hide-btn-icon;
  }
}

.container.expanded .show-hide-btn svg {
  transform: rotate(-180deg);
}

.show,
.hide {
  width: fit-content;
  view-transition-name: button-label;
}

@keyframes fade-out {
  0% {
    opacity: 1;
  }
  10% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

::view-transition-group(*) {
  animation-duration: 0.6s;
  animation-timing-function: linear(
    0,
    0.402 7.4%,
    0.711 15.3%,
    0.929 23.7%,
    1.008 28.2%,
    1.067 33%,
    1.099 36.9%,
    1.12 41%,
    1.13 45.4%,
    1.13 50.1%,
    1.111 58.5%,
    1.019 83.2%,
    1.004 91.3%,
    1
  );
}

::view-transition-old(*),
::view-transition-new(*) {
  height: 100%;
}

::view-transition-old(button-label),
::view-transition-new(button-label) {
  width: fit-content;
}

::view-transition-old(button-label) {
  animation-name: fade-out;
  animation-duration: 0.6s;
}
</style>
