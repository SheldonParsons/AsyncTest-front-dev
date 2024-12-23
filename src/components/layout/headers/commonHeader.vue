<template>
  <div class="header-common" :class="{ headerCommonDark: isLogin }">
    <div class="logo" style="height: inherit" :class="{ logoDark: isLogin }">
      <el-row justify="start" style="height: inherit" align="middle">
        <el-col :span="6" style="height: inherit"
          ><img
            class="logo-img g-unselect"
            style="height: inherit"
            src="../../../assets/img/projectStyle/bird1.png"
            alt="" /></el-col
        ><el-col :span="18"
          ><span class="g-unselect project-name" style="margin-left: 5px">{{
            $t('main.name')
          }}</span></el-col
        ></el-row
      >
    </div>
    <el-row justify="end" class="header-row" align="middle">
      <el-col
        v-if="isLogin && !isWorkingCenter && !isGlobalZone"
        :span="2"
        :md="1"
        :sm="1"
        :xs="2"
      >
        <el-tooltip class="box-item" effect="light" placement="bottom">
          <template #content>
            <span @click="switchSenderPanel(true)" style="cursor: pointer">{{
              $t('tooltip.debugPanel')
            }}</span>
          </template>
          <div
            class="icon-cursor working-center"
            @click="switchSenderPanel(true)"
          >
            <SenderIcon></SenderIcon>
          </div>
        </el-tooltip>
      </el-col>
      <el-col
        v-if="isLogin && !isWorkingCenter"
        :span="2"
        :md="1"
        :sm="1"
        :xs="2"
        style="height: 100%"
      >
        <el-tooltip class="box-item" effect="light" placement="bottom">
          <template #content>
            <span @click="toProject" style="cursor: pointer">{{
              $t('tooltip.center')
            }}</span>
          </template>
          <div
            class="icon-cursor working-center"
            style="height: 100%"
            @click="toProject"
          >
            <AngleColorful></AngleColorful>
          </div>
        </el-tooltip>
      </el-col>
      <el-col
        v-if="isLogin"
        :span="2"
        :md="1"
        :sm="1"
        :xs="2"
        style="text-align: center"
      >
        <el-tooltip class="box-item" effect="light" placement="bottom">
          <template #content>
            <span @click="toView('task')" style="cursor: pointer">{{
              $t('tooltip.task')
            }}</span>
          </template>
          <div
            class="icon-cursor tooltip-icon working-center"
            @click="toView('task')"
          >
            <TaskIcon></TaskIcon>
          </div>
        </el-tooltip>
      </el-col>
      <el-col v-if="isLogin" :span="1">
        <el-divider direction="vertical" border-style="dashed" />
      </el-col>
      <el-col :span="2" :md="1" :sm="1" :xs="2">
        <el-dropdown
          trigger="click"
          style="align-items: center"
          :class="{ languageDropdownDark: isLogin }"
        >
          <LanguageIcon></LanguageIcon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="langHandleSelect(zhCn)"
                >中文</el-dropdown-item
              >
              <el-dropdown-item @click="langHandleSelect(en)"
                >English</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-col>
      <el-col v-if="isLogin" :span="2" :md="1" :sm="1" :xs="2">
        <el-avatar :size="40" :src="userImage" />
      </el-col>
      <el-col v-if="isLogin" :span="2" :md="1" :sm="1" :xs="2">
        <el-tooltip class="box-item" effect="light" placement="bottom">
          <template #content>
            <span @click="logout" style="cursor: pointer">{{
              $t('tooltip.logout')
            }}</span>
          </template>
          <div class="icon-cursor tooltip-icon" @click="logout">
            <LogoutIcon></LogoutIcon>
          </div>
        </el-tooltip>
      </el-col>
    </el-row>
  </div>
  <DebugPanel v-if="showDebugPanel" @closed="switchSenderPanel"></DebugPanel>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import { useI18n } from 'vue-i18n'
import { useStore } from '@/store'
import { useRouter } from 'vue-router'
import LanguageIcon from '@/assets/svg/languageIcon.vue'
import LogoutIcon from '@/assets/svg/common/logoutIcon.vue'
import ProjectIcon from '@/assets/svg/common/projectIcon.vue'
import TaskIcon from '@/assets/svg/common/taskIcon.vue'
import SenderIcon from '@/assets/svg/common/senderIcon.vue'
import { ClearServerCookie } from '@/api/layout/cookies'
import DebugPanel from '@/components/layout/debugs/debugTools.vue'
import AngleColorful from '@/components/layout/otherwise/angle-colorful.vue'

const store: any = useStore()
const router: any = useRouter()
const isLogin = ref(false)
const isWorkingCenter = ref(false)
const isGlobalZone = ref(false)
const showDebugPanel = ref(false)
const { locale: localeLang } = useI18n()
const userImage = ref('https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/99.png')

const globalZoneList = ['task']

onMounted(() => {
  getLanguage()
  getHeader(router.currentRoute.value)
  getUserImage()
})

const emit = defineEmits(['up'])

watch(showDebugPanel, (n, o) => {
  emit('up', n)
})

function getUserImage() {
  store.dispatch('getUser').then((res:any) => {
    if (res && res.id) {
      userImage.value = `https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/${res.userId + 0 % 100}.png`
    }
  })
}

router.beforeEach((to: any, from: any, next: any) => {
  getLanguage()
  getHeader(to)
  next()
})

function getHeader(r: any) {
  isLogin.value = r.name.indexOf('login') === -1
  store.dispatch('saveGlobalHeader', isLogin.value)
  isWorkingCenter.value = r.name.indexOf('project') !== -1
  isGlobalZone.value = globalZoneList.indexOf(r.name) !== -1
}

function getLanguage() {
  store.dispatch('getLanguage').then((res: any) => {
    if (res === null) {
      langHandleSelect(zhCn)
    } else {
      langHandleSelect(res)
    }
  })
}

function langHandleSelect(e: any) {
  if (e.name === 'zh-cn') {
    store.dispatch('saveLanguage', zhCn)
    localeLang.value = 'zh'
  } else if (e.name === 'en') {
    store.dispatch('saveLanguage', en)
    localeLang.value = 'en'
  }
}

function logout() {
  ClearServerCookie().then((data) => {
    router.push({ name: 'login' })
  })
}

function toView(name: string) {
  router.push({ name })
}

function toProject() {
  router.push({ name: 'project' })
}

function switchSenderPanel(value: boolean) {
  showDebugPanel.value = value
}
</script>

<style lang="scss" scoped>
@import '@/assets/scss/layout/header.scss';
</style>
