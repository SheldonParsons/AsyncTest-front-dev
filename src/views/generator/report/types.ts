export type ReportStepKey = "draft" | "sources" | "parse" | "generate";

export type ReportSeverity = "info" | "success" | "warning" | "error";

export type ReportInputKey = "amind" | "excel" | "custom";

export type ParseStatus = "idle" | "ready" | "pending" | "success" | "warning";

export type ReportEnvironmentKind = "test" | "production" | "custom";
export type ReportBugRange = "version" | "execution";

export type ReportEnvironmentConfig = {
  id: string;
  kind: ReportEnvironmentKind;
  enabled: boolean;
  name: string;
  bugFilterKeyword: string;
  bugExcludeKeyword: string;
  bugRange: ReportBugRange;
  filterBugWithoutSolution: boolean;
  includeDate: boolean;
  reportDate: string;
  envUrl: string;
  gitlabUrl: string;
  conclusion: string;
  projectRisk: string;
};

export type ReportCustomFields = {
  zendaoBugLimit: number;
  qualityResult: string;
  secrecyLevel: string;
  testTypes: string;
  actualResult: string;
};

export type ReportDraftForm = {
  reporter: string;
  reviewer: string;
  zentaoUsername: string;
  zentaoPassword: string;
  productId: string;
  projectId: string;
  executionId: string;
  testTaskId: string;
  buildId: string;
};

export type ReportStatusState = {
  type: "idle" | "success" | "error";
  message: string;
};

export type ReportSelectOption = {
  value: string;
  label: string;
};

export type ReportInputItem = {
  key: ReportInputKey;
  title: string;
  description: string;
  required: boolean;
  mode: "file" | "fixed";
  statusText: string;
  hint: string;
  actionLabel: string;
  selectedText: string;
};

export type ReportParseItem = {
  id: string;
  title: string;
  value: string;
  status: ParseStatus;
  detail: string;
};

export type ReportLogEntry = {
  id: string;
  mergeKey?: string;
  step: ReportStepKey;
  level: ReportSeverity;
  title: string;
  detail: string;
  timestamp: string;
};

export type ReportRecentExportRecord = {
  id: string;
  fileName: string;
  title: string;
  createdAt: string;
  size: number;
  envNames: string[];
};

export type ReportZendaoRunResult = {
  bug: Record<string, any>;
  task: Record<string, any> | null;
  version: Record<string, any> | null;
  bug_json_file_path: string;
  bug_excel_file_paths: Record<string, string>;
  output_dir: string;
  scanned_bug_count: number;
};

export type ReportAmindSourceFile = {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  path: string;
  downloadUrl: string;
  size: number | null;
  updatedAt: string | number | null;
  docxFileType: "xmind" | "amind";
};

export type ReportExcelSourceFile = {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  path: string;
  downloadUrl: string;
  size: number | null;
  updatedAt: string | number | null;
};

export type ReportAmindParseResult = {
  fileId: string;
  fileName: string;
  projectId: string;
  projectName: string;
  boardId: string;
  boardTitle: string;
  totalCaseCount: number;
  passedCaseCount: number;
  failedCaseCount: number;
  pendingCaseCount: number;
  reusedCaseCount: number;
  passRate: string;
  status: "success" | "error";
  errorMessage: string;
};

export type ReportExcelColumnMapping = {
  requirement: string;
  module: string;
  owner: string;
};

export type ReportExcelPreviewRow = {
  id: string;
  module: string;
  requirement: string;
  owner: string;
  showModule: boolean;
  showRequirement: boolean;
  showOwner: boolean;
  moduleRowSpan: number;
  requirementRowSpan: number;
  ownerRowSpan: number;
};

export type ReportExcelParseResult = {
  fileId: string;
  fileName: string;
  projectId: string;
  projectName: string;
  status: "success" | "error";
  errorMessage: string;
  sheetOptions: ReportSelectOption[];
  selectedSheet: string;
  requirementColumnOptions: ReportSelectOption[];
  moduleColumnOptions: ReportSelectOption[];
  ownerColumnOptions: ReportSelectOption[];
  columnMapping: ReportExcelColumnMapping;
  previewRows: ReportExcelPreviewRow[];
  uniqueOwners: string[];
  uniqueModules: string[];
  excludedOwners: string[];
  excludedModules: string[];
  rowCount: number;
};

export type ReportStep = {
  key: ReportStepKey;
  title: string;
  description: string;
  status: ParseStatus;
};

export type ReportDraftState = {
  form: ReportDraftForm;
  environments: ReportEnvironmentConfig[];
  customFields: ReportCustomFields;
  inputs: ReportInputItem[];
  parseItems: ReportParseItem[];
  logs: ReportLogEntry[];
  recentExports: ReportRecentExportRecord[];
  recentExportsFlashToken: number;
  savingRecentExportId: string;
  steps: ReportStep[];
  activeStep: ReportStepKey;
  generationReady: boolean;
  testingConnection: boolean;
  connectionStatus: ReportStatusState;
  linkageStatus: ReportStatusState;
  zentaoToken: string;
  zentaoOptions: {
    products: ReportSelectOption[];
    projects: ReportSelectOption[];
    executions: ReportSelectOption[];
    testTasks: ReportSelectOption[];
    builds: ReportSelectOption[];
  };
  zentaoLoading: {
    products: boolean;
    projects: boolean;
    executions: boolean;
    testTasks: boolean;
    builds: boolean;
  };
  runningZendaoRun: boolean;
  latestZendaoRunResult: ReportZendaoRunResult | null;
  asyncTestLoggedIn: boolean;
  checkingAsyncTestLogin: boolean;
  showLoginDialog: boolean;
  amindDialogVisible: boolean;
  excelDialogVisible: boolean;
  asyncTestProjectId: string;
  asyncTestProjects: ReportSelectOption[];
  asyncTestProjectsLoading: boolean;
  amindFiles: ReportAmindSourceFile[];
  amindParseResults: ReportAmindParseResult[];
  parsingAmind: boolean;
  excelFile: ReportExcelSourceFile | null;
  excelParseResult: ReportExcelParseResult | null;
  parsingExcel: boolean;
};
