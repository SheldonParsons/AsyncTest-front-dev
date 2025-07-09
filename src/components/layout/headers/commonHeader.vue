<template>
  <div style="height: inherit">
    <div class="header-common" style="height: inherit" :class="{ headerCommonDark: isLogin }">
      <div class="logo" style="height: inherit" :class="{ logoDark: isLogin }">
        <div style="display: flex; justify-content: start; align-items: center;height: inherit;gap: 0px;">
          <div style="height: inherit;">
            <img class="logo-img g-unselect" style="height: inherit" src="@/assets/img/projectStyle/bird-main-2.png"
              alt="" />
          </div>
          <div>
            <span class="g-unselect project-name" style="margin-left: 5px">{{
              $t("main.name")
              }}</span>
          </div>
          <div v-if="inProject" style="margin-left: 10px;" class="project-label-container" ref="containerRef">
            <motion.span style="font-size: 16px;" class="project-label">{{ project_name }}</motion.span>
          </div>
        </div>
      </div>
      <div style="display: flex;justify-content: end;align-items: center;width: 100%;height: 100%;gap: 20px;">
        <div style="width: 50px;height: 100%;">
          <el-tooltip class="box-item" effect="light" placement="bottom">
            <template #content>
              <span @click="toProject" style="cursor: pointer">{{
                $t("tooltip.center")
                }}</span>
            </template>
            <div class="icon-cursor working-center" style="height: 100%" @click="toProject">
              <AngleColorful></AngleColorful>
            </div>
          </el-tooltip>
        </div>
        <div>
          <el-tooltip class="box-item" effect="light" placement="bottom">
            <template #content>
              <span @click="toView('task')" style="cursor: pointer">{{
                $t("tooltip.task")
                }}</span>
            </template>
            <div class="icon-cursor tooltip-icon working-center" @click="toView('task')">
              <TaskIcon></TaskIcon>
            </div>
          </el-tooltip>
        </div>
        <div>
          <el-divider direction="vertical" border-style="dashed" />
        </div>
        <div>
          <el-dropdown trigger="click" style="align-items: center" :class="{ languageDropdownDark: isLogin }">
            <LanguageIcon></LanguageIcon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="langHandleSelect(zhCn)">中文</el-dropdown-item>
                <el-dropdown-item @click="langHandleSelect(en)">English</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div>
          <el-avatar :size="40" :src="userImage" />
        </div>
        <div style="margin-right: 20px;">
          <el-tooltip class="box-item" effect="light" placement="bottom">
            <template #content>
              <span @click="logout" style="cursor: pointer">{{
                $t("tooltip.logout")
                }}</span>
            </template>
            <div class="icon-cursor tooltip-icon" @click="logout">
              <LogoutIcon></LogoutIcon>
            </div>
          </el-tooltip>
        </div>
      </div>
    </div>
    <DebugPanel v-if="showDebugPanel" @closed="switchSenderPanel"></DebugPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { motion, animate, stagger } from "motion-v"
import { splitText } from "motion-plus"
import zhCn from "element-plus/es/locale/lang/zh-cn";
import en from "element-plus/es/locale/lang/en";
import { useI18n } from "vue-i18n";
import { useStore } from "@/store";
import { useRouter, useRoute } from "vue-router";
import LanguageIcon from "@/assets/svg/languageIcon.vue";
import LogoutIcon from "@/assets/svg/common/logoutIcon.vue";
import TaskIcon from "@/assets/svg/common/taskIcon.vue";
import { ClearServerCookie } from "@/api/layout/cookies";
import DebugPanel from "@/components/layout/debugs/debugTools.vue";
import AngleColorful from "@/components/layout/otherwise/angle-colorful.vue";
import { ApiGetSingleProjects } from "@/api/project/index"

