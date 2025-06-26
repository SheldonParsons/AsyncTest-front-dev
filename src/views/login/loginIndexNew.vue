<template>
  <div>
    <section class="login-section flex">
      <el-row class="login-row" align="middle">
        <el-col
          :offset="1"
          :span="8"
          :lg="14"
          :md="12"
          :sm="10"
          :xs="10"
          :xl="15"
          style="text-align: center"
        >
          <h1 class="tagline g-unselect">
            <span class="accent">Async</span>hronous<br />Way of
            <span class="accent">Test</span>ing for Any Interface
          </h1>
          <div class="description bold-style g-unselect wrapper">
            <div class="typing-demo">
              Using approachable, performant and less source code for testing of
              your webs.
            </div>
          </div>
        </el-col>
        <el-col
          id="tt"
          class="login-panel"
          :span="13"
          :lg="7"
          :md="10"
          :sm="11"
          :xs="11"
          :xl="6"
        >
          <div class="main-div">
            <div class="sub-div">
              <h2 class="desc-text-main">
                <span class="login-font g-unselect">{{
                  $t("login.title")
                }}</span>
              </h2>
            </div>
            <div class="desc-div">
              <span class="sub-span"
                ><span
                  ><div class="sub-desc-div g-unselect">
                    {{ $t("login.subTitle") }}
                    <a
                      target="_blank"
                      href="https://ztpm.gree.com:8888/"
                      class="bold-style"
                      >{{ $t("login.zentao") }}</a
                    >
                  </div></span
                ></span
              >
            </div>
            <div class="info">
              <div class="username-title">
                <span class="bold-style g-unselect">{{
                  $t("login.username")
                }}</span>
              </div>
              <div class="username-input-div">
                <input
                  v-model="username"
                  class="input-special"
                  :placeholder="$t('login.placeholderU')"
                  spellcheck="false"
                  type="text"
                />
              </div>
              <div class="username-title">
                <span class="bold-style g-unselect">{{
                  $t("login.password")
                }}</span>
              </div>
              <div class="username-input-div">
                <input
                  v-model="password"
                  @input="onPasswordChange"
                  class="input-special"
                  :placeholder="$t('login.placeholderP')"
                  spellcheck="false"
                  type="password"
                  @keyup.enter="enter"
                />
              </div>

              <div class="submit-btn">
                <button
                  type="submit"
                  role="button"
                  :disabled="!canSubmitBtn"
                  class="btn-special"
                  :style="{ cursor: canSubmitBtn ? 'pointer' : 'not-allowed' }"
                >
                  <span
                    @click="enter"
                    class="span-special"
                    :style="{
                      cursor: canSubmitBtn ? 'pointer' : 'not-allowed',
                      color: canSubmitBtn
                        ? 'rgb(255, 255, 255)'
                        : 'rgb(128, 234, 167)',
                    }"
                    >{{ $t("login.submit") }}</span
                  >
                </button>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </section>
    <div class="banner" v-if="showNews">
      <a
        ><span>News: </span>AI
        Agent模块：在新的AsyncTest中用AI来帮助您构建接口和用例 - 10-09-2024</a
      >
      <a
        style="text-decoration: none; color: inherit"
        rel="nofollow"
        href="https://beian.miit.gov.cn"
        target="_blank"
      >
        （粤ICP备2024322282号-1）</a
      >
      <button @click="showNews = false">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          class="close"
        >
          <path
            d="M18.9,10.9h-6v-6c0-0.6-0.4-1-1-1s-1,0.4-1,1v6h-6c-0.6,0-1,0.4-1,1s0.4,1,1,1h6v6c0,0.6,0.4,1,1,1s1-0.4,1-1v-6h6c0.6,0,1-0.4,1-1S19.5,10.9,18.9,10.9z"
          ></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref, getCurrentInstance, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { ElLoading } from "element-plus";
import { ILogin } from "@/api/interface";
import { ApiLogin } from "@/api/anonymous/index";
import { useStore } from "@/store";
const router = useRouter();
const store = useStore();
const { t } = useI18n();
const username = ref("");
const password = ref("");
const disabled = ref(false);
const checked = ref(true);
const canSubmitBtn = ref(false);
const { proxy }: any = getCurrentInstance();
const showNews = ref(true);

