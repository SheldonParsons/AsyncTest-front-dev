<template>
  <div class="login-container">
    <div class="login-content">
      <div class="login-header">
        <div class="login-logo">
          <img src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full.svg" alt="AsyncTest" />
        </div>
        <h2 class="login-title">欢迎回来</h2>
        <p class="login-subtitle">使用禅道登录你的 API 工作区</p>
      </div>

      <div class="login-form">
        <div class="form-group">
          <label class="form-label">账号</label>
          <div class="input-wrapper">
            <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <input type="text" class="form-input" placeholder="请输入账号" v-model="loginForm.username">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">密码</label>
          <div class="input-wrapper">
            <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <input :type="passwordVisible ? 'text' : 'password'" class="form-input" placeholder="请输入密码" v-model="loginForm.password" @keyup.enter="handleLogin">
            <button type="button" class="password-toggle" @click="togglePassword">
              <svg v-if="!passwordVisible" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="form-options">
          <label class="checkbox-wrapper">
            <CheckBox :check="loginForm.checked ? 'check' : 'none'" @change="changeRemember" border-color="#10b981"></CheckBox>
            <span class="checkbox-label">记住我</span>
          </label>
        </div>

        <button class="btn-login-submit" :disabled="isLoggingIn" @click="handleLogin">
          <span>{{ isLoggingIn ? '登录中...' : '登录' }}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store'
import CheckBox from '@/assets/motion/checkbox.vue'
import { ApiLogin } from '@/api/anonymous/index'

const store = useStore()
const router = useRouter()

const props = defineProps({
  redirectOnSuccess: {
    type: Boolean,
    default: true,
  },
})

const passwordVisible = ref(false)
const isLoggingIn = ref(false)
const loginForm = ref({
  username: '',
  password: '',
  checked: false
})

const emit = defineEmits(['loginSuccess'])

onMounted(() => {
  rememberCheck()
})

function rememberCheck() {
  store.dispatch("getRemember").then((res: any) => {
    if (res !== null) {
      loginForm.value.checked = res.remember
      if (res.remember === true) {
        store.dispatch("getUser").then((res) => {
          if (res && res.username && res.password) {
            loginForm.value.username = res.username
            loginForm.value.password = res.password
          }
        })
      } else {
        loginForm.value.username = ""
        loginForm.value.password = ""
      }
    }
  })
}

function changeRemember(status: string) {
  loginForm.value.checked = status === 'check'
  store.dispatch('saveRemember', loginForm.value.checked)
}

const togglePassword = () => {
  passwordVisible.value = !passwordVisible.value
}

function handleLogin() {
  if (isLoggingIn.value) return

  if (!loginForm.value.username) {
    window.$toast({ title: '请输入用户名', type: 'warning' })
    return
  }
  if (!loginForm.value.password) {
    window.$toast({ title: '请输入登录密码', type: 'warning' })
    return
  }

  isLoggingIn.value = true
  window.$toast({ title: '正在登录，请稍后...', type: 'info' })

  const data = {
    username: loginForm.value.username,
    password: loginForm.value.password,
  }

  ApiLogin(data).then((res: any) => {
    if (res.result === 1) {
      window.$toast({ title: '登录成功！', type: 'success' })
      const userStatus = {
        userId: res.data.id,
        username: loginForm.value.username,
        password: loginForm.value.password,
        role: res.data.role,
        nickName: res.data.nick_name,
        email: res.data.email,
        mobile: res.data.mobile,
        sex: res.data.sex,
        remember: loginForm.value.checked,
        privateKey: res.data.private_key,
      }

      store.dispatch("saveUser", userStatus).then(() => {
        emit('loginSuccess')
        if (props.redirectOnSuccess) {
          const projectId = res.data.default_project_id
          if (projectId === null) {
            router.push({ name: "project" })
          } else {
            router.push({ name: "interface", params: { project: projectId } })
          }
        }
      })
    } else {
      window.$toast({ title: res.msg, type: 'error' })
    }
    isLoggingIn.value = false
  }).catch(() => {
    isLoggingIn.value = false
  })
}
</script>

<style scoped lang="scss">
.login-container {
  width: 100%;
  min-width: 450px;
  padding: 30px;
  box-sizing: border-box;
}

.login-content {
  width: 100%;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;

  .login-logo {
    margin-bottom: 24px;

    img {
      height: 48px;
    }
  }

  .login-title {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 8px 0;
  }

  .login-subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }
}

.login-form {
  .form-group {
    margin-bottom: 20px;

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;

      .input-icon {
        position: absolute;
        left: 12px;
        color: #9ca3af;
        pointer-events: none;
      }

      .form-input {
        width: 100%;
        padding: 10px 12px 10px 40px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        color: #1f2937;
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        &::placeholder {
          color: #9ca3af;
        }
      }

      .password-toggle {
        position: absolute;
        right: 12px;
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;

        &:hover {
          color: #6b7280;
        }
      }
    }
  }

  .form-options {
    margin-bottom: 24px;

    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;

      .checkbox-label {
        font-size: 14px;
        color: #6b7280;
        user-select: none;
      }
    }
  }

  .btn-login-submit {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.3s;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }
}
</style>
