<template>
  <section
    ref="rootRef"
    class="report-workspace"
    :data-page="page"
    :class="{ 'is-busy': state.generatingReport, 'is-narrow': narrow }"
    :aria-busy="state.generatingReport"
  >
    <header class="report-header">
      <button
        type="button"
        class="report-back"
        aria-label="返回工具首页"
        :disabled="state.generatingReport"
        @click="leaveWorkspace"
      >
        <ArrowLeft :size="17" />
      </button>
      <div class="report-header-copy">
        <h1>生成测试报告</h1>
        <span>整理测试数据，交付清晰报告</span>
      </div>
      <div class="report-header-meta">
        <span class="report-header-chip desktop-only">
          <span class="report-header-dot" />{{ state.saveStatus || "浏览器预览" }}
        </span>
        <button v-if="state.saveStatus?.includes('冲突')" class="report-button ghost" @click="reloadServiceState">重新载入</button>
        <button v-if="state.reportIds?.length" class="report-button ghost" @click="showDocument = true">编辑正文</button>
        <button class="report-button ghost" @click="showMcp = true">MCP 接入</button>
      </div>
    </header>

    <TabsRoot
      v-model="page"
      :orientation="narrow ? 'horizontal' : 'vertical'"
      class="report-layout"
    >
      <aside class="report-sidebar">
        <span class="report-sidebar-caption">报告工作台</span>
        <ReportStepNav
          :steps="steps"
          :active="page"
          :issue-count="issueCount"
          :subtitle="navSubtitle"
        />
        <button
          type="button"
          class="report-history-link"
          :class="{ 'is-active': page === 'history' }"
          @click="page = 'history'"
        >
          <History :size="15" />
          <span>最近生成</span>
          <span class="report-history-count">{{
            state.recentExports.length
          }}</span>
        </button>
        <ReportSummaryRail
          v-if="railRows.length"
          class="report-sidebar-rail"
          :rows="railRows"
          :note="railNote"
        />
        <div class="report-progress">
          <div class="report-progress-head">
            <span>配置完成度</span>
            <strong>{{ readySections }}<i> / 4</i></strong>
          </div>
          <div
            class="report-progress-track"
            role="progressbar"
            :aria-valuenow="readySections"
            aria-valuemin="0"
            aria-valuemax="4"
          >
            <span
              v-for="index in 4"
              :key="index"
              class="report-progress-seg"
              :class="{ 'is-on': index <= readySections }"
            />
          </div>
          <p>随时切换步骤，已填内容会保留。</p>
        </div>
      </aside>

      <div class="report-main">
        <div ref="scrollRef" class="report-stage">
          <Transition :name="transitionName" mode="out-in">
            <TabsContent :key="page" :value="page" class="report-page">
              <div class="report-page-head">
                <div class="report-page-head-copy">
                  <h2>{{ currentStep.title }}</h2>
                  <p>{{ currentStep.description }}</p>
                </div>
                <div class="report-page-head-aside">
                  <Transition name="report-swap" mode="out-in">
                    <button
                      v-if="currentPageIssues.length"
                      key="issues"
                      type="button"
                      class="report-issue-pill"
                      @click="goToIssue(currentPageIssues[0])"
                    >
                      <CircleAlert :size="13" />
                      <span>{{ currentPageIssues.length }} 项待完善</span>
                      <ArrowRight :size="13" />
                    </button>
                    <span v-else key="ready" class="report-ready-pill">
                      <span class="report-ready-dot" />本步已就绪
                    </span>
                  </Transition>
                </div>
              </div>

              <div class="report-page-body">
                <div v-if="page === 'review' && state.workspaceId" class="report-service-options">
                  <label>数据来源 <select v-model="state.dataPolicy" :disabled="state.generatingReport"><option value="refresh">重新获取禅道数据</option><option value="cached">使用兼容本地缓存 · 不联网</option><option value="snapshot">使用完整历史快照 · 不联网</option></select></label>
                  <select v-if="state.dataPolicy === 'snapshot'" v-model="state.selectedSnapshotId" aria-label="选择历史快照"><option value="">选择快照</option><option v-for="snap in state.snapshots" :key="snap.id" :value="snap.id">{{ snap.dataAsOf }}{{ snap.complete ? '' : ' · 不完整' }}</option></select>
                  <small v-if="state.dataPolicy === 'snapshot'">使用所选快照当时的范围、文件和筛选设置。</small>
                </div>
                <div v-if="page === 'sources' && (state.assignmentCandidates?.length || 0) > 1" class="report-service-options"><label>任务分配表候选 <select :value="state.excelFile?.id || ''" :disabled="state.importingDirectory || state.importingLocal || state.generatingReport" aria-label="切换活动任务分配表" @change="activateAssignment(($event.target as HTMLSelectElement).value)"><option value="" disabled>请选择本次任务分配表</option><option v-for="candidate in state.assignmentCandidates" :key="candidate.value" :value="candidate.value">{{ candidate.label }}</option></select></label></div>
                <fieldset
                  class="report-fields"
                  :disabled="state.generatingReport || state.importingDirectory || state.serviceReady === false"
                >
                  <ReportConfigPanel
                    v-if="page === 'basic'"
                    :form="state.form"
                    :password-configured="state.passwordConfigured"
                    :zentao-options="state.zentaoOptions"
                    :zentao-loading="state.zentaoLoading"
                    :testing-connection="state.testingConnection"
                    :connection-status="state.connectionStatus"
                    :linkage-status="state.linkageStatus"
                    :version-required="versionRequired"
                    @ensure-products="ensureProductsLoaded"
                    @ensure-projects="ensureProjectsLoaded"
                    @ensure-executions="ensureExecutionsLoaded"
                    @ensure-test-tasks="ensureTestTasksLoaded"
                    @ensure-builds="ensureBuildsLoaded"
                    @change-product="handleProductChange"
                    @change-project="handleProjectChange"
                    @change-execution="handleExecutionChange"
                    @test-connection="testZentaoConnection"
                    @clear-password="clearPassword"
                  />
                  <ReportEnvironmentPanel
                    v-else-if="page === 'environments'"
                    v-model="environmentId"
                    :environments="state.environments"
                    :issues="
                      attempted.has('environments')
                        ? pageIssues('environments')
                        : []
                    "
                    :reveal-field="pendingField"
                    @add="addNewEnvironment"
                    @remove="removeEnvironment"
                  />
                  <ReportSourcesPanel
                    v-else-if="page === 'sources'"
                    v-model="sourceTab"
                    :amind-files="state.amindFiles"
                    :persistent-sources="!!state.workspaceId"
                    v-model:directory-url="state.sourceDirectoryUrl"
                    :importing-directory="state.importingDirectory"
                    :directory-import-status="state.directoryImportStatus"
                    :amind-parse-results="state.amindParseResults"
                    :parsing-amind="state.parsingAmind"
                    :excel-file="state.excelFile"
                    :excel-parse-result="state.excelParseResult"
                    :reveal-field="pendingField"
                    :parsing-excel="state.parsingExcel"
                    :importing-local="state.importingLocal"
                    :disabled="state.generatingReport"
                    @trigger-input="triggerInputAction"
                    @import-local="importLocalFiles"
                    @import-directory="importSourceDirectory"
                    @remove-amind-file="removeAmindFile"
                    @update-amind-docx-file-type="updateAmindDocxFileType"
                    @toggle-amind-board="toggleAmindBoard"
                    @update-amind-include-free-nodes="
                      updateAmindIncludeFreeNodes
                    "
                    @remove-excel-file="removeExcelFile"
                    @update-excel-sheet="updateExcelSelectedSheet"
                    @update-excel-column="updateExcelColumnMapping"
                    @update-excel-row-filter="
                      parseExcelFile({ rowFilter: $event })
                    "
                    @exclude-excel-module="excludeExcelModule"
                    @exclude-excel-owner="excludeExcelOwner"
                    @toggle-excel-empty-module="toggleExcelEmptyModule"
                    @reset-excel-filters="
                      parseExcelFile({
                        excludedModules: [],
                        excludedOwners: [],
                      })
                    "
                    @retry-amind="parseAmindFiles"
                    @retry-excel="parseExcelFile()"
                  />
                  <ReviewPanel
                    v-else-if="page === 'review'"
                    v-model:tab="reviewTab"
                    :state="state"
                    :issues="issues"
                    :generation-succeeded="generationSucceeded"
                    :summaries="reviewSummaries"
                    @save-export="saveRecentExport"
                    @jump="goToIssue"
                    @jump-page="(key) => (page = key)"
                  />
                </fieldset>
                <ReportRecentExportsPanel
                  v-if="page === 'history'"
                  :records="state.recentExports"
                  :saving-id="state.savingRecentExportId"
                  @save="saveRecentExport"
                  @configure="page = 'basic'"
                />
              </div>
            </TabsContent>
          </Transition>
        </div>

        <footer class="report-footer">
          <div class="report-footer-status" aria-live="polite">
            <Transition name="report-swap" mode="out-in">
              <span
                :key="footerKey"
                class="report-footer-message"
                :class="footerTone"
              >
                <LoaderCircle
                  v-if="state.generatingReport"
                  :size="15"
                  class="spin"
                />
                <span v-else-if="!issues.length" class="report-ready-dot" />
                <CircleAlert v-else :size="15" />
                <template v-if="state.generatingReport"
                  >报告生成中<span class="report-footer-verbose"
                    >，请稍候…</span
                  ></template
                ><template v-else-if="!issues.length"
                  >配置就绪<span class="report-footer-verbose"
                    >，可以生成报告</span
                  ></template
                ><template v-else>共 {{ issues.length }} 项待完善</template>
              </span>
            </Transition>
          </div>
          <div class="report-footer-actions">
            <button v-if="state.generatingReport" class="report-button ghost" @click="cancelGeneration">停止生成</button>
            <button
              v-if="pageIndex > 0 && pageIndex < 4"
              type="button"
              class="report-button ghost"
              @click="go(pageIndex - 1)"
            >
              <ChevronLeft :size="15" />上一步
            </button>
            <button
              v-if="pageIndex < 3"
              type="button"
              class="report-button solid"
              :disabled="state.generatingReport || state.importingLocal || state.importingDirectory"
              @click="nextPage"
            >
              下一步<i class="report-button-divider" />{{
                steps[pageIndex + 1].title
              }}<ArrowRight :size="15" />
            </button>
            <button
              v-else-if="page === 'review'"
              type="button"
              class="report-button solid"
              :disabled="
                state.generatingReport ||
                state.parsingAmind ||
                state.parsingExcel ||
                state.importingLocal || state.importingDirectory
              "
              @click="generate"
            >
              <LoaderCircle
                v-if="state.generatingReport"
                :size="15"
                class="spin"
              />
              <Play v-else :size="14" />
              {{ state.generatingReport ? "正在生成…" : "生成测试报告" }}
            </button>
            <button
              v-else
              type="button"
              class="report-button solid"
              @click="page = 'review'"
            >
              去检查与生成<ArrowRight :size="15" />
            </button>
          </div>
        </footer>
      </div>
    </TabsRoot>

    <DialogAnimation
      ref="loginDialogRef"
      title="登录"
      bgtype="white"
      :showCancel="false"
      :showComfirm="false"
      ><LoginComponent
        :redirect-on-success="false"
        @loginSuccess="handleGeneratorLoginSuccess"
    /></DialogAnimation>
    <SourceFileSelectDialog
      v-model="state.amindDialogVisible"
      title="选择 amind 文件"
      description="从有权限的 AsyncTest 项目中选择用例文件，也可以关闭此窗口后导入本地文件。"
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
      description="从有权限的 AsyncTest 项目中选择任务分配表，新选择会替换当前文件。"
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
    <ReportMcpDialog v-if="showMcp" @close="showMcp = false" />
    <ReportDocumentDialog v-if="showDocument && state.workspaceId" :workspace-id="state.workspaceId" :report-ids="state.reportIds || []" @close="showDocument = false" />
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  provide,
  reactive,
  ref,
  watch,
} from "vue";
import { useMediaQuery } from "@vueuse/core";
import { TabsRoot, TabsContent } from "reka-ui";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  CircleAlert,
  History,
  LoaderCircle,
  Play,
} from "@/components/icons/lucide";
import DialogAnimation from "@/components/common/general/dialog.vue";
import LoginComponent from "@/views/electron_views/login.vue";
import ReportStepNav from "./panels/ReportStepNav.vue";
import ReportConfigPanel from "./panels/ReportConfigPanel.vue";
import ReportEnvironmentPanel from "./panels/ReportEnvironmentPanel.vue";
import ReportSourcesPanel from "./panels/ReportSourcesPanel.vue";
import ReviewPanel from "./panels/ReviewPanel.vue";
import ReportSummaryRail from "./panels/ReportSummaryRail.vue";
import ReportRecentExportsPanel from "./panels/ReportRecentExportsPanel.vue";
import SourceFileSelectDialog from "./panels/SourceFileSelectDialog.vue";
import { useReportWorkspaceState } from "./state";
import ReportMcpDialog from "./panels/ReportMcpDialog.vue";
import ReportDocumentDialog from "./panels/ReportDocumentDialog.vue";
import {
  collectReportIssues,
  type ReportPage,
  type ReportIssue,
} from "./validation";
import { reportFormContext } from "./formContext";

