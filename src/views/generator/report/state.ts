import axios from "axios";
import { useReportServiceProjection } from "./serviceClient";
import { onBeforeUnmount, reactive, toRaw, watch } from "vue";
import asyncTest from "@/db";
import GlobalStatus from "@/global";
import { ApiCheckPermission } from "@/api/layout/cookies";
import { ApiGetJoinProjects } from "@/api/project/index";
import { EMPTY_MODULE_LABEL } from "./types";
import type {
  ReportAmindParseResult,
  ReportAmindSourceFile,
  ReportExcelColumnMapping,
  ReportExcelParseResult,
  ReportExcelRowFilter,
  ReportExcelSourceFile,
  ReportCustomFields,
  ReportBugRange,
  ReportDraftState,
  ReportEnvironmentConfig,
  ReportEnvironmentKind,
  ReportInputItem,
  ReportInputKey,
  ReportLogEntry,
  ReportParseItem,
  ReportRecentExportRecord,
  ReportSelectOption,
  ReportSeverity,
  ReportStep,
  ReportStepKey,
  ReportZendaoRunResult,
} from "./types";
import { parseAmindFile } from "./amindParser";
import {
  buildExcelParseResult,
  loadExcelWorkbook,
  type ExcelWorkbookSnapshot,
} from "./excelParser";

import { collectReportIssues } from "./validation";
import { readLocalReportFile, MAX_LOCAL_TOTAL_BYTES } from "./sourceContent";

const REPORT_STORAGE_KEY = "generator:test-report:draft";
const ZENTAO_API_BASE = "https://ztpm.gree.com:8888/api.php/v1";
const ZENTAO_TOKEN_URL = `${ZENTAO_API_BASE}/tokens`;
const ZENTAO_PRODUCT_LIST_URL = `${ZENTAO_API_BASE}/products`;
const ZENTAO_PROJECT_LIST_URL = `${ZENTAO_API_BASE}/projects`;
const ZENTAO_TESTTASK_LIST_URL = `${ZENTAO_API_BASE}/testtasks`;
const TEST_ENVIRONMENT_ID = "generator-fixed-test-environment";
const PRODUCTION_ENVIRONMENT_ID = "generator-fixed-production-environment";

function nowLabel() {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function createEnvironment(
  kind: ReportEnvironmentKind = "custom",
): ReportEnvironmentConfig {
  const isTest = kind === "test";
  const isProduction = kind === "production";

  return {
    id: isTest
      ? TEST_ENVIRONMENT_ID
      : isProduction
        ? PRODUCTION_ENVIRONMENT_ID
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    enabled: true,
    name: isTest ? "测试环境" : isProduction ? "生产环境" : "",
    bugFilterKeyword: "",
    bugExcludeKeyword: "",
    bugRange: "version",
    filterBugWithoutSolution: true,
    includeDate: false,
    reportDate: "",
    envUrl: "",
    gitlabUrl: "",
    conclusion: isTest ? "可提交审核，并发布生产版本" : "测试通过",
    projectRisk: "暂无",
  };
}

function createDefaultCustomFields(): ReportCustomFields {
  return {
    qualityResult: "通过",
    secrecyLevel: "秘密▲",
    testTypes: "功能测试，兼容性测试，易用性测试，回归测试",
    actualResult: "测试通过率100%",
  };
}

function resolveEnvironmentKind(item: any): ReportEnvironmentKind {
  if (
    item?.kind === "test" ||
    item?.id === TEST_ENVIRONMENT_ID ||
    item?.name === "测试环境"
  ) {
    return "test";
  }

  if (
    item?.kind === "production" ||
    item?.id === PRODUCTION_ENVIRONMENT_ID ||
    item?.name === "生产环境"
  ) {
    return "production";
  }

  return "custom";
}

function normalizeEnvironment(item: any): ReportEnvironmentConfig {
  const kind = resolveEnvironmentKind(item);
  const baseEnvironment = createEnvironment(kind);

  return {
    ...baseEnvironment,
    id:
      kind === "custom"
        ? `${item?.id ?? baseEnvironment.id}`
        : baseEnvironment.id,
    enabled: item?.enabled !== false,
    name: kind === "custom" ? `${item?.name ?? ""}` : baseEnvironment.name,
    bugFilterKeyword: `${item?.bugFilterKeyword ?? ""}`,
    bugExcludeKeyword: `${item?.bugExcludeKeyword ?? ""}`,
    bugRange: item?.bugRange === "execution" ? "execution" : "version",
    filterBugWithoutSolution: item?.filterBugWithoutSolution !== false,
    includeDate: item?.includeDate === true,
    reportDate: `${item?.reportDate ?? ""}`,
    envUrl: `${item?.envUrl ?? ""}`,
    gitlabUrl: `${item?.gitlabUrl ?? ""}`,
    conclusion: `${item?.conclusion ?? baseEnvironment.conclusion}`,
    projectRisk: `${item?.projectRisk ?? "暂无"}`,
  };
}

function normalizeEnvironments(input: unknown): ReportEnvironmentConfig[] {
  const sourceList = Array.isArray(input)
    ? input.map(normalizeEnvironment)
    : [];
  const fixedEnvironmentMap = new Map<
    ReportEnvironmentKind,
    ReportEnvironmentConfig
  >();
  const customEnvironments: ReportEnvironmentConfig[] = [];

  sourceList.forEach((environment) => {
    if (environment.kind === "custom") {
      customEnvironments.push(environment);
      return;
    }

    fixedEnvironmentMap.set(environment.kind, environment);
  });

  return [
    fixedEnvironmentMap.get("test") ?? createEnvironment("test"),
    fixedEnvironmentMap.get("production") ?? createEnvironment("production"),
    ...customEnvironments,
  ];
}

function getTimestampLabel() {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function createSerializablePayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(toRaw(value)));
}

function isBlank(value: unknown) {
  return `${value ?? ""}`.trim().length === 0;
}

function resolveBackendAuth(): { baseURL: string; token: string } | null {
  const token = asyncTest.cookies.getCookie(GlobalStatus.cookieTag);
  if (!token) return null;
  const isElectron =
    typeof window !== "undefined" &&
    window.navigator.userAgent.toLowerCase().includes("electron");
  let baseURL: string;
  if (import.meta.env.DEV) {
    baseURL = isElectron ? "http://localhost:6001" : "/api";
  } else if (import.meta.env.PROD && isElectron) {
    baseURL = import.meta.env.VITE_API_URL;
  } else {
    baseURL = "/server";
  }
  return { baseURL, token: `${token}` };
}

function readPersistedDraft() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(REPORT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<{
      reporter: string;
      reviewer: string;
      zentaoUsername: string;
      zentaoPassword: string;
      productId: string;
      projectId: string;
      executionId: string;
      testTaskId: string;
      buildId: string;
      asyncTestProjectId: string;
      environments: unknown;
      customFields: Partial<ReportCustomFields>;
    }>;

    const defaultCustomFields = createDefaultCustomFields();

    return {
      reporter: `${parsed.reporter ?? ""}`,
      reviewer: `${parsed.reviewer ?? ""}`,
      zentaoUsername: `${parsed.zentaoUsername ?? ""}`,
      zentaoPassword: `${parsed.zentaoPassword ?? ""}`,
      productId: `${parsed.productId ?? ""}`,
      projectId: `${parsed.projectId ?? ""}`,
      executionId: `${parsed.executionId ?? ""}`,
      testTaskId: `${parsed.testTaskId ?? ""}`,
      buildId: `${parsed.buildId ?? ""}`,
      asyncTestProjectId: `${parsed.asyncTestProjectId ?? ""}`,
      environments: normalizeEnvironments(parsed.environments),
      customFields: {
        qualityResult: `${parsed.customFields?.qualityResult ?? defaultCustomFields.qualityResult}`,
        secrecyLevel: `${parsed.customFields?.secrecyLevel ?? defaultCustomFields.secrecyLevel}`,
        testTypes: `${parsed.customFields?.testTypes ?? defaultCustomFields.testTypes}`,
        actualResult: `${parsed.customFields?.actualResult ?? defaultCustomFields.actualResult}`,
      },
    };
  } catch {
    return null;
  }
}

