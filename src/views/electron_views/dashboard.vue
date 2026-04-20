<template>
  <div class="dashboard-container">
    <div class="dashboard-content">
      <div class="dashboard-cards">
        <!-- 进入 AsyncTest -->
        <div class="dashboard-card asynctest-card" @click="handleEnterAsyncTest">
          <div class="card-logo">
            <img class="logo-default" src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full_new.svg"
              alt="AsyncTest" />
            <img class="logo-hover" src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full_light.svg"
              alt="AsyncTest" />
          </div>
          <h3 class="card-title">AsyncTest</h3>
          <p class="card-description">测试平台</p>
        </div>

        <!-- 进入 AsyncTest Mind -->
        <div class="dashboard-card mind-card" @click="handleEnterMind">
          <div class="card-logo">
            <img class="logo-default" src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/mind_full.svg"
              alt="AsyncTest Mind" />
            <img class="logo-hover" src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/mind_full_light.svg"
              alt="AsyncTest Mind" />
          </div>
          <h3 class="card-title">AsyncTest Mind</h3>
          <p class="card-description">思维导图</p>
        </div>

        <div class="dashboard-card generator-card" @click="handleEnterGenerator">
          <div class="card-logo">
            <img
              class="logo-default"
              src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/generate_full_dark_new_1.svg"
              alt="Generator"
            />
            <img
              class="logo-hover"
              src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/generate_full_light_new_1.svg"
              alt="Generator"
            />
          </div>
          <h3 class="card-title">Generator</h3>
          <p class="card-description">AsyncTest 生成工具</p>
        </div>

        <!-- 进入 AsyncTest AI（仅 localhost 环境显示） -->
        <div v-if="isLocalhost" class="dashboard-card ai-card" @click="handleEnterAgent">
          <div class="card-logo">
            <img class="logo-default" src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/ai_full.svg"
              alt="AsyncTest AI" />
            <img class="logo-hover" src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/ai_full_light.svg"
              alt="AsyncTest AI" />
          </div>
          <h3 class="card-title">AsyncTest AI</h3>
          <p class="card-description">AsyncTest Agent</p>
        </div>

        <!-- 更多功能 -->
        <div class="dashboard-card dashboard-card-disabled" @click="handleMoreFeatures">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="19" cy="12" r="1.5" fill="currentColor" />
              <circle cx="5" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h3 class="card-title">更多功能</h3>
          <p class="card-description">敬请期待</p>
        </div>
      </div>

    </div>

    <!-- 登录弹窗 -->
    <DialogAnimation ref="loginDialogRef" title="登录" bgtype="white" :showCancel="false" :showComfirm="false">
      <LoginComponent @loginSuccess="handleLoginSuccess" />
    </DialogAnimation>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import asyncTest from '@/db'
import GlobalStatus from '@/global'
import DialogAnimation from '@/components/common/general/dialog.vue'
import LoginComponent from './login.vue'
import { ApiCheckPermission } from '@/api/layout/cookies'

const router = useRouter()
const loginDialogRef = ref<any>(null)
const isLocalhost = computed(() => {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
})

const emit = defineEmits(['doubleCheckLoginStatus'])

// 检查登录状态
const checkLoginStatus = async () => {
  const currentCookie = asyncTest.cookies.getCookie(GlobalStatus.cookieTag)
  if (currentCookie !== false) {
    return await ApiCheckPermission({}).then((res: any) => {
      if (res.result === 0) {
        asyncTest.cookies.clearCookie(GlobalStatus.cookieTag)
        emit('doubleCheckLoginStatus')
        return false
      } else {
        return true
      }
    })
  } else {
    asyncTest.cookies.clearCookie(GlobalStatus.cookieTag)
    emit('doubleCheckLoginStatus')
  }
  return currentCookie !== false
}

// 进入 AsyncTest
const handleEnterAsyncTest = async () => {
  if (await checkLoginStatus()) {
    router.push({ name: "project" })
  } else {
    loginDialogRef.value?.open()
  }
}

// 进入 AsyncTest Mind
const handleEnterMind = () => {
  // if (!import.meta.env.DEV) {
  //   window.$toast({title:"该功能仍在开发中，正式版暂不支持，敬请期待。"});
  //   return;
  // }
  router.push({ name: "mindDashboard" })
}

const handleEnterGenerator = () => {
  router.push({ name: "generator" })
}

const handleEnterAgent = () => {
  router.push({ name: "agentDashboard" })
}

// 更多功能
const handleMoreFeatures = () => {
  window.$toast({ title: '更多功能敬请期待', type: 'info' })
}

// 登录成功回调
const handleLoginSuccess = () => {
  loginDialogRef.value?.close()
  // 更新 header 的登录状态
  if (window.$updateHeaderLoginStatus) {
    window.$updateHeaderLoginStatus()
  }
}
</script>

<style scoped lang="scss">
.dashboard-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  overflow: hidden;
}

.dashboard-content {
  padding: 20px;
  height: 100%;
}

.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 150px));
  gap: 12px;
  justify-content: flex-end;
}

.dashboard-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1.5px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.08) 100%);
    opacity: 0;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  &:hover:not(.dashboard-card-disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(16, 185, 129, 0.12), 0 2px 4px rgba(16, 185, 129, 0.08);
    border-color: #10b981;
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);

    &::before {
      opacity: 0;
    }

    .logo-default {
      opacity: 0;
    }

    .logo-hover {
      opacity: 1;
    }

    .card-icon {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      transform: scale(1.05);

      svg {
        color: #ffffff;
      }
    }

    .card-title {
      color: #ffffff;
    }

    .card-description {
      color: #d1d5db;
    }
  }

  &.dashboard-card-disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      transform: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
      border-color: transparent;
    }
  }
}

// Logo container with smooth transition
.card-logo {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  position: relative;

  img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    position: absolute;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    object-fit: contain;
  }

  .logo-default {
    opacity: 1;
  }

  .logo-hover {
    opacity: 0;
  }
}

// Icon style for disabled card
.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    width: 20px;
    height: 20px;
    color: #10b981;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
  transition: color 0.3s ease;
  letter-spacing: 0.01em;
}

.card-description {
  font-size: 11px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

// Specific card styles
.asynctest-card {
  .card-logo {
    img {
      filter: drop-shadow(0 1px 2px rgba(16, 185, 129, 0.1));
    }
  }
}

.mind-card {
  .card-logo {
    img {
      filter: drop-shadow(0 1px 2px rgba(16, 185, 129, 0.1));
    }
  }
}

.generator-card {
  .card-logo {
    height: 42px;

    img {
      max-width: 70%;
      max-height: 70%;
      filter: drop-shadow(0 1px 2px rgba(16, 185, 129, 0.1));
    }
  }
}

.ai-card {
  .card-logo {
    height: 42px;

    img {
      max-width: 70%;
      max-height: 70%;
      filter: drop-shadow(0 1px 2px rgba(16, 185, 129, 0.1));
    }
  }
}
</style>