const emit = defineEmits<{ back: [] }>();
const {
  state,
  addEnvironment,
  removeEnvironment,
  triggerInputAction,
  ensureProductsLoaded,
  ensureProjectsLoaded,
  ensureExecutionsLoaded,
  ensureTestTasksLoaded,
  ensureBuildsLoaded,
  handleProductChange,
  handleProjectChange,
  handleExecutionChange,
  testZentaoConnection,
  clearPassword,
  handleLoginSuccess,
  setAsyncTestProjectId,
  addAmindFiles,
  importLocalFiles,
  importSourceDirectory,
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
  parseAmindFiles,
  parseExcelFile,
  saveRecentExport,
  startGenerationPreview,
  reloadServiceState,
  cancelGeneration,
  activateAssignment,
} = useReportWorkspaceState();

const steps = [
  {
    key: "basic",
    title: "基础信息",
    description: "报告人员、禅道连接与本次测试范围",
  },
  {
    key: "environments",
    title: "生成环境",
    description: "每个启用的环境生成一份 Word",
  },
  {
    key: "sources",
    title: "数据源",
    description: "用例文件与任务分配表",
  },
  {
    key: "review",
    title: "检查与生成",
    description: "核对报告内容后导出",
  },
] as const;
const pages = [
  ...steps,
  { key: "history", title: "最近生成", description: "" },
] as const;

