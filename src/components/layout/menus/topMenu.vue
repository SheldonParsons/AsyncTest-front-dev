<template>
  <div class="container">
    <div class="menu-container">
      <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon === 'ai_application_ground' || currentFocuseIcon === 'application_conversation',
        }"
        @click="switchRouter('ai_application_ground')"
      >
        <AI class="icon-menu api"></AI>
        <span style="font-size: 12px;display: inline-block;line-height: 1;font-weight: 500;">AI</span>
      </div>
      <el-divider style="width: 30%;margin: 0px;"></el-divider>
      <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon === 'interface',
        }"
        @click="switchRouter('interface')"
      >
        <API class="icon-menu api"></API>
        <span style="font-size: 12px;display: inline-block;line-height: 1;font-weight: 500;">APIs</span>
      </div>
      <el-divider style="width: 30%;margin: 0px;"></el-divider>
      <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon === 'case',
        }"
        @click="switchRouter('case')"
      >
        <Case class="icon-menu api"></Case>
        <span style="font-size: 12px;display: inline-block;line-height: 1;font-weight: 500;">Case</span>
      </div>
      <el-divider style="width: 30%;margin: 0px;"></el-divider>
      <!-- <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon === 'data',
        }"
        @click="switchRouter('data')"
      >
        <DATA class="icon-menu api"></DATA>
        <span>Data</span>
      </div> -->
      <!-- <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon.indexOf('mock') !== -1,
        }"
        @click="switchRouter('mockData')"
      >
        <MOCK class="icon-menu api"></MOCK>
        <span>Mock</span>
      </div> -->
      <!-- <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon.indexOf('api') !== -1,
        }"
        @click="switchRouter('apiAuthorization')"
      >
        <OPEN class="icon-menu api"></OPEN>
        <span>Docs</span>
      </div> -->
      <div
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon.indexOf('settings') !== -1,
        }"
        @click="switchRouter('settings_source_database')"
      >
        <SETTING class="icon-menu api"></SETTING>
        <span style="font-size: 12px;display: inline-block;line-height: 1;font-weight: 500;">Settings</span>
      </div>
      <el-divider style="width: 30%;margin: 0px;"></el-divider>
      <div
      v-if="showMenu"
        :class="{
          'ele-container': true,
          'focuse-icon': currentFocuseIcon.indexOf('audit') !== -1,
        }"
        @click="switchRouter('audit')"
      >
        <AUDIT class="icon-menu api"></AUDIT>
        <span style="font-size: 12px;display: inline-block;line-height: 1;font-weight: 500;">Audit</span>
      </div>
      <!-- <div
        :class="{
          'ele-container': true,
          'ele-other': true,
          'focuse-icon':
            currentFocuseIcon === 'otherwise' || currentFocuseIcon === 'update',
        }"
        @click="switchRouter('otherwise')"
      >
        <OTHER class="icon-menu api"></OTHER>
        <span>Tools</span>
      </div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import API from "@/assets/svg/menu/api.vue";
import Case from "@/assets/svg/menu/case.vue";
import AI from "@/assets/svg/menu/ai.vue";
import MOCK from "@/assets/svg/menu/mock.vue";
import OTHER from "@/assets/svg/menu/other.vue";
import OPEN from "@/assets/svg/menu/open.vue";
import DATA from "@/assets/svg/menu/data.vue";
import AUDIT from "@/assets/svg/menu/audit.vue";
import SETTING from "@/assets/svg/menu/setting.vue";
import AiLogo from "@/components/layout/menus/child/icon/ai_logo.vue"
import tools from "@/utils/tools";
import { useStore } from "@/store";
import { useI18n } from "vue-i18n";

const showMenu = ref(false);
const store = useStore();
const route: any = useRoute();
const router: any = useRouter();
const currentFocuseIcon = ref("data");

watch(() => route.name, (newName, oldName) => {
  currentFocuseIcon.value = newName;
});

onMounted(() => {
  switchRouter(router.currentRoute.value.name);
  // createBubbles();
  // setInterval(createBubbles, 600);
  store.dispatch("getUser").then((res: any) => {
      if (res && res.username) {
        if (["a80646"].indexOf(res.username) !== -1) {
          showMenu.value = true
        }
      }
    });
});

defineExpose({
  change_focus
})

function change_focus(menu: string) {
  currentFocuseIcon.value = menu;
}

const emit = defineEmits(["switchRouterAction"]);

// 全局对象
const { proxy }: any = getCurrentInstance();
const { t } = useI18n();

function opening() {
  tools.message(t("global.open"), proxy);
}

function switchRouter(routerName: string) {
  if (window.location.hostname !== 'localhost' && routerName === "case") {
    tools.message('开发中，敬请期待', proxy, 'info');
    return
  }
  emit("switchRouterAction", routerName);
  const params = { project: Number(route.params.project) };
  if (router.currentRoute.value.name !== routerName) {
    router.push({ name: routerName, params });
  }
  currentFocuseIcon.value = routerName;
}

// function createBubbles() {
//   const bubbles: any = document.querySelector(".bubbles");
//   const animationName = getComputedStyle(
//     document.querySelector(".bubble")
//   ).animationName;
//   bubbles.addEventListener("animationend", (e: any) => {
//     e.target.remove();
//   });

//   for (let i = 0; i < 20; i++) {
//     const bubble = document.createElement("div");
//     bubble.className = "bubble";
//     const s = Math.random() * 12 + 7;
//     const x = Math.random() * 50 + 0;
//     const d = Math.random() * 3 + 1;
//     bubble.style.setProperty("--s", `${s}px`);
//     bubble.style.setProperty("--x", `${x}px`);
//     bubble.style.setProperty("--d", `${d}s`);
//     bubble.style.setProperty("position", "absolute");
//     bubble.style.setProperty("border-radius", "50%");
//     bubble.style.setProperty("background", "#99d4c7");
//     bubble.style.setProperty("width", `${s}px`);
//     bubble.style.setProperty("height", `${s}px`);
//     bubble.style.setProperty("left", `${x}px`);
//     bubble.style.setProperty("top", `50px`);
//     bubble.style.filter = "url(#blob)";
//     bubble.style.animation = `${animationName} var(--d) ease-in forwards`;
//     bubble.animate;

//     bubbles.appendChild(bubble);
//   }
// }
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
  color: black;
  span {
    font-weight: 600;
    font-family: "Poppins", sans-serif;
  }

  .icon-menu {
    .api-path {
      fill: black !important;
    }
  }
}
.ele-container:hover {
  color: black;

  .icon-menu {
    .api-path {
      fill: black !important;
    }
  }
}
</style>
