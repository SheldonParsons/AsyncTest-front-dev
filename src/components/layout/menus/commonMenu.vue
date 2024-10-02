<template>
  <div class="container">
    <el-scrollbar style="height: 100%" class="sidebar">
      <div
        style="
          margin-bottom: 5px;
          margin-left: 5px;
          margin-top: 5px;
          font-size: 14px;
          font-weight: 300;
          color: gray;
        "
      >
        {{ $t('menu.news') }}
      </div>
      <div style="width: 180px; height: 70px; margin-bottom: 25px">
        <MockBox :fixSize="true" :shouldTurn="true"></MockBox>
      </div>
      <div class="sidebar-groups">
        <Interface
        v-if="routeName === 'interface'"
        :activeLinkStyle="activeLinkStyle" 
        @switchRouterAction ="switchRouter"></Interface>
        <Data 
        v-if="routeName === 'data'"
        :activeLinkStyle="activeLinkStyle" 
        @switchRouterAction ="switchRouter"></Data>
        <Mock 
        v-if="routeName.indexOf('mock') !== -1"
        :activeLinkStyle="activeLinkStyle" 
        @switchRouterAction ="switchRouter"></Mock>
        <Open
        v-if="routeName.indexOf('api') !== -1"
        :activeLinkStyle="activeLinkStyle" 
        @switchRouterAction ="switchRouter"
        ></Open>
        <Otherwise 
        v-if="routeName === 'otherwise' || routeName === 'update'"
        :activeLinkStyle="activeLinkStyle" 
        @switchRouterAction ="switchRouter" ></Otherwise>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, getCurrentInstance } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// import X2E from '@/views/otherwise/tools/X2E.vue'
import MockBox from '@/views/otherwise/tools/MockBox.vue'
import tools from '@/utils/tools'
import { useI18n } from 'vue-i18n'
import { useStore } from '@/store'
import Data from "./child/dataMenu.vue"
import Mock from './child/mockMenu.vue'
import Open from './child/openMenu.vue'
import Otherwise from './child/otherwiseMenu.vue'
import Interface from './child/interfaceMenu.vue'
const activeLinkStyle = ref('')
const router: any = useRouter()
const route: any = useRoute()
const store = useStore()

const { t } = useI18n()

const authLevel = ref(0)

// 全局对象
const { proxy }: any = getCurrentInstance()
onMounted(() => {
  switchMenu(router.currentRoute.value.name)
  checkAuth(1).then((data: any) => {
    authLevel.value = data
  })
})
const props = defineProps({
  routeName: {
        type: String,
        default: 'data'
    }
})
router.beforeEach((to: any, from: any, next: any) => {
  switchMenu(to.name)
  next()
})
async function checkAuth(type: Number = 1) {
  if (type === 1) {
    return await store.dispatch('getUser').then((res: any) => {
      if (res && res.username) {
        if (['a80646', '180230', 'a80308'].indexOf(res.username) !== -1) {
          return 1
        }
      }
    })
  }
  return 0
}

function switchMenu(routerName: string) {
  activeLinkStyle.value = routerName
}

function switchRouter(routerName: string) {
  console.log(routerName);
  
  const params = { project: Number(route.params.project) }
  console.log(routerName)

  if (routerName === '3') {
    tools.message(t('global.open'), proxy)
    return
  }
  if (router.currentRoute.value.name !== routerName) {
    router.push({ name: routerName, params })
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
.sidebar .sidebar-groups .sidebar-group + .sidebar-group {
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
      padding: 0px 30px 0rem 0px;
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