onMounted(() => {
  console.log("123123123");

  rememberCheck();
});
router.beforeEach((to: any, from: any, next: any) => {
  rememberCheck();
  next();
});

function onPasswordChange(item: any) {
  console.log(item);

  changeSubmitBtnStatus();
}

function changeSubmitBtnStatus() {
  console.log(password.value);

  if (password.value.length > 0) {
    canSubmitBtn.value = true;
  } else {
    canSubmitBtn.value = false;
  }
}

function rememberCheck() {
  // 获取记住账号密码的状态
  store.dispatch("getRemember").then((res: any) => {
    // 如果res为false表示从来没有插入过remember状态，则现场插入一个当前的remember状态
    if (res === null) {
      store.dispatch("saveRemember", checked.value).then(() => {
        changeSubmitBtnStatus();
      });
    } else {
      // 同步当前checked状态
      checked.value = res.remember;
      if (res.remember === true) {
        // 如果记住密码，将账号密码填充至登陆输入框
        store.dispatch("getUser").then((res) => {
          if (res && res.username && res.password) {
            username.value = res.username;
            password.value = res.password;
          }
          changeSubmitBtnStatus();
        });
      }
    }
  });
}

function enter() {
  console.log("in enter");

  if (!username.value) {
    proxy.$message({
      message: t("noticeError.username"),
      duration: 3000,
      type: "warning",
    });
    return;
  }
  if (!password.value) {
    proxy.$message({
      message: t("noticeError.password"),
      duration: 3000,
      type: "warning",
    });
    return;
  }
  disabled.value = true;
  validateUser();
}
function validateUser() {
  const loading = ElLoading.service({
    lock: true,
    background: "rgba(0, 0, 0, 0.1)",
  });
  const data: ILogin = {
    username: username.value,
    password: password.value,
  };
  ApiLogin(data).then((res: any) => {
    console.log(res);
    if (res.result === 1) {
      proxy.$messageNotice({
        title: t("notice.successLogin"),
        message: t("notice.usingSystem"),
        type: "success",
        position: "bottom-right",
      });
      const userStatus = {
        userId: res.data.id,
        username: username.value,
        password: password.value,
        role: res.data.role,
        nickName: res.data.nick_name,
        email: res.data.email,
        mobile: res.data.mobile,
        sex: res.data.sex,
        remember: checked.value,
        privateKey: res.data.private_key,
      };
      store.dispatch("saveUser", userStatus).then((userRes) => {
        console.log(res.data.default_project_id);
        const projectId = res.data.default_project_id;
        if (projectId === null) {
          router.push({ name: "project" });
        } else {
          router.push({ name: "data", params: { project: projectId } });
        }
      });
    } else {
      proxy.$message({
        message: res.msg,
        duration: 3000,
        type: "warning",
      });
    }
    disabled.value = false;
    loading.close();
  });
}
</script>

<style scoped lang="scss">
@import "@/assets/scss/layout/login.scss";
// #tt:before {
//   content: '';
//   position: absolute;
//   height: 200px;
//   width: 200px;
//   background-size: 200px;
//   background-repeat: no-repeat;
//   overflow: auto;
//   background-image: url('../../assets/img/projectStyle/bird6.png');
//   top: -85px;
//   margin-left: -90px;
//   opacity: 0.7;
// }
.wrapper {
  // height: 100vh;
  display: grid;
  place-items: center;
}
.huge-title {
  font-size: 2em;
  font-weight: 600;
}

.typing-demo {
  // width: 100%;
  animation: typing 2s steps(22), blink 0.5s step-end infinite alternate;
  white-space: nowrap;
  overflow: hidden;
  border-right: 3px solid;
  font-size: 0.82em;
  font-weight: 600;
}

@keyframes typing {
  from {
    max-width: 0;
  }
  to {
    max-width: 100%;
  }
}

@keyframes blink {
  50% {
    border-color: transparent;
  }
}
</style>