<template>
  <section ref="workspaceRootRef" class="report-workspace">
    <header class="workspace-header">
      <div class="workspace-header-main">
        <button class="back-button" type="button" @click="$emit('back')">← 返回 Generator 首页</button>
        <div>
          <h2>生成测试报告</h2>
        </div>
      </div>

      <div class="workspace-header-actions">
        <button
          class="header-action"
          type="button"
          aria-label="回到生成测试报告页面顶部"
          title="回到生成测试报告页面顶部"
          @click="scrollToTop"
        >
          ↑ 回到顶部
        </button>
        <button
          class="header-action"
          type="button"
          :disabled="!canReturnToPreviousPosition"
          aria-label="返回上一层内容定位"
          title="返回上一层内容定位"
          @click="returnToPreviousPosition"
        >
          ↶ 返回上一层定位
        </button>
        <button class="header-action header-action-primary" type="button" @click="startGenerationPreview">
          生成 DOCX
        </button>
      </div>
    </header>

    <section class="workspace-body">
      <div class="workspace-main">
        <ReportConfigPanel
          :form="state.form"
          :environments="state.environments"
          :zentao-options="state.zentaoOptions"
          :zentao-loading="state.zentaoLoading"
          :testing-connection="state.testingConnection"
          :connection-status="state.connectionStatus"
          :linkage-status="state.linkageStatus"
          @add-environment="addEnvironment"
          @remove-environment="removeEnvironment"
          @ensure-products="ensureProductsLoaded"
          @change-product="handleProductChange"
          @change-project="handleProjectChange"
          @change-execution="handleExecutionChange"
          @test-connection="testZentaoConnection"
        />
        <ReportSourcesPanel
          :inputs="state.inputs"
          :custom-fields="state.customFields"
          :amind-files="state.amindFiles"
          :amind-parse-results="state.amindParseResults"
          :parsing-amind="state.parsingAmind"
          :excel-file="state.excelFile"
          :excel-parse-result="state.excelParseResult"
          :parsing-excel="state.parsingExcel"
           @trigger-input="triggerInputAction"
           @remove-amind-file="removeAmindFile"
           @update-amind-docx-file-type="updateAmindDocxFileType"
           @toggle-amind-board="toggleAmindBoard"
           @update-amind-include-free-nodes="updateAmindIncludeFreeNodes"
           @remove-excel-file="removeExcelFile"
           @update-excel-sheet="updateExcelSelectedSheet"
           @update-excel-column="updateExcelColumnMapping"
          @exclude-excel-module="excludeExcelModule"
          @exclude-excel-owner="excludeExcelOwner"
          @toggle-excel-empty-module="toggleExcelEmptyModule"
        />
      </div>

      <aside class="workspace-side">
        <ReportLogPanel :logs="state.logs" />
        <div ref="recentExportsRef" class="recent-export-shell" :class="{ 'is-flashing': recentExportsFlashing }">
          <ReportRecentExportsPanel
            :records="state.recentExports"
            :saving-id="state.savingRecentExportId"
            @save="saveRecentExport"
          />
        </div>
      </aside>
    </section>

    <DialogAnimation ref="loginDialogRef" title="登录" bgtype="white" :showCancel="false" :showComfirm="false">
      <LoginComponent :redirect-on-success="false" @loginSuccess="handleGeneratorLoginSuccess" />
    </DialogAnimation>

    <SourceFileSelectDialog
      v-model="state.amindDialogVisible"
      title="选择 amind 文件"
      description="先选择 AsyncTest 项目，再从文件模块中勾选 `.amind` 文件。"
      :allowed-extensions="['amind']"
      :single-selection="false"
      empty-selection-message="请至少选择一个 amind 文件"
      :projects="state.asyncTestProjects"
      :projects-loading="state.asyncTestProjectsLoading"
      :project-id="state.asyncTestProjectId"
      @update:project-id="setAsyncTestProjectId"
      @confirm="addAmindFiles"
    />

    <SourceFileSelectDialog
      v-model="state.excelDialogVisible"
      title="选择 Excel 文件"
      description="先选择 AsyncTest 项目，再从文件模块中选择 `.xlsx` 文件。若重新选择，会自动替换之前的 Excel。"
      :allowed-extensions="['xlsx']"
      :single-selection="true"
      confirm-label="使用当前 Excel"
      empty-selection-message="请先选择一个 xlsx 文件"
      :projects="state.asyncTestProjects"
      :projects-loading="state.asyncTestProjectsLoading"
      :project-id="state.asyncTestProjectId"
      @update:project-id="setAsyncTestProjectId"
      @confirm="addExcelFile"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import DialogAnimation from "@/components/common/general/dialog.vue";
