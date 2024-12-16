<template>
  <div class="container">
    <div class="menu-container">
      <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon === 'ai_application',
        }"
        @click="switchRouter('ai_application_ground')"
        style="margin: 0px"
      >
        <img
          class="logo-img g-unselect"
          style="height: inherit; width: 50px"
          src="../../../assets/img/ast_ai_6.png"
          alt=""
        />
      </div>
      <div
        @click="switchRouter('ai_application_ground')"
        class="footer"
        style="border-bottom: 1px solid #e0e0e0"
      >
        <div class="bubbles">
          <div class="bubble"></div>
        </div>
      </div>
      <svg style="display: none">
        <defs>
          <filter id="blob">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            ></feGaussianBlur>
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="
                        1 0 0 0 0  
                        0 1 0 0 0 
                        0 0 1 0 0 
                        0 0 0 10 -3"
            ></feColorMatrix>
          </filter>
        </defs>
      </svg>
      <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon === 'interface',
        }"
        @click="switchRouter('interface')"
      >
        <API class="icon-menu api"></API>
        <span>APIs</span>
      </div>
      <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon === 'data',
        }"
        @click="switchRouter('data')"
      >
        <DATA class="icon-menu api"></DATA>
        <span>Data</span>
      </div>
      <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon.indexOf('mock') !== -1,
        }"
        @click="switchRouter('mockData')"
      >
        <MOCK class="icon-menu api"></MOCK>
        <span>Mock</span>
      </div>
      <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon.indexOf('api') !== -1,
        }"
        @click="switchRouter('apiAuthorization')"
      >
        <OPEN class="icon-menu api"></OPEN>
        <span>Docs</span>
      </div>
      <div
        :class="{
          'ele-container': true,
          'ele-other': true,
          'focuse-icon':
            currentFocuseIcon === 'otherwise' || currentFocuseIcon === 'update',
        }"
        @click="switchRouter('otherwise')"
      >
        <OTHER class="icon-menu api"></OTHER>
        <span>Others</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import API from "@/assets/svg/menu/api.vue";
import MOCK from "@/assets/svg/menu/mock.vue";
import OTHER from "@/assets/svg/menu/other.vue";
import OPEN from "@/assets/svg/menu/open.vue";
import DATA from "@/assets/svg/menu/data.vue";
import tools from "@/utils/tools";
import { useI18n } from "vue-i18n";
const route: any = useRoute();
const router: any = useRouter();
const currentFocuseIcon = ref("data");

onMounted(() => {
  switchRouter(router.currentRoute.value.name);
  createBubbles();
  setInterval(createBubbles, 600);
});

const emit = defineEmits(["switchRouterAction"]);

// 全局对象
const { proxy }: any = getCurrentInstance();
const { t } = useI18n();

function opening() {
  tools.message(t("global.open"), proxy);
}

function switchRouter(routerName: string) {
  emit("switchRouterAction", routerName);
  const params = { project: Number(route.params.project) };
  if (router.currentRoute.value.name !== routerName) {
    router.push({ name: routerName, params });
  }
  currentFocuseIcon.value = routerName;
}

function createBubbles() {
  const bubbles: any = document.querySelector(".bubbles");
  const animationName = getComputedStyle(
    document.querySelector(".bubble")
  ).animationName;
  bubbles.addEventListener("animationend", (e: any) => {
    e.target.remove();
  });

  for (let i = 0; i < 20; i++) {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const s = Math.random() * 12 + 7;
    const x = Math.random() * 50 + 0;
    const d = Math.random() * 3 + 1;
    bubble.style.setProperty("--s", `${s}px`);
    bubble.style.setProperty("--x", `${x}px`);
    bubble.style.setProperty("--d", `${d}s`);
    bubble.style.setProperty("position", "absolute");
    bubble.style.setProperty("border-radius", "50%");
    bubble.style.setProperty("background", "#99d4c7");
    bubble.style.setProperty("width", `${s}px`);
    bubble.style.setProperty("height", `${s}px`);
    bubble.style.setProperty("left", `${x}px`);
    bubble.style.setProperty("top", `50px`);
    bubble.style.filter = "url(#blob)";
    bubble.style.animation = `${animationName} var(--d) ease-in forwards`;
    bubble.animate;

    bubbles.appendChild(bubble);
  }
}
</script>

<style lang="scss" scoped>
.footer {
  height: 1px;
  cursor: pointer;
}
// .bubbles {
//     width: 100px;
// }
.bubble {
  position: absolute;
  --x: 0px;
  --s: 20px;
  --d: 2s;
  border-radius: 50%;
  background: #99d4c7;
  filter: url(#blob);
  width: var(--s);
  height: var(--s);
  left: var(--x);
  top: 50px;
  animation: bubbling var(--d) ease-in forwards;
}
@keyframes bubbling {
  75% {
    transform: scale(1);
  }
  to {
    transform: scale(0);
    top: -200px;
  }
}
.container {
  height: 100%;
}

.menu-container {
  height: inherit;
  display: flex;
  margin-top: 1rem;
  justify-content: top;
  flex-direction: column;
  align-items: center;
}

.icon-menu {
  margin: auto;
}

.ele-container {
  margin: 0.5rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-weight: 400;
  cursor: pointer;

  span {
    text-align: center;
    margin-top: 0.5rem;
    font-size: 14px;
  }
}

.ele-other {
  position: fixed;
  bottom: 10px;
}
</style>

<style lang="scss">
.focuse-icon {
  color: #007a5f;

  .icon-menu {
    .api-path {
      fill: #007a5f !important;
    }
  }
}
.ele-container:hover {
  color: #007a5f;

  .icon-menu {
    .api-path {
      fill: #007a5f !important;
    }
  }
}
</style>