const store: any = useStore();
const router: any = useRouter();
const route: any = useRoute();
const isLogin = ref(false);
const inProject = ref(false)
const project_name = ref('loading...')
const isWorkingCenter = ref(false);
const isGlobalZone = ref(false);
const showDebugPanel = ref(false);
const { locale: localeLang } = useI18n();
const userImage = ref(
  "https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/99.png"
);

const globalZoneList = ["task"];
const containerRef = ref<HTMLDivElement | null>(null)

onMounted(async () => {
  getLanguage();
  getHeader(router.currentRoute.value);
  getUserImage();
  const res = await get_project_info()
  if (res) {
    document.fonts.ready.then(() => {
      if (!containerRef.value) return

      // Hide the container until the fonts are loaded
      containerRef.value.style.visibility = "visible"

      const { words } = splitText(
        containerRef.value.querySelector("span")!
      )

      // Animate the words in the h1
      animate(
        words,
        { opacity: [0, 1], y: [10, 0] },
        {
          type: "spring",
          duration: 2,
          bounce: 0,
          delay: stagger(0.05),
        }
      )
    })
  }

});

async function get_project_info() {
  const id = route.params.project
  if (id === undefined) {
    return false
  }
  inProject.value = true
  await ApiGetSingleProjects({}, id).then(async (res: any) => {
    project_name.value = res.data.name
  })
  return true
}

const emit = defineEmits(["up"]);

watch(showDebugPanel, (n, o) => {
  emit("up", n);
});

function getUserImage() {
  store.dispatch("getUser").then((res: any) => {
    if (res && res.id) {
      userImage.value = `https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/${res.userId + (0 % 100)
        }.png`;
    }
  });
}

router.afterEach(async (to: any, from: any, next: any) => {
  console.log(to);
  if (!to.params.project) {
    inProject.value = false
  } else {
    const res = await get_project_info()
    if (res) {
      document.fonts.ready.then(() => {
        if (!containerRef.value) return

        // Hide the container until the fonts are loaded
        containerRef.value.style.visibility = "visible"

        const { words } = splitText(
          containerRef.value.querySelector("span")!
        )

        // Animate the words in the h1
        animate(
          words,
          { opacity: [0, 1], y: [10, 0] },
          {
            type: "spring",
            duration: 2,
            bounce: 0,
            delay: stagger(0.05),
          }
        )
      })
    }
  }
})

router.beforeEach(async (to: any, from: any, next: any) => {
  getLanguage();
  getHeader(to);
  next();

});

function getHeader(r: any) {
  isLogin.value = r.name.indexOf("login") === -1;
  store.dispatch("saveGlobalHeader", isLogin.value);
  isWorkingCenter.value = r.name.indexOf("project") !== -1;
  isGlobalZone.value = globalZoneList.indexOf(r.name) !== -1;
}

function getLanguage() {
  store.dispatch("getLanguage").then((res: any) => {
    if (res === null) {
      langHandleSelect(zhCn);
    } else {
      langHandleSelect(res);
    }
  });
}

function langHandleSelect(e: any) {
  if (e.name === "zh-cn") {
    store.dispatch("saveLanguage", zhCn);
    localeLang.value = "zh";
  } else if (e.name === "en") {
    store.dispatch("saveLanguage", en);
    localeLang.value = "en";
  }
}

function logout() {
  ClearServerCookie().then((data) => {
    router.push({ name: "login" });
  });
}

function toView(name: string) {
  router.push({ name });
  inProject.value = false
}

function toProject() {
  router.push({ name: "project" });
  inProject.value = false
}

function switchSenderPanel(value: boolean) {
  showDebugPanel.value = value;
}
</script>

<style lang="scss" scoped>
.project-label {
  background-color: black;
  color: white !important;
  padding: 3px 5px;
  border-radius: 5px;
  font-size: 12px !important;
}

.project-label-container {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: left;
  visibility: hidden;
}

.split-word {
  will-change: transform, opacity;
}

@import "@/assets/scss/layout/header.scss";
</style>