import LoginComponent from "@/views/electron_views/login.vue";
import ReportConfigPanel from "./panels/ReportConfigPanel.vue";
import ReportLogPanel from "./panels/ReportLogPanel.vue";
import ReportRecentExportsPanel from "./panels/ReportRecentExportsPanel.vue";
import SourceFileSelectDialog from "./panels/SourceFileSelectDialog.vue";
import ReportSourcesPanel from "./panels/ReportSourcesPanel.vue";
import { useReportWorkspaceState } from "./state";

const emit = defineEmits<{
  back: [];
}>();

const {
  state,
  addEnvironment,
  removeEnvironment,
  triggerInputAction,
  ensureProductsLoaded,
  handleProductChange,
  handleProjectChange,
  handleExecutionChange,
  testZentaoConnection,
  handleLoginSuccess,
  setAsyncTestProjectId,
   addAmindFiles,
   removeAmindFile,
   updateAmindDocxFileType,
   updateAmindSelectedBoards,
   updateAmindIncludeFreeNodes,
   addExcelFile,
   removeExcelFile,
  updateExcelSelectedSheet,
  updateExcelColumnMapping,
  excludeExcelModule,
  excludeExcelOwner,
  toggleExcelEmptyModule,
  saveRecentExport,
   startGenerationPreview,
 } = useReportWorkspaceState();

function toggleAmindBoard(payload: { fileId: string; boardId: string }) {
  const file = state.amindFiles.find((item) => item.id === payload.fileId);
  if (!file) return;

  const nextBoardIds = file.selectedBoardIds.includes(payload.boardId)
    ? file.selectedBoardIds.filter((item) => item !== payload.boardId)
    : [...file.selectedBoardIds, payload.boardId];

  updateAmindSelectedBoards({
    fileId: payload.fileId,
    boardIds: nextBoardIds.length ? nextBoardIds : [payload.boardId],
  });
}

const loginDialogRef = ref<any>(null);
const workspaceRootRef = ref<HTMLElement | null>(null);
const reportScrollContainer = ref<HTMLElement | null>(null);
const recentExportsRef = ref<HTMLElement | null>(null);
const recentExportsFlashing = ref(false);
let recentExportsFlashTimer: number | null = null;
let scrollHistoryReleaseTimer: number | null = null;

const REPORT_ANCHORS = [
  { key: "basic", id: "report-anchor-basic" },
  { key: "environment", id: "report-anchor-environment" },
  { key: "sources", id: "report-anchor-sources" },
  { key: "excel", id: "report-anchor-excel" },
] as const;

type ReportAnchorKey = (typeof REPORT_ANCHORS)[number]["key"];
type ReportScrollHistoryEntry = {
  top: number;
  anchor: ReportAnchorKey | null;
};

const scrollHistory = ref<ReportScrollHistoryEntry[]>([]);
const activeReportAnchor = ref<ReportAnchorKey | null>(null);
const canReturnToPreviousPosition = computed(() => scrollHistory.value.length > 0);
let lastObservedScrollTop = 0;
let suppressScrollHistory = false;