const showMcp = ref(false);
const showDocument = ref(false);
state.dataPolicy = "refresh";
const page = ref<ReportPage>("basic");
const sourceTab = ref("amind");
const reviewTab = ref("config");
const environmentId = ref(state.environments[0]?.id || "");
const narrow = useMediaQuery("(max-width: 900px)");
const rootRef = ref<HTMLElement>();
const scrollRef = ref<HTMLElement>();
const loginDialogRef = ref<any>();
const attempted = reactive(new Set<ReportPage>());
const touched = reactive(new Set<string>());
const pendingField = ref("");
const generationSucceeded = ref(false);
/** 步骤前进方向：+1 向下、-1 向上。转场据此换滑动方向， */
/** 让“下一步 / 上一步”在视觉上真的有上下之别。 */
const direction = ref(1);

const issues = computed(() => collectReportIssues(state));
const pageIssues = (key: ReportPage) =>
  issues.value.filter((issue) => issue.page === key);
const currentPageIssues = computed(() => pageIssues(page.value));
const currentStep = computed(
  () => pages.find((item) => item.key === page.value) || steps[0],
);
const pageIndex = computed(() =>
  pages.findIndex((item) => item.key === page.value),
);
const enabledEnvironments = computed(() =>
  state.environments.filter((env) => env.enabled),
);
const versionRequired = computed(() =>
  enabledEnvironments.value.some((env) => env.bugRange === "version"),
);
const readySections = computed(
  () => steps.filter((item) => !pageIssues(item.key).length).length,
);
const transitionName = computed(() =>
  direction.value >= 0 ? "report-step-forward" : "report-step-back",
);
const footerKey = computed(() =>
  state.generatingReport
    ? "busy"
    : !issues.value.length
      ? "ready"
      : `pending-${issues.value.length}`,
);
const footerTone = computed(() =>
  state.generatingReport
    ? "is-busy"
    : !issues.value.length
      ? "is-ready"
      : "is-pending",
);
const reviewSummaries = computed(() => ({
  basic:
    state.zentaoOptions.testTasks.find(
      (item) => item.value === state.form.testTaskId,
    )?.label || "选择测试单与版本",
  environments:
    enabledEnvironments.value
      .map((env) => env.name || "未命名环境")
      .join("、") || "尚未启用环境",
  sources: `${state.amindFiles.length} 个用例文件 · ${
    state.excelFile ? "1 份任务分配表" : "未导入任务分配表"
  }`,
}));
/** 右侧摘要：把关键字读出来，让人不用扫全屏就知道还差什么。 */
const railRows = computed(() => {
  const label = (options: { value: string; label: string }[], id: string) =>
    options.find((item) => item.value === id)?.label || "";
  if (page.value === "basic")
    return [
      { label: "报告人", value: state.form.reporter.trim() },
      { label: "复审人", value: state.form.reviewer.trim() },
      {
        label: "禅道账号",
        value: state.form.zentaoUsername.trim(),
        tone: state.connectionStatus.type === "success" ? "ready" : "",
      },
      {
        label: "产品",
        value: label(state.zentaoOptions.products, state.form.productId),
      },
      {
        label: "项目",
        value: label(state.zentaoOptions.projects, state.form.projectId),
      },
      {
        label: "执行",
        value: label(state.zentaoOptions.executions, state.form.executionId),
      },
      {
        label: "测试单",
        value: label(state.zentaoOptions.testTasks, state.form.testTaskId),
      },
      {
        label: "执行版本",
        value:
          label(state.zentaoOptions.builds, state.form.buildId) ||
          (versionRequired.value ? "" : "按执行统计，无需选择"),
      },
    ];
  if (page.value === "environments")
    return state.environments.map((env) => ({
      label: env.name || "未命名环境",
      value: env.enabled ? "已启用" : "已暂停",
      tone: env.enabled ? "ready" : "",
    }));
  if (page.value === "sources")
    return [
      { label: "用例文件", value: `${state.amindFiles.length} 个` },
      {
        label: "解析状态",
        value: state.parsingAmind
          ? "解析中…"
          : state.amindParseResults.length
            ? "已完成"
            : "",
        tone:
          state.amindParseResults.length && !state.parsingAmind ? "ready" : "",
      },
      { label: "任务分配表", value: state.excelFile?.name || "" },
      {
        label: "任务行数",
        value:
          state.excelParseResult?.status === "success"
            ? `${state.excelParseResult.rowCount} 行`
            : "",
      },
    ];
  return [];
});
const railNote = computed(() => {
  if (page.value === "basic")
    return versionRequired.value
      ? "当前环境按版本统计缺陷，因此必须选择所属执行版本。"
      : "所有环境均按执行统计，所属执行版本为选填。";
  if (page.value === "environments")
    return "每个启用的环境会生成一份 Word，暂停的环境保留配置但不输出。";
  if (page.value === "sources")
    return state.workspaceId ? "来源已保存到本机，刷新或退出后可以继续这份草稿。" : "本地文件只保留在当前工作台中，刷新或退出后需重新导入。";
  return "";
});

