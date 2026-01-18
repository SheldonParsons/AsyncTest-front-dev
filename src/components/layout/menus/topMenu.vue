<template>
  <div class="sidebar-container">
    <div class="menu-modern">
      <!-- Menu Items -->
      <div v-for="(item, index) in menuItems" :key="item.name"
        :class="['menu-item', { 'menu-item-active': isActive(item.route) }]"
        :style="{ animationDelay: `${index * 0.05}s` }" @click="switchRouter(item.route)">
        <div class="menu-item-inner">
          <div class="icon-wrapper">
            <component :is="item.icon" class="menu-icon"></component>
            <div class="icon-glow"></div>
          </div>
          <span class="menu-label">{{ item.label }}</span>
        </div>
        <div class="menu-item-indicator"></div>
      </div>

      <!-- Divider -->
      <div class="menu-divider"></div>

      <!-- Settings -->
      <div :class="['menu-item', { 'menu-item-active': isActive('settings') }]" style="animation-delay: 0.15s"
        @click="switchRouter('settings_source_database')">
        <div class="menu-item-inner">
          <div class="icon-wrapper">
            <SETTING class="menu-icon"></SETTING>
            <div class="icon-glow"></div>
          </div>
          <span class="menu-label">Settings</span>
        </div>
        <div class="menu-item-indicator"></div>
      </div>

      <!-- Divider -->
      <div class="menu-divider"></div>

      <!-- Audit (conditional) -->
      <div v-if="showMenu" :class="['menu-item', { 'menu-item-active': isActive('audit') }]"
        style="animation-delay: 0.2s" @click="switchRouter('audit')">
        <div class="menu-item-inner">
          <div class="icon-wrapper">
            <AUDIT class="menu-icon"></AUDIT>
            <div class="icon-glow"></div>
          </div>
          <span class="menu-label">Audit</span>
        </div>
        <div class="menu-item-indicator"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, ref, watch, computed } from "vue";
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

// Menu items configuration
const menuItems = [
  { name: 'ai', label: 'AI', icon: AI, route: 'ai_application_ground' },
  { name: 'apis', label: 'APIs', icon: API, route: 'interface' },
  { name: 'case', label: 'Case', icon: Case, route: 'case' },
];

// Check if route is active
const isActive = (routeName: string) => {
  if (routeName === 'settings') {
    return currentFocuseIcon.value.indexOf('settings') !== -1;
  }
  if (routeName === 'audit') {
    return currentFocuseIcon.value.indexOf('audit') !== -1;
  }
  if (routeName === 'ai_application_ground') {
    return currentFocuseIcon.value === 'ai_application_ground' || currentFocuseIcon.value === 'application_conversation';
  }
  return currentFocuseIcon.value === routeName;
};

watch(() => route.name, (newName, oldName) => {
  currentFocuseIcon.value = newName;
});

onMounted(() => {
  switchRouter(router.currentRoute.value.name);
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
  if (routerName === 'ai_application_ground') {
    tools.message('功能升级中，暂时停用，敬请期待', proxy, 'info');
    return
  }
  const params = { project: Number(route.params.project) };
  console.log(router.currentRoute.value.name);
  console.log(routerName);
  
  
  if (router.currentRoute.value.name !== routerName) {
    router.push({ name: routerName, params }).then(() => {
      console.log("999999");
      
      emit("switchRouterAction", routerName);
    }).catch((err:any) => {
      console.log("err");
      console.log(err);
      
    })
  } else {
    emit("switchRouterAction", routerName);
    currentFocuseIcon.value = routerName;
  }
}
</script>

<style lang="scss" scoped>
.sidebar-container {
  height: 100%;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
}

.menu-modern {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  gap: 4px;
}

// Menu Item
.menu-item {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeIn 0.4s ease backwards;
  background: transparent;
  overflow: visible;

  // 旋转的渐变边框
  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 12px;
    padding: 1px;
    background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7, #10b981);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  // 旋转的光晕背景
  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 12px;
    background: conic-gradient(from 0deg,
        transparent 0deg,
        rgba(16, 185, 129, 0.15) 90deg,
        rgba(52, 211, 153, 0.2) 180deg,
        rgba(16, 185, 129, 0.15) 270deg,
        transparent 360deg);
    opacity: 0;
    animation: rotate 3s linear infinite;
    animation-play-state: paused;
    filter: blur(8px);
  }

  &:hover {
    background: rgba(16, 185, 129, 0.06);

    .icon-wrapper {
      transform: translateY(-1px) rotate(8deg);

      .menu-icon {
        animation: iconBounce 0.6s ease;
      }
    }

    .icon-glow {
      opacity: 1;
    }

    .menu-label {
      color: #059669;
      animation: labelFloat 0.6s ease;
    }
  }

  &:active {
    transform: scale(0.96);
  }
}

.menu-item-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  position: relative;
  z-index: 1;
}

// Icon Wrapper
.icon-wrapper {
  position: relative;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.menu-icon {
  width: 22px;
  height: 22px;
  transition: all 0.25s ease;
}

.icon-glow {
  position: absolute;
  inset: -6px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.25s ease;
  filter: blur(6px);
  pointer-events: none;
}

// Menu Label
.menu-label {
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
  text-align: center;
  line-height: 1;
  transition: color 0.25s ease;
  letter-spacing: 0.2px;
  white-space: nowrap;
}

// Active State
.menu-item-active {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.06));

  .menu-item-indicator {
    opacity: 1;
    width: 3px;
  }

  .icon-glow {
    opacity: 0.8;
  }

  .menu-label {
    color: #059669;
    font-weight: 600;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(52, 211, 153, 0.08));
  }
}

// Active Indicator
.menu-item-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 32px;
  background: linear-gradient(180deg, #10b981, #34d399);
  border-radius: 0 2px 2px 0;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// Divider
.menu-divider {
  width: 32px;
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
  margin: 6px 0;
  border-radius: 1px;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.6), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }

  &:hover {
    background: rgba(16, 185, 129, 0.2);
    width: 40px;

    &::before {
      transform: translateX(100%);
    }
  }
}

// Animations
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {

  0%,
  100% {
    opacity: 0.8;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes iconBounce {

  0%,
  100% {
    transform: translateY(-1px) rotate(8deg);
  }

  25% {
    transform: translateY(-3px) rotate(-5deg);
  }

  50% {
    transform: translateY(-1px) rotate(8deg);
  }

  75% {
    transform: translateY(-2px) rotate(5deg);
  }
}

@keyframes labelFloat {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-2px);
  }
}
</style>

<style lang="scss">
// Global styles for icon paths
.menu-item {
  .menu-icon {
    .api-path {
      fill: #64748b;
      transition: fill 0.25s ease;
    }
  }

  &:hover .menu-icon .api-path {
    fill: #059669;
  }

  &.menu-item-active .menu-icon .api-path {
    fill: #059669;
  }
}
</style>
