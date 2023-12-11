<script setup lang="ts">
import { useRouter } from 'vue-router'
import LoginInput from '@/components/common/input/loginInput.vue'
import LoginButton from '@/components/common/button/loginButton.vue'
import LoginCheckbox from '@/components/common/checkbox/loginCheckbox.vue'
import { ref, getCurrentInstance, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElLoading } from 'element-plus'
import { ILogin } from '@/api/interface'
import { ApiLogin } from '@/api/anonymous/index'
import { useStore } from '@/store'
const router = useRouter()
const store = useStore()
const { t } = useI18n()
const username = ref('')
const password = ref('')
const usernameError: any = ref(null)
const passwordError: any = ref(null)
const disabled = ref(false)
const passwordType = ref('password')
const checked = ref(true)
const { proxy }: any = getCurrentInstance()

onMounted(() => {
  rememberCheck()
})
router.beforeEach((to: any, from: any, next: any) => {
  rememberCheck()
  next()
})

function rememberCheck() {
  // 获取记住账号密码的状态
  store.dispatch('getRemember').then((res: any) => {
    // 如果res为false表示从来没有插入过remember状态，则现场插入一个当前的remember状态
    if (res === null) {
      store.dispatch('saveRemember', checked.value)
    } else {
      // 同步当前checked状态
      checked.value = res.remember
      if (res.remember === true) {
        // 如果记住密码，将账号密码填充至登陆输入框
        store.dispatch('getUser').then((res) => {
          if (res && res.username && res.password) {
            username.value = res.username
            password.value = res.password
          }
        })
      }
    }
  })
}

function changeRemember(status: boolean) {
  checked.value = status
  store.dispatch('saveRemember', status)
}
function enter() {
  if (!username.value) {
    proxy.$message({
      message: t('noticeError.username'),
      duration: 3000,
      type: 'warning'
    })
    usernameError.value.twinkle()
    return
  }
  if (!password.value) {
    proxy.$message({
      message: t('noticeError.password'),
      duration: 3000,
      type: 'warning'
    })
    passwordError.value.twinkle()
    return
  }
  disabled.value = true
  validateUser()
}
function validateUser() {
  const loading = ElLoading.service({
    lock: true,
    background: 'rgba(0, 0, 0, 0.1)'
  })
  const data: ILogin = {
    username: username.value,
    password: password.value
  }
  ApiLogin(data).then((res: any) => {
    console.log(res)
    if (res.result === 1) {
      proxy.$messageNotice({
        title: t('notice.successLogin'),
        message: t('notice.usingSystem'),
        type: 'success',
        position: 'bottom-right'
      })
      const userStatus = {
        userId: res.data.id,
        username: username.value,
        password: password.value,
        role: res.data.role,
        nickName: res.data.nick_name,
        email: res.data.email,
        mobile: res.data.mobile,
        sex: res.data.sex,
        remember: checked.value
      }
      store.dispatch('saveUser', userStatus).then((userRes) => {
        console.log(res.data.default_project_id)
        const projectId = res.data.default_project_id
        if (projectId === null) {
          router.push({ name: 'project' })
        } else {
          router.push({ name: 'data', params: { project: projectId } })
        }
      })
    } else {
      proxy.$message({
        message: res.msg,
        duration: 3000,
        type: 'warning'
      })
      passwordError.value.twinkle()
      usernameError.value.twinkle()
    }
    disabled.value = false
    loading.close()
  })
}
</script>

<template>
  <section class="login-section flex">
    <div class="container">
      <el-row class="row" justify="center" align="middle">
        <el-col :xs="16" :sm="12" :md="12" :lg="6" :xl="6">
          <LoginInput
            ref="usernameError"
            v-model="username"
            type="text"
            :placeholder="$t('login.username')"
            :disabled="disabled"
          />
        </el-col>
      </el-row>
      <el-row class="row" justify="center" align="middle">
        <el-col :xs="16" :sm="12" :md="12" :lg="6" :xl="6">
          <LoginInput
            ref="passwordError"
            v-model="password"
            :type="passwordType"
            :placeholder="$t('login.password')"
            :disabled="disabled"
            @changeType="
              passwordType = passwordType === 'password' ? 'text' : 'password'
            "
            @keyup.enter="enter"
          />
        </el-col>
      </el-row>
      <el-row class="row" justify="center" align="middle">
        <el-col :xs="16" :sm="12" :md="12" :lg="6" :xl="6">
          <LoginButton
            @click="enter"
            :value="$t('login.submit')"
            :disabled="disabled"
          />
        </el-col>
      </el-row>
      <el-row
        class="row"
        justify="center"
        align="middle"
        style="margin-left: 10px"
      >
        <el-col :xs="16" :sm="12" :md="12" :lg="6" :xl="6">
          <LoginCheckbox
            @changeStatus="changeRemember"
            :checked="checked"
            :remember="$t('login.remember')"
          ></LoginCheckbox>
        </el-col>
      </el-row>
      <el-row class="row" justify="center" align="middle">
        <el-col
          :xs="16"
          :sm="6"
          :md="6"
          :lg="6"
          :xl="6"
          style="text-align: center"
        >
          <span class="login-prompt g-unselect"
            >— {{ $t('login.prompt') }} —</span
          >
        </el-col>
      </el-row>
    </div>
  </section>
</template>

<style scoped lang="scss">
.login-prompt {
  color: #e6e8eb;
}
.row {
  margin-bottom: 1.5rem;
}
.login-section {
  height: 100%;
  width: 100%;
  background-image: url('@/assets/img/bg/blue2.jpg');
  background-size: 100% 100%;
}

.flex {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
