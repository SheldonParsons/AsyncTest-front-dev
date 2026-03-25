<template>
  <section class="generator-page">
    <div class="generator-shell">
      <div v-if="currentView === 'home'" class="generator-home">
        <section class="tool-grid">
          <article
            v-for="tool in toolCards"
            :key="tool.key"
            class="tool-card"
            :class="{ 'is-primary': tool.key === 'test-report', 'is-disabled': tool.disabled }"
            @click="openTool(tool)"
          >
            <div class="tool-card-main">
              <div v-if="tool.badge" class="tool-card-badge">{{ tool.badge }}</div>
              <h3>{{ tool.title }}</h3>
              <p>{{ tool.description }}</p>
            </div>
            <div class="tool-card-footer">
              <span>{{ tool.actionLabel }}</span>
              <span class="tool-card-arrow">→</span>
            </div>
          </article>
        </section>
      </div>

      <ReportWorkspace v-else @back="currentView = 'home'" />
    </div>

    <DialogAnimation ref="loginDialogRef" title="登录" bgtype="white" :showCancel="false" :showComfirm="false">
      <LoginComponent :redirect-on-success="false" @loginSuccess="handleLoginSuccess" />
    </DialogAnimation>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import asyncTest from "@/db";
import GlobalStatus from "@/global";
import { ApiCheckPermission } from "@/api/layout/cookies";
import DialogAnimation from "@/components/common/general/dialog.vue";
import LoginComponent from "@/views/electron_views/login.vue";
import ReportWorkspace from "./report/ReportWorkspace.vue";

type GeneratorView = "home" | "test-report";

type ToolCard = {
  key: string;
  title: string;
  description: string;
  badge?: string;
  actionLabel: string;
  disabled?: boolean;
};

const currentView = ref<GeneratorView>("home");
const loginDialogRef = ref<any>(null);
const pendingView = ref<GeneratorView | null>(null);

const toolCards: ToolCard[] = [
  {
    key: "test-report",
    title: "生成测试报告",
    description: "进入测试报告工作台，统一填写信息、选择数据源、查看解析结果与生成日志。",
    badge: "主入口",
    actionLabel: "进入工作台",
  },
  {
    key: "mock-template",
    title: "生成 Mock 模板",
    description: "预留后续生成能力入口，未来可在这里扩展数据模板与接口脚手架能力。",
    actionLabel: "敬请期待",
    disabled: true,
  },
];

async function checkLoginStatus() {
  const currentCookie = asyncTest.cookies.getCookie(GlobalStatus.cookieTag);
  if (currentCookie === false) {
    asyncTest.cookies.clearCookie(GlobalStatus.cookieTag);
    return false;
  }

  const response: any = await ApiCheckPermission({});
  if (response?.result === 0) {
    asyncTest.cookies.clearCookie(GlobalStatus.cookieTag);
    return false;
  }

  return true;
}

async function openTool(tool: ToolCard) {
  if (tool.disabled) return;
  if (tool.key === "test-report") {
    pendingView.value = "test-report";
    const loggedIn = await checkLoginStatus().catch(() => false);
    if (loggedIn) {
      currentView.value = "test-report";
      pendingView.value = null;
      return;
    }
    loginDialogRef.value?.open();
  }
}

function handleLoginSuccess() {
  loginDialogRef.value?.close();
  if (window.$updateHeaderLoginStatus) {
    window.$updateHeaderLoginStatus();
  }
  currentView.value = pendingView.value ?? "test-report";
  pendingView.value = null;
}
</script>

<style scoped lang="scss">
.generator-page {
  height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(34, 197, 94, 0.06), transparent 20%),
    linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
  padding: 28px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
}

.generator-shell {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
}

.tool-card {
  border-radius: 20px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.generator-home {
  width: 100%;
}

.tool-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool-card {
  position: relative;
  overflow: hidden;
  padding: 14px 16px;
  min-height: 88px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.tool-card:hover:not(.is-disabled) {
  transform: translateY(-1px);
  border-color: rgba(34, 197, 94, 0.24);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
}

.tool-card.is-primary {
  background:
    radial-gradient(circle at top right, rgba(34, 197, 94, 0.08), transparent 30%),
    #ffffff;
}

.tool-card.is-disabled {
  opacity: 0.68;
  cursor: not-allowed;
}

.tool-card-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  width: fit-content;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.1);
  color: #166534;
  font-size: 11px;
  font-weight: 700;
}

.tool-card-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-card h3 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.tool-card p {
  margin: 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.6;
}

.tool-card-footer {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
}

.tool-card-arrow {
  color: #166534;
  font-size: 16px;
}

:deep(.btn-login-submit) {
  background: #111827;
}

:deep(.btn-login-submit:hover:not(:disabled)) {
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
}

@media (max-width: 960px) {
  .generator-page {
    padding: 18px;
  }

  .tool-grid {
    display: flex;
  }
}
</style>
