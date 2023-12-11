<template>
  <div class="container">
    <el-scrollbar style="height: 100%" class="sidebar">
      <div
        style="
          margin-bottom: 10px;
          margin-left: 5px;
          font-size: 14px;
          font-weight: 300;
          color: gray;
        "
      >
        {{ $t('menu.news') }}
      </div>
      <div style="width: 180px; height: 70px; margin-bottom: 40px">
        <MockBox :fixSize="true" :shouldTurn="true"></MockBox>
      </div>
      <!-- 滚动条要包裹的内容 -->
      <!-- <div class="production">production</div> -->
      <div class="sidebar-groups">
        <section class="sidebar-group">
          <p class="sidebar-group__title">{{ $t('menu.level1.father') }}</p>
          <a
            class="link"
            :class="{ active: 'data' === activeLinkStyle }"
            @click="
              switchRouter('data', { project: Number(route.params.project) })
            "
          >
            <p class="link-text">{{ $t('menu.level1.child.a') }}</p>
          </a>
        </section>
        <section class="sidebar-group">
          <p class="sidebar-group__title">{{ $t('menu.level2.father') }}</p>
          <a
            class="link"
            :class="{ active: 'mockData' === activeLinkStyle }"
            @click="
              switchRouter('mockData', {
                project: Number(route.params.project)
              })
            "
          >
            <p class="link-text">{{ $t('menu.level2.child.a') }}</p>
          </a>
          <a
            class="link"
            :class="{ active: 'mockRecord' === activeLinkStyle }"
            @click="
              switchRouter('mockRecord', {
                project: Number(route.params.project)
              })
            "
          >
            <p class="link-text">{{ $t('menu.level2.child.b') }}</p>
          </a>
        </section>
        <section class="sidebar-group">
          <p class="sidebar-group__title">{{ $t('menu.level3.father') }}</p>
          <a
            class="link"
            :class="{ active: 'apiAuthorization' === activeLinkStyle }"
            @click="
              switchRouter('apiAuthorization', {
                project: Number(route.params.project)
              })
            "
          >
            <p class="link-text">{{ $t('menu.level3.child.a') }}</p>
          </a>
          <a
            class="link"
            :class="{ active: 'apiData' === activeLinkStyle }"
            @click="
              switchRouter('apiData', {
                project: Number(route.params.project)
              })
            "
          >
            <p class="link-text">{{ $t('menu.level3.child.b') }}</p>
          </a>
          <a
            class="link"
            :class="{ active: 'apiMock' === activeLinkStyle }"
            @click="
              switchRouter('apiMock', {
                project: Number(route.params.project)
              })
            "
          >
            <p class="link-text">{{ $t('menu.level3.child.c') }}</p>
          </a>
        </section>
        <section class="sidebar-group">
          <p class="sidebar-group__title">{{ $t('menu.level4.father') }}</p>
          <a
            class="link"
            :class="{ active: 'otherwise' === activeLinkStyle }"
            @click="
              switchRouter('otherwise', {
                project: Number(route.params.project)
              })
            "
          >
            <p class="link-text">{{ $t('menu.level4.child.a') }}</p>
          </a>
          <a
            class="link"
            :class="{ active: 'reporting' === activeLinkStyle }"
            @click="
              switchRouter('reporting', {
                project: Number(route.params.project)
              })
            "
          >
            <p class="link-text">{{ $t('menu.level4.child.c') }}</p>
          </a>
          <!-- <a
            class="link"
            :class="{ active: '3' === activeLinkStyle }"
            @click="switchRouter('3')"
          >
            <p class="link-text">{{ $t('menu.level4.child.b') }}</p>
          </a> -->
        </section>
        <section v-if="authLevel === 1" class="sidebar-group">
          <p class="sidebar-group__title">{{ $t('menu.level5.father') }}</p>
          <a
            class="link"
            :class="{ active: 'update' === activeLinkStyle }"
            @click="switchRouter('update')"
          >
            <p class="link-text">{{ $t('menu.level5.child.a') }}</p>
          </a>
        </section>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// import X2E from '@/views/otherwise/tools/X2E.vue'
import MockBox from '@/views/otherwise/tools/MockBox.vue'
import tools from '@/utils/tools'
import { useI18n } from 'vue-i18n'
import { useStore } from '@/store'
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
  console.log(authLevel.value)
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

function switchRouter(routerName: string, params: any = null) {
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
      padding: 0px 30px 10rem 10px;
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