provide(reportFormContext, {
  issue: (name) =>
    issues.value.find(
      (issue) =>
        issue.key === name && (attempted.has(issue.page) || touched.has(name)),
    ),
  touch: (name) => touched.add(name),
});

function issueCount(key: ReportPage) {
  return pageIssues(key).length;
}
function navSubtitle(key: ReportPage) {
  if (key === "review")
    return state.generatingReport ? "正在生成…" : "核对内容并导出";
  if (!pageIssues(key).length) return "已就绪";
  return {
    basic: "人员与测试范围",
    environments: "配置每份报告",
    sources: "用例与任务分配",
  }[key as "basic" | "environments" | "sources"];
}
function go(index: number) {
  const target = pages[Math.min(pages.length - 1, Math.max(0, index))];
  if (target.key === page.value) return;
  direction.value = index > pageIndex.value ? 1 : -1;
  page.value = target.key;
}
function nextPage() {
  attempted.add(page.value);
  if (currentPageIssues.value.length) {
    goToIssue(currentPageIssues.value[0]);
    return;
  }
  go(pageIndex.value + 1);
}
async function goToIssue(issue: ReportIssue) {
  attempted.add(issue.page);
  pendingField.value = issue.key;
  if (issue.environmentId) environmentId.value = issue.environmentId;
  if (issue.source) sourceTab.value = issue.source;
  if (issue.page === "review") reviewTab.value = "config";
  const target = pages.findIndex((item) => item.key === issue.page);
  if (page.value !== issue.page) {
    direction.value = target > pageIndex.value ? 1 : -1;
    page.value = issue.page;
  }
  await nextTick();
  await nextTick();
  focusPendingField();
}
function focusPendingField() {
  if (!pendingField.value) return;
  const field = Array.from(
    rootRef.value?.querySelectorAll<HTMLElement>("[data-field]") || [],
  ).find((el) => el.dataset.field === pendingField.value);
  if (!field) return;
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  field.classList.add("is-targeted");
  window.setTimeout(() => field.classList.remove("is-targeted"), 1200);
  field
    .querySelector<HTMLElement>(
      "input:not([type=file]):not(:disabled),textarea:not(:disabled),button:not(:disabled)",
    )
    ?.focus({ preventScroll: true });
  pendingField.value = "";
}
async function generate() {
  if (state.generatingReport) return;
  steps.forEach((item) => attempted.add(item.key));
  if (issues.value.length && !(state.workspaceId && state.dataPolicy === 'snapshot')) {
    await goToIssue(issues.value[0]);
    return;
  }
  generationSucceeded.value = false;
  reviewTab.value = "activity";
  page.value = "review";
  generationSucceeded.value = (await startGenerationPreview()) === true;
}
function addNewEnvironment() {
  addEnvironment();
  environmentId.value = state.environments.at(-1)?.id || "";
}
function toggleAmindBoard(payload: { fileId: string; boardId: string }) {
  const file = state.amindFiles.find((item) => item.id === payload.fileId);
  if (!file) return;
  const ids = file.selectedBoardIds.includes(payload.boardId)
    ? file.selectedBoardIds.filter((id) => id !== payload.boardId)
    : [...file.selectedBoardIds, payload.boardId];
  if (ids.length) updateAmindSelectedBoards({ fileId: file.id, boardIds: ids });
}
function leaveWorkspace() {
  if (state.generatingReport) return;
  if (
    !state.workspaceId &&
    (state.amindFiles.some((file) => file.source === "local") ||
      state.excelFile?.source === "local") &&
    !window.confirm(
      "返回首页后，本地文件需要重新导入。报告配置和最近生成记录会保留。确定返回？",
    )
  )
    return;
  emit("back");
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (
    !state.workspaceId && (state.generatingReport ||
    state.amindFiles.some((file) => file.source === "local") ||
    state.excelFile?.source === "local")
  ) {
    event.preventDefault();
    event.returnValue = "";
  }
}
window.addEventListener("beforeunload", beforeUnload);
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
watch(page, async () => {
  await nextTick();
  scrollRef.value?.scrollTo({ top: 0 });
});
watch(
  () => state.environments.map((env) => env.id),
  (ids) => {
    if (!ids.includes(environmentId.value)) environmentId.value = ids[0] || "";
  },
);
watch(
  () => state.showLoginDialog,
  async (show) => {
    if (show) {
      await nextTick();
      loginDialogRef.value?.open();
    }
  },
  { immediate: true },
);
function handleGeneratorLoginSuccess() {
  loginDialogRef.value?.close();
  handleLoginSuccess();
}
</script>

<style lang="scss" src="./report.scss"></style>