function buildZenTaoHeaders(token: string) {
  return {
    Token: token,
    "Content-Type": "application/json",
  };
}

function extractToken(payload: any): string {
  const candidates = [
    payload?.token,
    payload?.data?.token,
    payload?.sessionID,
    payload?.data?.sessionID,
    payload?.data?.data?.token,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function toOptions(list: any[]): ReportSelectOption[] {
  return list
    .map((item: any) => {
      const value = item?.id ?? item?.value ?? item?.key;
      const label = item?.name ?? item?.title ?? item?.text ?? item?.label;
      if (value === undefined || value === null || !label) return null;
      return { value: `${value}`, label: `${label}` };
    })
    .filter((item): item is ReportSelectOption => !!item);
}

function normalizeOptions(payload: any, keys: string[]): ReportSelectOption[] {
  const containers = [payload, payload?.data, payload?.data?.data];

  for (const container of containers) {
    if (!container) continue;
    // 部分禅道版本的接口（例如执行下的版本列表）直接返回数组，
    // 之前只按 key 查找，会把有数据的响应解析成 0 项。
    if (Array.isArray(container)) return toOptions(container);
    for (const key of keys) {
      const list = container[key];
      if (Array.isArray(list)) return toOptions(list);
    }
  }

  return [];
}

function createDefaultInputs(): ReportInputItem[] {
  return [
    {
      key: "amind",
      title: "amind 文件",
      description: "",
      required: true,
      mode: "file",
      statusText: "待选择文件",
      hint: "",
      actionLabel: "选择文件",
      selectedText: "暂未选择",
    },
    {
      key: "excel",
      title: "Excel 任务分配表",
      description: "",
      required: true,
      mode: "file",
      statusText: "待选择文件",
      hint: "",
      actionLabel: "选择文件",
      selectedText: "暂未选择",
    },
    {
      key: "custom",
      title: "自定义报告字段",
      description: "",
      required: false,
      mode: "fixed",
      statusText: "",
      hint: "",
      actionLabel: "编辑参数",
      selectedText: "",
    },
  ];
}

function createDefaultSteps(): ReportStep[] {
  return [
    {
      key: "draft",
      title: "填写报告信息",
      description: "维护账号、联动选择、环境配置和固定参数等信息。",
      status: "ready",
    },
    {
      key: "sources",
      title: "准备报告输入",
      description: "选择 amind、Excel 文件，并维护固定的自定义报告参数。",
      status: "ready",
    },
    {
      key: "parse",
      title: "解析与校验",
      description: "执行解析，整理结果并向用户反馈提示。",
      status: "idle",
    },
    {
      key: "generate",
      title: "生成 DOCX",
      description: "根据草稿和解析结果生成最终测试报告。",
      status: "idle",
    },
  ];
}

function createDefaultParseItems(): ReportParseItem[] {
  return [
    {
      id: "amind-summary",
      title: "amind 统计结果",
      value: "待解析",
      status: "idle",
      detail: "后续将显示总结点、完成节点、完成率等汇总内容。",
    },
    {
      id: "excel-owner",
      title: "Excel 模块负责人",
      value: "待解析",
      status: "idle",
      detail: "后续将显示负责人映射、模块归属和缺失项提示。",
    },
  ];
}

export function useReportWorkspaceState() {
  const persistedDraft = readPersistedDraft();
  const defaultCustomFields = createDefaultCustomFields();

  const state = reactive<ReportDraftState>({
    form: {
      reporter: persistedDraft?.reporter ?? "",
      reviewer: persistedDraft?.reviewer ?? "",
      zentaoUsername: persistedDraft?.zentaoUsername ?? "",
      zentaoPassword: persistedDraft?.zentaoPassword ?? "",
      productId: persistedDraft?.productId ?? "",
      projectId: persistedDraft?.projectId ?? "",
      executionId: persistedDraft?.executionId ?? "",
      testTaskId: persistedDraft?.testTaskId ?? "",
      buildId: persistedDraft?.buildId ?? "",
    },
    environments: normalizeEnvironments(persistedDraft?.environments),
    customFields: persistedDraft?.customFields ?? defaultCustomFields,
    inputs: createDefaultInputs(),
    parseItems: createDefaultParseItems(),
    logs: [],
    recentExports: [],
    recentExportsFlashToken: 0,
    savingRecentExportId: "",
    steps: createDefaultSteps(),
    activeStep: "draft",
    generationReady: true,
    testingConnection: false,
    connectionStatus: {
      type: "idle",
      message:
        persistedDraft?.zentaoUsername && persistedDraft?.zentaoPassword
          ? "已恢复账号信息，请确认连接"
          : "请填写禅道账号和密码",
    },
    linkageStatus: {
      type: "idle",
      message: "请先测试连接，或展开产品下拉触发自动登录",
    },
    zentaoToken: "",
    zentaoOptions: {
      products: [],
      projects: [],
      executions: [],
      testTasks: [],
      builds: [],
    },
    zentaoLoading: {
      products: false,
      projects: false,
      executions: false,
      testTasks: false,
      builds: false,
    },
    runningZendaoRun: false,
    generatingReport: false,
    importingLocal: false,
    importingDirectory: false,
    sourceDirectoryUrl: "",
    directoryImportStatus: { type: "idle", message: "" },
    latestZendaoRunResult: null,
    asyncTestLoggedIn: false,
    checkingAsyncTestLogin: false,
    showLoginDialog: false,
    amindDialogVisible: false,
    excelDialogVisible: false,
    asyncTestProjectId: persistedDraft?.asyncTestProjectId ?? "",
    asyncTestProjects: [],
    asyncTestProjectsLoading: false,
    amindFiles: [],
    amindParseResults: [],
    parsingAmind: false,
    excelFile: null,
    excelParseResult: null,
    parsingExcel: false,
  });

  if (window.electronAPI?.report) return useReportServiceProjection(state);

  const excelWorkbookCache = new Map<string, ExcelWorkbookSnapshot>();

  const removeZendaoRunLogListener =
    typeof window !== "undefined" && window.electronAPI?.on
      ? window.electronAPI.on(
          "generator:zendao-run-log",
          (
            _event: any,
            payload: {
              level?: ReportSeverity;
              title?: string;
              detail?: string;
              mergeKey?: string;
            },
          ) => {
            pushLog(
              payload?.level ?? "info",
              payload?.title ?? "禅道 Run 日志",
              payload?.detail ?? "",
              "parse",
              payload?.mergeKey,
            );
          },
        )
      : null;

  let projectListRequest = 0;
  let amindParseRequest = 0;
  let excelParseRequest = 0;
  let disposed = false;
  onBeforeUnmount(() => {
    projectListRequest += 1;
    amindParseRequest += 1;
    excelParseRequest += 1;
    disposed = true;
    removeZendaoRunLogListener?.();
  });

  watch(
    () => [state.form, state.environments, state.customFields],
    () => {
      persistDraft();
    },
    { deep: true },
  );

  function pushLog(
    level: ReportSeverity,
    title: string,
    detail: string,
    step: ReportStepKey,
    mergeKey?: string,
  ) {
    if (mergeKey) {
      const existedLog = state.logs.find((item) => item.mergeKey === mergeKey);
      if (existedLog) {
        existedLog.level = level;
        existedLog.title = title;
        existedLog.detail = detail;
        existedLog.step = step;
        existedLog.timestamp = nowLabel();
        return;
      }
    }

    const entry: ReportLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mergeKey,
      level,
      title,
      detail,
      step,
      timestamp: nowLabel(),
    };
    state.logs.unshift(entry);
  }

  function showToast(
    type: "success" | "warning" | "error" | "info",
    message: string,
  ) {
    window.$toast({ title: message, type });
  }

  function applyRecentExports(
    records: ReportRecentExportRecord[] | undefined,
    flash = false,
  ) {
    state.recentExports = Array.isArray(records) ? records : [];
    if (flash) {
      state.recentExportsFlashToken += 1;
    }
  }

  function markStep(stepKey: ReportStepKey, status: ReportStep["status"]) {
    const target = state.steps.find((item) => item.key === stepKey);
    if (target) {
      target.status = status;
    }
  }

  function setActiveStep(stepKey: ReportStepKey) {
    state.activeStep = stepKey;
  }

  function updateInputItem(
    inputKey: ReportInputKey,
    updater: (item: ReportInputItem) => void,
  ) {
    const target = state.inputs.find((item) => item.key === inputKey);
    if (target) {
      updater(target);
    }
  }

  function refreshAmindInputStatus() {
    updateInputItem("amind", (item) => {
      if (!state.amindFiles.length) {
        item.statusText = "待选择文件";
        item.selectedText = "暂未选择";
        return;
      }

      item.statusText = `已加入 ${state.amindFiles.length} 个 amind 文件`;
      item.selectedText = "";
    });
  }

  function refreshExcelInputStatus() {
    updateInputItem("excel", (item) => {
      if (!state.excelFile) {
        item.statusText = "待选择文件";
        item.selectedText = "暂未选择";
        return;
      }

      item.statusText = `已选择 1 个 Excel 文件`;
      item.selectedText = "";
    });
  }

  function updateAmindParseSummary() {
    const successResults = state.amindParseResults.filter(
      (item) => item.status === "success",
    );
    if (!successResults.length) {
      state.parseItems = state.parseItems.map((item) => {
        if (item.id !== "amind-summary") return item;
        return {
          ...item,
          value: state.parsingAmind
            ? "正在自动预览"
            : state.amindFiles.length
              ? "待自动预览"
              : "待选择 amind 文件",
          status: state.amindFiles.length ? "warning" : "idle",
          detail: state.parsingAmind
            ? "当前正在读取 amind 文件并刷新预览结果，请稍候。"
            : state.amindFiles.length
              ? `当前已加入 ${state.amindFiles.length} 个 amind 文件，新增或删除文件后会自动刷新预览结果。`
              : "后续将显示每个 amind 文件的用例统计结果。",
        };
      });
      return;
    }

    const totalCaseCount = successResults.reduce(
      (sum, item) => sum + item.totalCaseCount,
      0,
    );
    const passedCaseCount = successResults.reduce(
      (sum, item) => sum + item.passedCaseCount,
      0,
    );
    const failedCaseCount = successResults.reduce(
      (sum, item) => sum + item.failedCaseCount,
      0,
    );
    const pendingCaseCount = successResults.reduce(
      (sum, item) => sum + item.pendingCaseCount,
      0,
    );

    state.parseItems = state.parseItems.map((item) => {
      if (item.id !== "amind-summary") return item;
      return {
        ...item,
        value: `已预览 ${successResults.length} 个 amind 文件`,
        status: "success",
        detail: `累计用例 ${totalCaseCount}，通过 ${passedCaseCount}，失败 ${failedCaseCount}，未执行 ${pendingCaseCount}。`,
      };
    });
  }

  function updateExcelParseSummary() {
    state.parseItems = state.parseItems.map((item) => {
      if (item.id !== "excel-owner") return item;

      if (!state.excelFile) {
        return {
          ...item,
          value: "待选择 Excel 文件",
          status: "idle",
          detail: "后续将显示 Sheet、列映射、负责人去重和模块去重结果。",
        };
      }

      if (!state.excelParseResult) {
        return {
          ...item,
          value: state.parsingExcel ? "正在自动解析" : "待自动解析",
          status: "warning",
          detail: state.parsingExcel
            ? "当前正在读取 Excel、识别 Sheet 和列映射，请稍候。"
            : "当前已选择 Excel 文件，选择完成后会自动展示 Sheet 预览、列映射和汇总结果。",
        };
      }

      if (state.excelParseResult.status === "error") {
        return {
          ...item,
          value: "Excel 解析待确认",
          status: "warning",
          detail:
            state.excelParseResult.errorMessage ||
            "请调整 Sheet 或列映射后重新解析。",
        };
      }

      return {
        ...item,
        value: `已测试解析 ${state.excelParseResult.rowCount} 行`,
        status: "success",
        detail: `模块 ${state.excelParseResult.uniqueModules.length} 个，负责人 ${state.excelParseResult.uniqueOwners.length} 个。`,
      };
    });
  }

  function resolveOptionLabel(options: ReportSelectOption[], value: string) {
    return options.find((item) => item.value === value)?.label ?? value;
  }

  function collectGenerationValidationErrors() {
    return collectReportIssues(state).map((issue) => issue.message);
  }

  function buildGeneratorCachePayload(zendaoCache: ReportZendaoRunResult) {
    const successfulAmindResults = state.amindParseResults.filter(
      (item) => item.status === "success",
    );
    const excelResult = state.excelParseResult;
    if (!excelResult || excelResult.status !== "success") {
      throw new Error("Excel 预览结果不可用");
    }

    const requirementColumnLabel =
      excelResult.requirementColumnOptions.find(
        (item) => item.value === excelResult.columnMapping.requirement,
      )?.label ?? excelResult.columnMapping.requirement;
    const moduleColumnLabel =
      excelResult.moduleColumnOptions.find(
        (item) => item.value === excelResult.columnMapping.module,
      )?.label ?? excelResult.columnMapping.module;
    const ownerColumnLabel =
      excelResult.ownerColumnOptions.find(
        (item) => item.value === excelResult.columnMapping.owner,
      )?.label ?? excelResult.columnMapping.owner;

    return createSerializablePayload({
      title: `${resolveOptionLabel(state.zentaoOptions.testTasks, state.form.testTaskId) || "测试报告"}`,
      generatedAt: new Date().toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      meta: {
        reporter: state.form.reporter,
        reviewer: state.form.reviewer,
        zentaoUsername: state.form.zentaoUsername,
        productLabel: resolveOptionLabel(
          state.zentaoOptions.products,
          state.form.productId,
        ),
        projectLabel: resolveOptionLabel(
          state.zentaoOptions.projects,
          state.form.projectId,
        ),
        executionLabel: resolveOptionLabel(
          state.zentaoOptions.executions,
          state.form.executionId,
        ),
        testTaskLabel: resolveOptionLabel(
          state.zentaoOptions.testTasks,
          state.form.testTaskId,
        ),
        buildLabel: resolveOptionLabel(
          state.zentaoOptions.builds,
          state.form.buildId,
        ),
      },
      customFields: state.customFields,
      environments: state.environments.filter((item) => item.enabled),
      amindFiles: state.amindFiles,
      amindResults: successfulAmindResults,
      excelFile: state.excelFile,
      excelResult: {
        ...excelResult,
        requirementColumnLabel,
        moduleColumnLabel,
        ownerColumnLabel,
      },
      testTask: zendaoCache.task,
      zendao: {
        scanned_bug_count: zendaoCache.scanned_bug_count,
        bug_json_file_path: zendaoCache.bug_json_file_path,
        bug_excel_file_paths: zendaoCache.bug_excel_file_paths,
        task: zendaoCache.task,
        version: zendaoCache.version,
        bug: zendaoCache.bug,
        output_dir: zendaoCache.output_dir,
      },
    });
  }

  function persistDraft() {
    if (typeof window === "undefined") return;

    // Browser preview keeps changes in memory. Desktop persistence belongs to ReportService.

  }

  function saveDraftManually() {
    persistDraft();
    state.connectionStatus = {
      type: "success",
      message: "当前需要持久化的内容已保存到本地",
    };
  }

  async function checkAsyncTestLoginStatus(forceOpenDialog = false) {
    state.checkingAsyncTestLogin = true;
    try {
      const currentCookie = asyncTest.cookies.getCookie(GlobalStatus.cookieTag);
      if (currentCookie === false) {
        asyncTest.cookies.clearCookie(GlobalStatus.cookieTag);
        state.asyncTestLoggedIn = false;
        state.showLoginDialog = forceOpenDialog;
        return false;
      }

      const response: any = await ApiCheckPermission({});
      if (response?.result === 0) {
        asyncTest.cookies.clearCookie(GlobalStatus.cookieTag);
        state.asyncTestLoggedIn = false;
        state.showLoginDialog = forceOpenDialog;
        return false;
      }

      state.asyncTestLoggedIn = true;
      state.showLoginDialog = false;
      return true;
    } catch {
      state.asyncTestLoggedIn = false;
      state.showLoginDialog = forceOpenDialog;
      return false;
    } finally {
      state.checkingAsyncTestLogin = false;
    }
  }

  async function loadAsyncTestProjects() {
    const request = ++projectListRequest;
    state.asyncTestProjectsLoading = true;
    try {
      const response: any = await ApiGetJoinProjects({});
      if (request !== projectListRequest) return false;
      const items = Array.isArray(response) ? response : response?.results;
      if (response?.result === 0 || !Array.isArray(items)) {
        throw new Error("获取可访问项目失败，请重试");
      }
      const nameCounts = new Map<string, number>();
      items.forEach((item: any) => {
        if (item?.name)
          nameCounts.set(
            `${item.name}`,
            (nameCounts.get(`${item.name}`) || 0) + 1,
          );
      });
      state.asyncTestProjects = items
        .map((item: any) => {
          if (item?.id === undefined || item?.id === null || !item?.name)
            return null;
          return {
            value: `${item.id}`,
            label:
              (nameCounts.get(`${item.name}`) || 0) > 1
                ? `${item.name} · #${item.id}`
                : `${item.name}`,
          };
        })
        .filter((item): item is ReportSelectOption => !!item);

      if (
        !state.asyncTestProjects.some(
          (item) => item.value === state.asyncTestProjectId,
        )
      ) {
        state.asyncTestProjectId = state.asyncTestProjects[0]?.value || "";
        persistDraft();
      }
      return true;
    } catch {
      if (request !== projectListRequest) return false;
      state.asyncTestProjects = [];
      state.asyncTestProjectId = "";
      persistDraft();
      showToast("error", "获取可访问项目失败，请重试");
      return false;
    } finally {
      if (request === projectListRequest)
        state.asyncTestProjectsLoading = false;
    }
  }

  function handleLoginSuccess() {
    state.showLoginDialog = false;
    state.asyncTestLoggedIn = true;
    void loadAsyncTestProjects();
  }

  function setAsyncTestProjectId(projectId: string) {
    const id = `${projectId ?? ""}`;
    state.asyncTestProjectId = state.asyncTestProjects.some(
      (item) => item.value === id,
    )
      ? id
      : "";
    persistDraft();
  }

  function normalizeAmindSourceFile(
    rawFile: any,
    project: ReportSelectOption | null,
  ): ReportAmindSourceFile | null {
    const downloadUrl =
      `${rawFile?.download_url ?? rawFile?.downloadUrl ?? rawFile?.key ?? rawFile?.url ?? rawFile?.href ?? rawFile?.file_url ?? rawFile?.src ?? ""}`.trim();
    const name = `${rawFile?.name ?? ""}`.trim();
    const path = `${rawFile?.path ?? name}`.trim();
    const extension = `${rawFile?.extension ?? name.split(".").pop() ?? ""}`
      .trim()
      .replace(/^\./, "")
      .toLowerCase();
    if (!name || !downloadUrl || extension !== "amind" || !project) return null;

    return {
      id: `${project.value}::${path || name}`,
      backendFileId: rawFile?.id ?? null,
      projectId: project.value,
      projectName: project.label,
      name,
      path,
      downloadUrl,
      size:
        rawFile?.size === undefined || rawFile?.size === null
          ? null
          : Number(rawFile.size),
      updatedAt: rawFile?.add_time ?? null,
      docxFileType: "xmind",
      boardOptions: [],
      selectedBoardIds: [],
      includeFreeNodes: false,
    };
  }

  function syncAmindFileParseMeta(results: ReportAmindParseResult[]) {
    const resultMap = new Map(
      results
        .filter((item) => item.status === "success")
        .map((item) => [item.fileId, item]),
    );
    state.amindFiles = state.amindFiles.map((file) => {
      const parseResult = resultMap.get(file.id);
      if (!parseResult) return file;
      return {
        ...file,
        boardOptions: parseResult.boardOptions,
        selectedBoardIds: parseResult.selectedBoardIds,
        includeFreeNodes: parseResult.includeFreeNodes,
      };
    });
  }

  function normalizeExcelSourceFile(
    rawFile: any,
    project: ReportSelectOption | null,
  ): ReportExcelSourceFile | null {
    const downloadUrl =
      `${rawFile?.download_url ?? rawFile?.downloadUrl ?? rawFile?.key ?? rawFile?.url ?? rawFile?.href ?? rawFile?.file_url ?? rawFile?.src ?? ""}`.trim();
    const name = `${rawFile?.name ?? ""}`.trim();
    const path = `${rawFile?.path ?? name}`.trim();
    const extension = `${rawFile?.extension ?? name.split(".").pop() ?? ""}`
      .trim()
      .replace(/^\./, "")
      .toLowerCase();
    if (!name || !downloadUrl || extension !== "xlsx" || !project) return null;

    return {
      id: `${project.value}::${path || name}`,
      backendFileId: rawFile?.id ?? null,
      projectId: project.value,
      projectName: project.label,
      name,
      path,
      downloadUrl,
      size:
        rawFile?.size === undefined || rawFile?.size === null
          ? null
          : Number(rawFile.size),
      updatedAt: rawFile?.add_time ?? null,
    };
  }

  function addAmindFiles(files: any[], project: ReportSelectOption | null) {
    const normalizedFiles = files
      .map((file) => normalizeAmindSourceFile(file, project))
      .filter((item): item is ReportAmindSourceFile => !!item);

    if (!normalizedFiles.length) return;

    const replacedIds = new Set(normalizedFiles.map((item) => item.id));
    const nextMap = new Map<string, ReportAmindSourceFile>();
    state.amindFiles.forEach((item) => {
      nextMap.set(item.id, item);
    });
    normalizedFiles.forEach((item) => {
      const existed = nextMap.get(item.id);
      nextMap.set(item.id, {
        ...item,
        docxFileType: existed?.docxFileType ?? item.docxFileType ?? "xmind",
        boardOptions: existed?.boardOptions ?? item.boardOptions ?? [],
        selectedBoardIds:
          existed?.selectedBoardIds ?? item.selectedBoardIds ?? [],
        includeFreeNodes:
          existed?.includeFreeNodes ?? item.includeFreeNodes ?? false,
      });
    });

    state.amindFiles = Array.from(nextMap.values());
    state.amindParseResults = state.amindParseResults.filter(
      (result) => nextMap.has(result.fileId) && !replacedIds.has(result.fileId),
    );
    refreshAmindInputStatus();
    updateAmindParseSummary();
    persistDraft();
    void parseAmindFiles();
  }

  async function importLocalFiles(files: File[], kind: "amind" | "excel") {
    if (!files.length || state.importingLocal || state.generatingReport) return;
    state.importingLocal = true;
    try {
      if (kind === "excel" && files.length !== 1)
        throw new Error("每次请选择一个 Excel 任务分配表");
      const selected = kind === "amind" ? files : files.slice(0, 1);
      const retained = [
        ...state.amindFiles,
        ...(kind === "amind" && state.excelFile ? [state.excelFile] : []),
      ];
      const total = retained
        .filter((file) => file.source === "local")
        .reduce((sum, file) => sum + (file.size || 0), 0);
      const imported: ReportExcelSourceFile[] = [];
      for (const file of selected) {
        const localContentBase64 = await readLocalReportFile(
          file,
          kind === "amind" ? "amind" : "xlsx",
        );
        if (
          kind === "amind" &&
          [...retained, ...imported].some(
            (source) =>
              source.source === "local" &&
              source.name === file.name &&
              source.localContentBase64 === localContentBase64,
          )
        )
          continue;
        if (
          total +
            imported.reduce((sum, source) => sum + (source.size || 0), 0) +
            file.size >
          MAX_LOCAL_TOTAL_BYTES
        )
          throw new Error(
            "本地文件总大小不能超过 100 MB，请移除部分文件后重试",
          );
        imported.push({
          id: `local:${crypto.randomUUID()}`,
          source: "local" as const,
          localContentBase64,
          backendFileId: null,
          projectId: "",
          projectName: "本地文件",
          name: file.name,
          path: file.name,
          downloadUrl: "",
          size: file.size,
          updatedAt: file.lastModified,
        });
      }
      if (disposed) return;
      if (!imported.length) {
        showToast("info", "这些本地文件已在当前列表中，无需重复导入");
        return;
      }
      if (kind === "amind") {
        state.amindFiles.push(
          ...imported.map((file) => ({
            ...file,
            docxFileType: "xmind" as const,
            boardOptions: [],
            selectedBoardIds: [],
            includeFreeNodes: false,
          })),
        );
        refreshAmindInputStatus();
        await parseAmindFiles();
      } else {
        if (state.excelFile) excelWorkbookCache.delete(state.excelFile.id);
        state.excelFile = imported[0];
        state.excelParseResult = null;
        refreshExcelInputStatus();
        await parseExcelFile({ excludedModules: [], excludedOwners: [] });
      }
    } catch (error: any) {
      showToast("error", error?.message || "本地文件导入失败");
      pushLog(
        "error",
        "本地文件导入失败",
        error?.message || "请重新选择文件",
        "sources",
      );
    } finally {
      state.importingLocal = false;
    }
  }

  function removeAmindFile(fileId: string) {
    amindParseRequest += 1;
    state.parsingAmind = false;
    state.amindFiles = state.amindFiles.filter((item) => item.id !== fileId);
    state.amindParseResults = state.amindParseResults.filter(
      (item) => item.fileId !== fileId,
    );
    refreshAmindInputStatus();
    updateAmindParseSummary();
    persistDraft();
    if (state.amindFiles.length) {
      void parseAmindFiles();
    }
  }

  function updateAmindDocxFileType(payload: {
    fileId: string;
    value: "xmind" | "amind";
  }) {
    state.amindFiles = state.amindFiles.map((item) =>
      item.id === payload.fileId
        ? {
            ...item,
            docxFileType: payload.value,
          }
        : item,
    );
    persistDraft();
  }

  function updateAmindSelectedBoards(payload: {
    fileId: string;
    boardIds: string[];
  }) {
    state.amindFiles = state.amindFiles.map((item) =>
      item.id === payload.fileId
        ? {
            ...item,
            selectedBoardIds: payload.boardIds,
          }
        : item,
    );
    persistDraft();
    void parseAmindFiles();
  }

  function updateAmindIncludeFreeNodes(payload: {
    fileId: string;
    value: boolean;
  }) {
    state.amindFiles = state.amindFiles.map((item) =>
      item.id === payload.fileId
        ? {
            ...item,
            includeFreeNodes: payload.value,
          }
        : item,
    );
    persistDraft();
    void parseAmindFiles();
  }

  function addExcelFile(files: any[], project: ReportSelectOption | null) {
    const selectedFile = files
      .map((file) => normalizeExcelSourceFile(file, project))
      .filter((item): item is ReportExcelSourceFile => !!item)
      .slice(-1)[0];

    if (!selectedFile) return;

    if (state.excelFile?.id && state.excelFile.id !== selectedFile.id) {
      excelWorkbookCache.delete(state.excelFile.id);
    }

    state.excelFile = selectedFile;
    state.excelParseResult = null;
    refreshExcelInputStatus();
    updateExcelParseSummary();
    persistDraft();
    void parseExcelFile({
      excludedModules: [],
      excludedOwners: [],
    });
  }

  function removeExcelFile() {
    excelParseRequest += 1;
    state.parsingExcel = false;
    if (state.excelFile?.id) {
      excelWorkbookCache.delete(state.excelFile.id);
    }
    state.excelFile = null;
    state.excelParseResult = null;
    refreshExcelInputStatus();
    updateExcelParseSummary();
    persistDraft();
  }

  async function openAmindDialog() {
    const loggedIn = await checkAsyncTestLoginStatus(true);
    if (!loggedIn) return;

    if (!(await loadAsyncTestProjects())) return;

    state.amindDialogVisible = true;
    setActiveStep("sources");
    markStep("sources", "success");
    markStep("parse", "warning");
  }

  async function openExcelDialog() {
    const loggedIn = await checkAsyncTestLoginStatus(true);
    if (!loggedIn) return;

    if (!(await loadAsyncTestProjects())) return;

    state.excelDialogVisible = true;
    setActiveStep("sources");
    markStep("sources", "success");
    markStep("parse", "warning");
  }

  async function ensureAsyncTestLoginPrompt() {
    await checkAsyncTestLoginStatus(true);
  }

  async function parseAmindFiles() {
    const request = ++amindParseRequest;
    if (!state.amindFiles.length) {
      state.parsingAmind = false;
      return;
    }
    const files = state.amindFiles.map((file) => ({ ...file }));

    state.parsingAmind = true;
    setActiveStep("parse");
    markStep("parse", "pending");
    updateAmindParseSummary();

    const results: ReportAmindParseResult[] = [];
    for (const file of files) {
      if (request !== amindParseRequest || disposed) return;
      try {
        results.push(await parseAmindFile(file));
      } catch (error: any) {
        results.push({
          fileId: file.id,
          fileName: file.name,
          projectId: file.projectId,
          projectName: file.projectName,
          boardId: "",
          boardTitle: "第一个画板",
          boardOptions: file.boardOptions ?? [],
          selectedBoardIds: file.selectedBoardIds ?? [],
          includeFreeNodes: file.includeFreeNodes === true,
          totalCaseCount: 0,
          passedCaseCount: 0,
          failedCaseCount: 0,
          pendingCaseCount: 0,
          reusedCaseCount: 0,
          passRate: "0.00%",
          status: "error",
          errorMessage: error?.message || "解析失败",
        });
      }
    }

    if (request !== amindParseRequest || disposed) return;
    state.amindParseResults = results;
    syncAmindFileParseMeta(results);
    markStep(
      "parse",
      results.some((item) => item.status === "error") ? "warning" : "success",
    );
    updateAmindParseSummary();
    state.parsingAmind = false;
  }

  async function ensureExcelWorkbook(file: ReportExcelSourceFile) {
    const cached = excelWorkbookCache.get(file.id);
    if (cached) return cached;

    const workbook = await loadExcelWorkbook(file);
    excelWorkbookCache.set(file.id, workbook);
    return workbook;
  }

  async function parseExcelFile(overrides?: {
    sheetName?: string;
    columnMapping?: Partial<ReportExcelColumnMapping>;
    excludedModules?: string[];
    excludedOwners?: string[];
    rowFilter?: ReportExcelRowFilter | null;
  }) {
    const request = ++excelParseRequest;
    if (!state.excelFile) {
      state.parsingExcel = false;
      return;
    }
    const sourceFile = { ...state.excelFile };

    state.parsingExcel = true;
    setActiveStep("parse");
    markStep("parse", "pending");

    try {
      const workbook = await ensureExcelWorkbook(sourceFile);
      if (request !== excelParseRequest || disposed) return;
      state.excelParseResult = buildExcelParseResult(sourceFile, workbook, {
        sheetName:
          overrides?.sheetName ?? state.excelParseResult?.selectedSheet,
        columnMapping: {
          ...state.excelParseResult?.columnMapping,
          ...overrides?.columnMapping,
        },
        excludedModules:
          overrides?.excludedModules ??
          state.excelParseResult?.excludedModules ??
          [],
        excludedOwners:
          overrides?.excludedOwners ??
          state.excelParseResult?.excludedOwners ??
          [],
        rowFilter:
          overrides?.rowFilter !== undefined
            ? overrides.rowFilter
            : (state.excelParseResult?.rowFilter ?? null),
      });
      markStep(
        "parse",
        state.excelParseResult.status === "error" ? "warning" : "success",
      );
    } catch (error: any) {
      if (request !== excelParseRequest || disposed) return;
      state.excelParseResult = {
        fileId: state.excelFile.id,
        fileName: state.excelFile.name,
        projectId: state.excelFile.projectId,
        projectName: state.excelFile.projectName,
        status: "error",
        errorMessage: error?.message || "Excel 解析失败",
        sheetOptions: [],
        selectedSheet: "",
        requirementColumnOptions: [],
        moduleColumnOptions: [],
        ownerColumnOptions: [],
        filterColumnOptions: [],
        filterValueOptions: [],
        rowFilter: null,
        sourceRowCount: 0,
        columnMapping: {
          requirement: "",
          module: "",
          owner: "",
        },
        previewRows: [],
        uniqueOwners: [],
        uniqueModules: [],
        hasEmptyModule: false,
        excludedOwners:
          overrides?.excludedOwners ??
          state.excelParseResult?.excludedOwners ??
          [],
        excludedModules:
          overrides?.excludedModules ??
          state.excelParseResult?.excludedModules ??
          [],
        rowCount: 0,
      };
      markStep("parse", "warning");
    } finally {
      if (request === excelParseRequest && !disposed) {
        updateExcelParseSummary();
        state.parsingExcel = false;
      }
    }
  }

  function updateExcelSelectedSheet(sheetName: string) {
    if (!state.excelFile) return;
    void parseExcelFile({
      sheetName,
      rowFilter: null,
      columnMapping: state.excelParseResult?.columnMapping,
      excludedModules: state.excelParseResult?.excludedModules ?? [],
      excludedOwners: state.excelParseResult?.excludedOwners ?? [],
    });
  }

  function updateExcelColumnMapping(payload: {
    key: keyof ReportExcelColumnMapping;
    value: string;
  }) {
    if (!state.excelFile) return;
    void parseExcelFile({
      sheetName: state.excelParseResult?.selectedSheet,
      columnMapping: {
        ...state.excelParseResult?.columnMapping,
        [payload.key]: payload.value,
      },
      excludedModules: state.excelParseResult?.excludedModules ?? [],
      excludedOwners: state.excelParseResult?.excludedOwners ?? [],
    });
  }

  function excludeExcelModule(moduleName: string) {
    if (!state.excelFile || !moduleName.trim()) return;
    const excludedModules = Array.from(
      new Set([...(state.excelParseResult?.excludedModules ?? []), moduleName]),
    );
    void parseExcelFile({
      sheetName: state.excelParseResult?.selectedSheet,
      columnMapping: state.excelParseResult?.columnMapping,
      excludedModules,
      excludedOwners: state.excelParseResult?.excludedOwners ?? [],
    });
  }

  function toggleExcelEmptyModule() {
    if (!state.excelFile) return;
    const currentExcludedModules =
      state.excelParseResult?.excludedModules ?? [];
    const excludedModules = currentExcludedModules.includes(EMPTY_MODULE_LABEL)
      ? currentExcludedModules.filter((item) => item !== EMPTY_MODULE_LABEL)
      : Array.from(new Set([...currentExcludedModules, EMPTY_MODULE_LABEL]));
    void parseExcelFile({
      sheetName: state.excelParseResult?.selectedSheet,
      columnMapping: state.excelParseResult?.columnMapping,
      excludedModules,
      excludedOwners: state.excelParseResult?.excludedOwners ?? [],
    });
  }

  function excludeExcelOwner(ownerName: string) {
    if (!state.excelFile || !ownerName.trim()) return;
    const excludedOwners = Array.from(
      new Set([...(state.excelParseResult?.excludedOwners ?? []), ownerName]),
    );
    void parseExcelFile({
      sheetName: state.excelParseResult?.selectedSheet,
      columnMapping: state.excelParseResult?.columnMapping,
      excludedModules: state.excelParseResult?.excludedModules ?? [],
      excludedOwners,
    });
  }

  function validateZendaoRunInput() {
    if (!state.form.zentaoUsername.trim() || !state.form.zentaoPassword) {
      throw new Error("请先填写禅道账号和密码");
    }

    if (!state.form.productId) {
      throw new Error("请先选择产品");
    }

    if (!state.form.executionId) {
      throw new Error("请先选择执行");
    }

    if (!state.form.testTaskId) {
      throw new Error("请先选择测试单");
    }

    const enabledEnvironments = state.environments.filter(
      (item) => item.enabled,
    );
    if (enabledEnvironments.length === 0) {
      throw new Error("请至少启用一个环境");
    }

    const requiresVersion = enabledEnvironments.some(
      (item) => item.bugRange === "version",
    );
    if (requiresVersion && !state.form.buildId) {
      throw new Error("存在按版本统计的环境，请先选择所属执行版本");
    }
  }

  function addEnvironment() {
    state.environments.push(createEnvironment());
  }

  function removeEnvironment(id: string) {
    if (id === TEST_ENVIRONMENT_ID || id === PRODUCTION_ENVIRONMENT_ID) return;
    state.environments = state.environments.filter((item) => item.id !== id);
  }

  async function ensureZentaoToken(forceRefresh = false): Promise<string> {
    const account = state.form.zentaoUsername.trim();
    const password = state.form.zentaoPassword;

    if (!account || !password) {
      state.connectionStatus = {
        type: "error",
        message: "请先填写禅道账号和密码",
      };
      return "";
    }

    if (!forceRefresh && state.zentaoToken) {
      return state.zentaoToken;
    }

    const response = await axios.post(
      ZENTAO_TOKEN_URL,
      {
        account,
        password,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    const token = extractToken(response?.data);
    if (!token) {
      throw new Error("登录成功但未获取到 token");
    }

    state.zentaoToken = token;
    return token;
  }

  async function loadProducts(force = false) {
    if (!force && state.zentaoOptions.products.length > 0) return;

    const token = await ensureZentaoToken();
    if (!token) return;

    state.zentaoLoading.products = true;
    state.linkageStatus = {
      type: "idle",
      message: "正在加载产品列表...",
    };

    try {
      const response = await axios.get(ZENTAO_PRODUCT_LIST_URL, {
        headers: buildZenTaoHeaders(token),
        timeout: 15000,
      });
      state.zentaoOptions.products = normalizeOptions(response?.data, [
        "products",
        "data",
        "list",
        "items",
      ]);
      state.linkageStatus = {
        type: "success",
        message: `已加载 ${state.zentaoOptions.products.length} 个产品`,
      };
    } catch (error: any) {
      state.linkageStatus = {
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.response?.data?.msg ||
          error?.message ||
          "加载产品失败",
      };
    } finally {
      state.zentaoLoading.products = false;
    }
  }

  async function loadProjects(productId: string) {
    const token = await ensureZentaoToken();
    if (!token || !productId) return;

    state.zentaoLoading.projects = true;
    state.linkageStatus = {
      type: "idle",
      message: "正在加载项目列表...",
    };

    try {
      const response = await axios.get(ZENTAO_PROJECT_LIST_URL, {
        headers: buildZenTaoHeaders(token),
        params: {
          product: productId,
          status: "doing",
        },
        timeout: 15000,
      });
      state.zentaoOptions.projects = normalizeOptions(response?.data, [
        "projects",
        "data",
        "list",
        "items",
      ]);
      state.linkageStatus = {
        type: "success",
        message: `已加载 ${state.zentaoOptions.projects.length} 个项目`,
      };
    } catch (error: any) {
      state.linkageStatus = {
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.response?.data?.msg ||
          error?.message ||
          "加载项目失败",
      };
    } finally {
      state.zentaoLoading.projects = false;
    }
  }

  async function loadExecutions(projectId: string) {
    const token = await ensureZentaoToken();
    if (!token || !projectId) return;

    state.zentaoLoading.executions = true;
    state.linkageStatus = {
      type: "idle",
      message: "正在加载执行列表...",
    };

    try {
      const response = await axios.get(
        `${ZENTAO_API_BASE}/projects/${projectId}/executions`,
        {
          headers: buildZenTaoHeaders(token),
          timeout: 15000,
        },
      );
      state.zentaoOptions.executions = normalizeOptions(response?.data, [
        "executions",
        "data",
        "list",
        "items",
      ]);
      state.linkageStatus = {
        type: "success",
        message: `已加载 ${state.zentaoOptions.executions.length} 个执行`,
      };
    } catch (error: any) {
      state.linkageStatus = {
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.response?.data?.msg ||
          error?.message ||
          "加载执行失败",
      };
    } finally {
      state.zentaoLoading.executions = false;
    }
  }

  async function loadTestTasks(productId: string) {
    const token = await ensureZentaoToken();
    if (!token || !productId) return;

    state.zentaoLoading.testTasks = true;
    state.linkageStatus = {
      type: "idle",
      message: "正在加载测试单列表...",
    };

    try {
      const response = await axios.get(ZENTAO_TESTTASK_LIST_URL, {
        headers: buildZenTaoHeaders(token),
        params: {
          product: productId,
        },
        timeout: 15000,
      });
      state.zentaoOptions.testTasks = normalizeOptions(response?.data, [
        "testtasks",
        "data",
        "list",
        "items",
      ]);
      state.linkageStatus = {
        type: "success",
        message: `已加载 ${state.zentaoOptions.testTasks.length} 个测试单`,
      };
    } catch (error: any) {
      state.linkageStatus = {
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.response?.data?.msg ||
          error?.message ||
          "加载测试单失败",
      };
    } finally {
      state.zentaoLoading.testTasks = false;
    }
  }

  async function loadBuilds(executionId: string) {
    const token = await ensureZentaoToken();
    if (!token || !executionId) return;

    state.zentaoLoading.builds = true;
    state.linkageStatus = {
      type: "idle",
      message: "正在加载版本列表...",
    };

    try {
      const response = await axios.get(
        `${ZENTAO_API_BASE}/executions/${executionId}/builds`,
        {
          headers: buildZenTaoHeaders(token),
          timeout: 15000,
        },
      );
      state.zentaoOptions.builds = normalizeOptions(response?.data, [
        "builds",
        "data",
        "list",
        "items",
      ]);
      state.linkageStatus = {
        type: "success",
        message: `已加载 ${state.zentaoOptions.builds.length} 个版本`,
      };
    } catch (error: any) {
      state.linkageStatus = {
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.response?.data?.msg ||
          error?.message ||
          "加载版本失败",
      };
    } finally {
      state.zentaoLoading.builds = false;
    }
  }

  async function ensureProductsLoaded() {
    if (state.zentaoLoading.products) return;
    await loadProducts(true);
  }

  async function handleProductChange() {
    const productId = state.form.productId;
    state.form.projectId = "";
    state.form.executionId = "";
    state.form.testTaskId = "";
    state.form.buildId = "";
    state.zentaoOptions.projects = [];
    state.zentaoOptions.executions = [];
    state.zentaoOptions.testTasks = [];
    state.zentaoOptions.builds = [];

    if (!productId) return;
    setActiveStep("sources");
    markStep("sources", "success");
    await Promise.all([loadProjects(productId), loadTestTasks(productId)]);
  }

  async function handleProjectChange() {
    const projectId = state.form.projectId;
    state.form.executionId = "";
    state.form.buildId = "";
    state.zentaoOptions.executions = [];
    state.zentaoOptions.builds = [];

    if (!projectId) return;
    setActiveStep("sources");
    markStep("sources", "success");
    await loadExecutions(projectId);
  }

  async function handleExecutionChange() {
    const executionId = state.form.executionId;
    state.form.buildId = "";
    state.zentaoOptions.builds = [];

    if (!executionId) return;
    setActiveStep("sources");
    markStep("sources", "success");
    await loadBuilds(executionId);
  }

  // 每次展开都重新查询当前执行的版本；已加载的选项不能阻止刷新。
  async function ensureBuildsLoaded() {
    if (state.zentaoLoading.builds) return;
    const executionId = state.form.executionId;
    if (!executionId) return;
    await loadBuilds(executionId);
  }

  function triggerInputAction(inputKey: ReportInputKey) {
    const input = state.inputs.find((item) => item.key === inputKey);
    if (!input) return;

    if (inputKey === "amind") {
      void openAmindDialog();
      return;
    }

    if (inputKey === "excel") {
      void openExcelDialog();
      return;
    }

    setActiveStep("sources");
    markStep("sources", "success");
    markStep("parse", "warning");

    if (input.mode === "file") {
      input.statusText = "待接入文件选择器";
      input.selectedText = "选择后立即解析";
    } else {
      input.statusText = "固定参数待补充";
      input.selectedText = "可继续扩展参数项";
    }

    state.parseItems = state.parseItems.map((item) => {
      if (input.key === "amind" && item.id === "amind-summary") {
        return {
          ...item,
          value: "待选择 amind 文件",
          status: "warning",
          detail: "选择 amind 文件后，应立即反馈统计解析结果。",
        };
      }

      if (input.key === "excel" && item.id === "excel-owner") {
        return {
          ...item,
          value: "待选择 Excel 文件",
          status: "warning",
          detail: "选择 Excel 后，应立即反馈模块负责人解析结果。",
        };
      }

      return item;
    });
  }

  async function testZentaoConnection() {
    const account = state.form.zentaoUsername.trim();
    const password = state.form.zentaoPassword;

    if (!account || !password) {
      state.connectionStatus = {
        type: "error",
        message: "请先填写禅道账号和密码",
      };
      return;
    }

    state.testingConnection = true;
    state.connectionStatus = {
      type: "idle",
      message: "正在测试连接...",
    };

    try {
      await ensureZentaoToken(true);
      state.connectionStatus = {
        type: "success",
        message: "连接成功，已缓存 token",
      };
      await loadProducts(true);
    } catch (error: any) {
      state.connectionStatus = {
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.response?.data?.msg ||
          error?.message ||
          "连接失败",
      };
    } finally {
      state.testingConnection = false;
    }
  }

  async function runZendaoPreview() {
    if (!window.electronAPI?.generator?.runZendao) {
      pushLog(
        "error",
        "运行环境不支持",
        "当前环境不是 Electron，无法执行临时禅道 Run。",
        "parse",
      );
      return;
    }

    try {
      validateZendaoRunInput();
    } catch (error: any) {
      pushLog(
        "error",
        "参数校验失败",
        error?.message || "请先完善禅道 Run 所需参数。",
        "parse",
      );
      return;
    }

    state.runningZendaoRun = true;
    state.logs = [];
    persistDraft();
    setActiveStep("parse");
    markStep("parse", "pending");
    pushLog(
      "info",
      "开始解析禅道 BUG",
      "正在按当前环境配置拉取并统计 BUG。",
      "parse",
    );

    try {
      const result = (await window.electronAPI.generator.runZendao({
        form: createSerializablePayload(state.form),
        environments: createSerializablePayload(state.environments),
        customFields: createSerializablePayload(state.customFields),
      })) as ReportZendaoRunResult;

      state.latestZendaoRunResult = result;
      markStep("parse", "success");
      pushLog(
        "success",
        "禅道 BUG 解析完成",
        `已完成 BUG 统计，共扫描 ${result.scanned_bug_count} 条。`,
        "parse",
      );
    } catch (error: any) {
      markStep("parse", "warning");
      pushLog(
        "error",
        "禅道 BUG 解析失败",
        error?.message || "执行过程中发生未知错误。",
        "parse",
      );
    } finally {
      state.runningZendaoRun = false;
    }
  }

  async function runZendaoForGeneration() {
    if (!window.electronAPI?.generator?.runZendao) {
      throw new Error("当前环境不是 Electron，无法执行禅道缺陷获取。");
    }

    state.runningZendaoRun = true;
    pushLog(
      "info",
      "开始解析禅道 BUG",
      "生成前正在刷新当前环境的 BUG 统计。",
      "generate",
    );

    try {
      const result = (await window.electronAPI.generator.runZendao({
        form: createSerializablePayload(state.form),
        environments: createSerializablePayload(state.environments),
        customFields: createSerializablePayload(state.customFields),
      })) as ReportZendaoRunResult;

      state.latestZendaoRunResult = result;
      pushLog(
        "success",
        "禅道 BUG 解析完成",
        `已完成 BUG 统计，共扫描 ${result.scanned_bug_count} 条。`,
        "generate",
      );
      return result;
    } catch (error: any) {
      throw new Error(error?.message || "禅道缺陷获取失败");
    } finally {
      state.runningZendaoRun = false;
    }
  }

  async function loadRecentExports() {
    if (!window.electronAPI?.generator?.getRecentExports) {
      return;
    }
    try {
      const result = await window.electronAPI.generator.getRecentExports();
      applyRecentExports(result?.recentExports || []);
    } catch {
      applyRecentExports([]);
    }
  }

  async function saveRecentExport(recordId: string) {
    if (
      !recordId ||
      !window.electronAPI?.generator?.saveRecentExport ||
      state.savingRecentExportId
    ) {
      return;
    }

    state.savingRecentExportId = recordId;
    try {
      const result = await window.electronAPI.generator.saveRecentExport({
        id: recordId,
      });
      applyRecentExports(result?.recentExports || state.recentExports);
      if (result?.canceled) {
        return;
      }
      showToast("success", "测试报告已保存到你选择的目录");
    } catch (error: any) {
      showToast("error", error?.message || "保存测试报告失败");
    } finally {
      state.savingRecentExportId = "";
    }
  }

  async function startGenerationPreview() {
    if (state.generatingReport) return false;
    if (!window.electronAPI?.generator?.exportDocxPackage) {
      pushLog(
        "error",
        "运行环境不支持",
        "当前环境不是 Electron，无法生成测试报告。",
        "generate",
      );
      return;
    }

    const validationErrors = collectGenerationValidationErrors();

    setActiveStep("generate");
    state.logs = [];
    persistDraft();
    markStep("generate", validationErrors.length ? "warning" : "pending");

    if (validationErrors.length) {
      pushLog(
        "error",
        "生成前校验失败",
        validationErrors.join("\n"),
        "generate",
      );
      return;
    }

    pushLog("info", "生成前校验通过", "报告参数与预览结果已就绪。", "generate");

    state.generatingReport = true;
    try {
      const zendaoCache = await runZendaoForGeneration();
      pushLog(
        "info",
        "开始生成测试报告",
        "正在按启用环境生成 DOCX 报告。",
        "generate",
      );
      const payload = buildGeneratorCachePayload(
        zendaoCache as ReportZendaoRunResult,
      );
      const auth = resolveBackendAuth();
      const result = await window.electronAPI.generator.exportDocxPackage({
        payload,
        auth,
      });
      markStep("generate", "success");
      applyRecentExports(result?.recentExports || [], true);
      pushLog(
        "success",
        "测试报告生成完成",
        "报告已加入最近生成记录，请在下方手动点击保存。",
        "generate",
      );
      showToast("success", "测试报告生成结束");
      return true;
    } catch (error: any) {
      markStep("generate", "warning");
      pushLog(
        "error",
        "测试报告生成失败",
        error?.message || "生成过程中发生未知错误。",
        "generate",
      );
      showToast("error", error?.message || "测试报告生成失败");
      return false;
    } finally {
      state.generatingReport = false;
    }
  }

  async function hydratePersistedSelections() {
    if (!persistedDraft?.zentaoUsername || !persistedDraft?.zentaoPassword)
      return;
    if (!persistedDraft?.productId) return;

    try {
      await loadProducts(true);
      if (persistedDraft.productId) {
        await loadTestTasks(persistedDraft.productId);
      }
      if (persistedDraft.projectId) {
        await loadProjects(persistedDraft.productId);
        await loadExecutions(persistedDraft.projectId);
      }
      if (persistedDraft.executionId) {
        await loadBuilds(persistedDraft.executionId);
      }
    } catch {
      // ignore hydration failures
    }
  }

  refreshAmindInputStatus();
  updateAmindParseSummary();
  refreshExcelInputStatus();
  updateExcelParseSummary();
  void checkAsyncTestLoginStatus();
  void hydratePersistedSelections();
  void loadRecentExports();

  return {
    state,
    clearPassword: () => { state.form.zentaoPassword = ""; },
    setPasswordEditing: (_editing: boolean) => {},
    reloadServiceState: async () => {},
    cancelGeneration: async () => {},
    activateAssignment: (_id: string) => {},
    importSourceDirectory: async () => { showToast("error", "请在 AsyncTest 桌面端使用目录导入"); },
    addEnvironment,
    removeEnvironment,
    triggerInputAction,
    ensureProductsLoaded,
    ensureProjectsLoaded: () => loadProjects(state.form.productId),
    ensureExecutionsLoaded: () => loadExecutions(state.form.projectId),
    ensureTestTasksLoaded: () => loadTestTasks(state.form.productId),
    ensureBuildsLoaded,
    handleProductChange,
    handleProjectChange,
    handleExecutionChange,
    testZentaoConnection,
    saveDraftManually,
    runZendaoPreview,
    handleLoginSuccess,
    ensureAsyncTestLoginPrompt,
    loadAsyncTestProjects,
    setAsyncTestProjectId,
    addAmindFiles,
    importLocalFiles,
    collectGenerationValidationErrors,
    removeAmindFile,
    updateAmindDocxFileType,
    updateAmindSelectedBoards,
    updateAmindIncludeFreeNodes,
    addExcelFile,
    removeExcelFile,
    parseAmindFiles,
    parseExcelFile,
    updateExcelSelectedSheet,
    updateExcelColumnMapping,
    excludeExcelModule,
    toggleExcelEmptyModule,
    excludeExcelOwner,
    saveRecentExport,
    startGenerationPreview,
  };
}