function resolveReportScrollContainer() {
  if (reportScrollContainer.value) return reportScrollContainer.value;
  const root = workspaceRootRef.value;
  if (root) {
    const page = root.closest<HTMLElement>(".generator-page");
    if (page) {
      reportScrollContainer.value = page;
      return page;
    }
  }
  if (typeof document !== "undefined") {
    reportScrollContainer.value = document.scrollingElement as HTMLElement | null;
  }
  return reportScrollContainer.value;
}

function reportAnchorElement(anchor: (typeof REPORT_ANCHORS)[number]) {
  return workspaceRootRef.value?.querySelector<HTMLElement>(`#${anchor.id}`) ?? null;
}

function reportAnchorTop(element: HTMLElement, container: HTMLElement) {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return elementRect.top - containerRect.top + container.scrollTop;
}

function resolveActiveReportAnchor(container: HTMLElement): ReportAnchorKey | null {
  const threshold = container.scrollTop + 36;
  let active: ReportAnchorKey | null = null;
  for (const anchor of REPORT_ANCHORS) {
    const element = reportAnchorElement(anchor);
    if (!element) continue;
    if (reportAnchorTop(element, container) <= threshold) {
      active = anchor.key;
    }
  }
  return active;
}

function pushScrollHistory(entry: ReportScrollHistoryEntry) {
  if (!Number.isFinite(entry.top) || entry.top < 0) return;
  const previous = scrollHistory.value.at(-1);
  if (previous && previous.anchor === entry.anchor && Math.abs(previous.top - entry.top) < 1) return;
  scrollHistory.value.push({ top: Math.max(0, entry.top), anchor: entry.anchor });
  if (scrollHistory.value.length > 24) {
    scrollHistory.value.splice(0, scrollHistory.value.length - 24);
  }
}

function handleReportScroll() {
  const container = resolveReportScrollContainer();
  if (!container) return;
  const currentTop = Math.max(0, container.scrollTop);
  const nextAnchor = resolveActiveReportAnchor(container);
  if (suppressScrollHistory) {
    activeReportAnchor.value = nextAnchor;
    lastObservedScrollTop = currentTop;
    return;
  }

  if (activeReportAnchor.value === null) {
    activeReportAnchor.value = nextAnchor;
  } else if (nextAnchor !== activeReportAnchor.value) {
    pushScrollHistory({ top: lastObservedScrollTop, anchor: activeReportAnchor.value });
    activeReportAnchor.value = nextAnchor;
  }
  lastObservedScrollTop = currentTop;
}

function releaseScrollHistorySuppression() {
  suppressScrollHistory = false;
  const container = resolveReportScrollContainer();
  if (!container) return;
  activeReportAnchor.value = resolveActiveReportAnchor(container);
  lastObservedScrollTop = Math.max(0, container.scrollTop);
}

function scrollToReportPosition(top: number) {
  const container = resolveReportScrollContainer();
  if (!container) return;
  const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const targetTop = Math.min(Math.max(0, top), maxTop);
  suppressScrollHistory = true;
  if (scrollHistoryReleaseTimer) {
    window.clearTimeout(scrollHistoryReleaseTimer);
  }
  if (typeof container.scrollTo === "function") {
    container.scrollTo({ top: targetTop, behavior: "smooth" });
  } else {
    container.scrollTop = targetTop;
  }
  scrollHistoryReleaseTimer = window.setTimeout(() => {
    scrollHistoryReleaseTimer = null;
    releaseScrollHistorySuppression();
  }, 450);
}

function scrollToTop() {
  const container = resolveReportScrollContainer();
  if (!container || container.scrollTop <= 0) {
    scrollToReportPosition(0);
    return;
  }
  pushScrollHistory({ top: container.scrollTop, anchor: activeReportAnchor.value });
  scrollToReportPosition(0);
}

function returnToPreviousPosition() {
  const previous = scrollHistory.value.pop();
  if (!previous) return;
  scrollToReportPosition(previous.top);
}

function scrollToElementInReport(element: HTMLElement) {
  const container = resolveReportScrollContainer();
  if (!container) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  pushScrollHistory({ top: container.scrollTop, anchor: activeReportAnchor.value });
  scrollToReportPosition(reportAnchorTop(element, container));
}

