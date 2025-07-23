<template>
  <div class="container">
    <div style="height: 100%;overflow: hidden;" ref="sidebarRef" class="sidebar">
      <div style="
          margin-bottom: 5px;
          margin-left: 5px;
          margin-top: 5px;
          font-size: 14px;
          font-weight: 300;
          color: gray;
        ">
        {{ $t("menu.news") }}
      </div>
      <div style="width: 100%; height: 80px; margin-bottom: 25px;min-width: 290px;max-width: 400px;">
        <MockBox @changeMenu="changeSubMenu" :fixSize="true" :shouldTurn="true"></MockBox>
      </div>
      <div class="sidebar-groups">
        <Interface v-if="routeName === 'interface'" :activeLinkStyle="activeLinkStyle" :apiItem="apiItem"
          @switchRouterAction="switchRouter" @changeMenu="changeMenu"></Interface>
        <Case @changeMenu="changeMenu" v-if="routeName === 'case'"></Case>
        <Data v-if="routeName === 'data'" :activeLinkStyle="activeLinkStyle" @switchRouterAction="switchRouter"></Data>
        <AI v-if="routeName.indexOf('ai') !== -1" :activeLinkStyle="activeLinkStyle" @switchRouterAction="switchRouter">
        </AI>
        <AppConversation v-if="routeName.indexOf('application_conversation') !== -1" @switchRouterAction="switchRouter">
        </AppConversation>
        <Mock v-if="routeName.indexOf('mock') !== -1" :activeLinkStyle="activeLinkStyle"
          @switchRouterAction="switchRouter"></Mock>
        <Open v-if="routeName.indexOf('api') !== -1" :activeLinkStyle="activeLinkStyle"
          @switchRouterAction="switchRouter"></Open>
        <Otherwise v-if="routeName === 'otherwise' || routeName === 'update'" :activeLinkStyle="activeLinkStyle"
          @switchRouterAction="switchRouter"></Otherwise>
        <Audit v-if="routeName.indexOf('audit') !== -1" :activeLinkStyle="activeLinkStyle"
          @switchRouterAction="switchRouter">
        </Audit>
        <Settings v-if="routeName.indexOf('settings') !== -1" :activeLinkStyle="activeLinkStyle"
          @switchRouterAction="switchRouter"></Settings>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from "vue";
import { useRouter, useRoute } from "vue-router";
import MockBox from "@/views/otherwise/tools/MockBox.vue";
import tools from "@/utils/tools";
import { useI18n } from "vue-i18n";
import { useStore } from "@/store";
import Data from "./child/dataMenu.vue";
import Mock from "./child/mockMenu.vue";
import Open from "./child/openMenu.vue";
import Otherwise from "./child/otherwiseMenu.vue";
import Interface from "./child/interfaceMenu.vue";
import Case from './child/caseMenu.vue'
import AI from "./child/ai_menu.vue";
import AppConversation from "./child/app_conversation.vue";
import Audit from "./child/auditMenu.vue";
import Settings from "./child/settingsMenu.vue";
const activeLinkStyle = ref("");
const router: any = useRouter();
const route: any = useRoute();
const store = useStore();

const { t } = useI18n();

const authLevel = ref(0);

const sidebarRef: any = ref(null)

// 全局对象
const { proxy }: any = getCurrentInstance();
const emit = defineEmits(["changeMenu", "change_sub_menu"]);
onMounted(() => {
  switchMenu(router.currentRoute.value.name);
  checkAuth(1).then((data: any) => {
    authLevel.value = data;
  });
});
const props = defineProps({
  routeName: {
    type: String,
    default: "data",
  },
  apiItem: {
    type: Object,
    default: () => {
      return {};
    }
  }
});
router.beforeEach((to: any, from: any, next: any) => {
  switchMenu(to.name);
  next();
});

function changeSubMenu(menu: string) {
  emit("change_sub_menu", menu);
}

async function checkAuth(type: Number = 1) {
  if (type === 1) {
    return await store.dispatch("getUser").then((res: any) => {
      if (res && res.username) {
        if (["a80646", "180230", "a80308"].indexOf(res.username) !== -1) {
          return 1;
        }
      }
    });
  }
  return 0;
}

function changeMenu(data: any) {
  emit("changeMenu", data);
}

function switchMenu(routerName: string) {
  activeLinkStyle.value = routerName;
}

function switchRouter(routerName: string, call_back: any = () => { }) {
  const params = { project: Number(route.params.project) };
  if (routerName === "3") {
    tools.message(t("global.open"), proxy);
    return;
  }
  if (router.currentRoute.value.name !== routerName) {
    router.push({ name: routerName, params }).then(() => {
      call_back()
    });
  } else {
    call_back()
  }
}
</script>

<style lang="scss" scoped>
* {
  box-sizing: border-box;
}

a {
  cursor: pointer;
}

.sidebar .sidebar-groups .sidebar-group+.sidebar-group {
  padding-top: 24px;
}

.container::-webkit-scrollbar {
  display: none;
}

.container {
  width: 100%;
  height: 100%;

  // .container::-webkit-scrollbar {
  //   display: none;
  // }
  .sidebar {
    --el-scrollbar-bg-color: transparent;

    .sidebar-groups {
      height: 100%;

      // padding: 0px 30px 0rem 0px;
      .sidebar-group {
        .sidebar-group__title {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 8px;
          line-height: 24px;
          color: rgb(48, 49, 51);
        }

        .sidebar-group__title:first-child {
          margin-top: 0;
        }

        .link {
          display: block;
          padding: 10px 16px 10px 26px;
          line-height: 1.5;
          font-size: 0.9rem;
          border-radius: 8px;
          font-weight: 500;
          text-decoration: inherit;
          touch-action: manipulation;
        }

        .link.active .link-text {
          font-weight: 600;
          color: var(--global-theme-color);
          transition: color 0.25s;
        }

        .link.active {
          background-color: var(--global-theme-color-rgb);
        }

        .link-text {
          margin: 0;
          line-height: 20px;
          font-size: 13px;
          font-weight: 500;
          color: #606266;
          transition: color 0.5s;
        }

        .link:hover,
        .link:focus {
          .link-text {
            color: var(--global-theme-color);
          }
        }
      }
    }
  }
}
</style>