function setupReportScrollTracking() {
  const container = resolveReportScrollContainer();
  if (!container) return;
  container.addEventListener("scroll", handleReportScroll, { passive: true });
  activeReportAnchor.value = resolveActiveReportAnchor(container);
  lastObservedScrollTop = Math.max(0, container.scrollTop);
}

function teardownReportScrollTracking() {
  const container = reportScrollContainer.value;
  container?.removeEventListener("scroll", handleReportScroll);
  if (scrollHistoryReleaseTimer) {
    window.clearTimeout(scrollHistoryReleaseTimer);
    scrollHistoryReleaseTimer = null;
  }
}

watch(
  () => state.showLoginDialog,
  (visible) => {
    if (visible) {
      loginDialogRef.value?.open?.();
      return;
    }
    loginDialogRef.value?.close?.();
  },
  { immediate: true }
);

function handleGeneratorLoginSuccess() {
  handleLoginSuccess();
  if (window.$updateHeaderLoginStatus) {
    window.$updateHeaderLoginStatus();
  }
}

watch(
  () => state.recentExportsFlashToken,
  (value) => {
    if (!value) return;
    if (recentExportsRef.value) {
      scrollToElementInReport(recentExportsRef.value);
    }
    recentExportsFlashing.value = true;
    if (recentExportsFlashTimer) {
      window.clearTimeout(recentExportsFlashTimer);
    }
    recentExportsFlashTimer = window.setTimeout(() => {
      recentExportsFlashing.value = false;
      recentExportsFlashTimer = null;
    }, 2200);
  }
);

onMounted(() => {
  void nextTick(setupReportScrollTracking);
});

onBeforeUnmount(() => {
  teardownReportScrollTracking();
  if (recentExportsFlashTimer) {
    window.clearTimeout(recentExportsFlashTimer);
    recentExportsFlashTimer = null;
  }
});
</script>

<style scoped lang="scss">
.report-workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.workspace-header,
.workspace-main > *,
.workspace-side > * {
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
}

.workspace-header-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.back-button {
  border: 1px solid rgba(15, 23, 42, 0.1);
  width: fit-content;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.back-button:hover {
  transform: translateY(-1px);
  border-color: rgba(15, 23, 42, 0.18);
  background: #f8fafc;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}

.workspace-header h2 {
  margin: 0 0 4px;
  color: #0f172a;
  font-size: 20px;
}

.workspace-header p {
  margin: 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.6;
}

.workspace-header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.header-action {
  border: 1px solid rgba(15, 23, 42, 0.1);
  min-height: 30px;
  padding: 0 12px;
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.header-action:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(15, 23, 42, 0.18);
  background: #f8fafc;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}

.header-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.header-action-primary {
  border-color: #111827;
  background: #111827;
  color: #ffffff;
}

.header-action-primary:hover:not(:disabled) {
  background: #000000;
  border-color: #000000;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.2);
}

.workspace-body {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.75fr);
  gap: 12px;
  align-items: stretch;
}

.workspace-main,
.workspace-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.workspace-side {
  align-self: stretch;
}

.workspace-main > *,
.workspace-side > * {
  min-width: 0;
}

.recent-export-shell {
  border-radius: 18px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.recent-export-shell.is-flashing {
  animation: recent-export-flash 1s ease 2;
}

@keyframes recent-export-flash {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(59, 130, 246, 0);
    transform: translateY(0);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18), 0 18px 36px rgba(59, 130, 246, 0.16);
    transform: translateY(-1px);
  }
}

:deep(.btn-login-submit) {
  background: #111827;
}

:deep(.btn-login-submit:hover:not(:disabled)) {
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
}

@media (max-width: 1080px) {
  .workspace-header,
  .workspace-body {
    grid-template-columns: 1fr;
  }

  .workspace-header {
    flex-direction: column;
  }

  .workspace-body {
    display: grid;
  }
}
</style>
