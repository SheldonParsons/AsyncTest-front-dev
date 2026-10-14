import { onBeforeUnmount, watch } from 'vue';
import asyncTest from '@/db';
import GlobalStatus from '@/global';
import { ApiGetJoinProjects } from '@/api/project/index';
import type { ReportDraftState, ReportSelectOption, ReportExcelColumnMapping, ReportExcelRowFilter } from './types';
import { collectReportIssues } from './validation';
import { importReportSourceDirectory } from './sourceDirectory';

const storageKey = 'generator:test-report:draft';
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export async function initializeReportService() {
  const api = window.electronAPI?.report;
  if (!api) return;
  const raw = localStorage.getItem(storageKey);
  let legacy = null;
  if (raw) { try { legacy = JSON.parse(raw); } catch { throw new Error('旧报告配置无法解析，原记录已保留'); } }
  const result = await api.migrate(legacy);
  if (!result.ok) throw new Error(result.summary);
  // Only remove legacy storage after the Main transaction has fsynced and acknowledged.
  if (result.data?.migrationVersion === 1) localStorage.removeItem(storageKey);
  await syncReportAuth();
}
export async function syncReportAuth() {
  const api = window.electronAPI?.report; if (!api) return;
  const token = asyncTest.cookies.getCookie(GlobalStatus.cookieTag);
  const baseURL = import.meta.env.DEV ? 'http://localhost:6001' : import.meta.env.VITE_API_URL;
  await api.setAuth(token && baseURL ? { token: String(token), baseURL, siteOrigins: [new URL(baseURL).origin] } : null);
}

export function useReportServiceProjection(state: ReportDraftState) {
  const api = window.electronAPI.report;
  state.serviceReady = false; state.saveStatus = '正在读取共享草稿';
  let context: any, baseline: any, expected: any, applying = false, disposed = false, timer: ReturnType<typeof setTimeout> | undefined;
  let localGeneration = false;
  let pending = false, saving = false, conflicted = false, queue: Promise<any> = Promise.resolve();
  const toast = (type: 'error' | 'success' | 'info', title: string) => window.$toast({ type, title });
  const local = () => copy({ ...state.form, asyncTestProjectId: state.asyncTestProjectId, environments: state.environments, customFields: state.customFields });
  const log = (title: string, detail = '', level: 'info' | 'error' | 'success' = 'info') => state.logs.unshift({ id: crypto.randomUUID(), step: 'generate', level, title, detail, timestamp: new Date().toLocaleTimeString('zh-CN') });
  const metadata = () => ({ workspaceId: context?.workspaceId, expectedRevisions: copy(context?.revisions), requestId: crypto.randomUUID() });
  async function call(name: string, args: any = {}) {
    const result = await api.call(name, copy(args));
    if (!result.ok) throw Object.assign(new Error(result.summary), { code: result.error?.code, details: result.error?.details });
    return result;
  }
  function options(config: any) {
    const entities = { productId: 'products', projectId: 'projects', executionId: 'executions', testTaskId: 'testTasks', buildId: 'builds' } as const;
    for (const [field, entity] of Object.entries(entities)) {
      const value = config[field]; if (value && !state.zentaoOptions[entity].some(option => option.value === value)) state.zentaoOptions[entity].push({ value, label: config.scopeLabels?.[field] || '已保存的选择（打开以读取名称）' });
    }
  }
  async function pull() {
    const result = await call('report_get_context', context?.workspaceId ? { workspaceId: context.workspaceId } : {});
    if (disposed) return;
    const projection = result.data.projection; applying = true;
    try {
      if (!pending && !saving) {
        context = result;
        for (const key of Object.keys(state.form)) (state.form as any)[key] = key === 'zentaoPassword' ? '' : projection.config[key] || '';
        state.asyncTestProjectId = projection.config.asyncTestProjectId || '';
        state.environments = projection.config.environments; state.customFields = projection.config.customFields; baseline = local(); expected = copy(result.revisions);
      }
      state.passwordConfigured = projection.config.passwordConfigured;
      state.workspaceId = result.workspaceId; state.reportIds = Object.values(result.data.reports);
      const activeOperation = result.data.operations?.find((operation: any) => ['accepted', 'running', 'cancelling'].includes(operation.status) && operation.kind !== 'import');
      state.generatingReport = localGeneration || !!activeOperation;
      if (activeOperation) { state.operationId = activeOperation.id; if (!localGeneration && activeOperation.lastEvent) state.logs = [{ id: `${activeOperation.id}-${activeOperation.lastEvent.sequence}`, step: 'generate', level: 'info', title: activeOperation.lastEvent.message, detail: '已恢复正在进行的报告作业', timestamp: new Date(activeOperation.lastEvent.at).toLocaleTimeString('zh-CN') }]; }
      state.amindFiles = projection.amindFiles; state.amindParseResults = projection.amindParseResults;
      state.excelFile = projection.excelFile; state.excelParseResult = projection.excelParseResult;
      state.assignmentCandidates = result.data.sources.filter((source: any) => source.role === 'assignment').map((source: any) => ({ value: source.id, label: source.name }));
      state.sourceRevisions = Object.fromEntries(result.data.sources.map((source: any) => [source.id, source.parseRevision]));
      state.snapshots = result.data.snapshots; options(projection.config);
      state.connectionStatus = { type: 'idle', message: state.passwordConfigured ? '密码已保存在系统安全存储，可测试连接' : '请填写禅道账号和密码' };
      state.saveStatus = conflicted ? '保存冲突 · 本地输入已保留' : pending ? '尚未提交' : '配置已保存';
      state.serviceReady = true;
      state.inputs.find(item => item.key === 'amind')!.statusText = state.amindFiles.length ? `已加入 ${state.amindFiles.length} 个 amind 文件` : '待选择文件';
      state.inputs.find(item => item.key === 'excel')!.statusText = state.excelFile ? '已选择 1 个 Excel 文件' : '待选择文件';
    } finally { applying = false; }
  }
  function makePatch(before: any, after: any) {
    const patch: any = {}; const environmentOperations: any[] = [];
    if (before.asyncTestProjectId !== after.asyncTestProjectId) patch.asyncTestProjectId = after.asyncTestProjectId;
    for (const key of Object.keys(state.form)) if (!equal(before[key], after[key])) patch[key] = after[key];
    for (const key of Object.keys(after.customFields)) if (!equal(before.customFields[key], after.customFields[key])) { patch.customFields ||= {}; patch.customFields[key] = after.customFields[key]; }
    for (const env of after.environments) {
      const old = before.environments.find((item: any) => item.id === env.id);
      const values = Object.fromEntries(Object.entries(env).filter(([key]) => !['id', 'kind'].includes(key)));
      if (!old) environmentOperations.push({ op: 'add', id: env.id, values });
      else { const fields = Object.fromEntries(Object.entries(values).filter(([key, value]) => !equal(old[key], value))); if (Object.keys(fields).length) environmentOperations.push({ op: 'update', id: env.id, patch: fields }); }
    }
    for (const old of before.environments) if (!after.environments.some((env: any) => env.id === old.id)) environmentOperations.push({ op: 'remove', id: old.id });
    return { patch, environmentOperations };
  }
  async function save() {
    if (!pending || !context || saving) return;
    if (conflicted) throw new Error('配置发生版本冲突，本地输入已保留；请点击重新载入后再修改');
    const captured = local(), patch = makePatch(baseline, captured);
    if (!Object.keys(patch.patch).length && !patch.environmentOperations.length) { pending = false; return; }
    saving = true; state.saveStatus = '正在保存';
    try {
      const result = await call('report_update_settings', { ...metadata(), expectedRevisions: expected, target: 'defaults_and_workspace', ...patch });
      context.revisions = result.revisions; expected = copy(result.revisions); baseline = captured;
      applying = true; if (state.form.zentaoPassword === captured.zentaoPassword) state.form.zentaoPassword = ''; baseline.zentaoPassword = ''; applying = false;
      pending = !equal(local(), baseline); state.saveStatus = pending ? '尚未提交' : '配置已保存';
    } catch (error: any) { conflicted = error.code === 'REVISION_CONFLICT'; state.saveStatus = conflicted ? '保存冲突 · 本地输入已保留' : '尚未提交'; throw error; }
    finally { saving = false; }
    if (!pending) await pull();
  }
  function serialized<T>(action: () => Promise<T>): Promise<T> { const result = queue.then(action); queue = result.catch(() => {}); return result; }
  const flush = () => serialized(save);
  watch(local, () => {
    if (applying || !baseline) return;
    pending = !equal(local(), baseline); state.saveStatus = pending ? '尚未提交' : '配置已保存';
    clearTimeout(timer); timer = setTimeout(() => void flush().catch((error: Error) => toast('error', error.message)), 400);
  }, { deep: true, flush: 'sync' });
  async function mutate(name: string, args: any = {}) {
    return serialized(async () => { await save(); const result = await call(name, { ...metadata(), ...args }); await pull(); return result; });
  }
  async function action(name: string, args: any = {}) { try { return await mutate(name, args); } catch (error: any) { toast('error', error.message); return null; } }
  const removeListener = api.onChanged(() => { if (!disposed && !saving) void serialized(async () => { await pull(); await loadRecentExports(); }).catch(() => {}); });
  onBeforeUnmount(() => { disposed = true; clearTimeout(timer); removeListener(); void flush().catch(() => {}); });
  async function reloadServiceState() { pending = false; conflicted = false; await serialized(pull); }
  async function query(entity: keyof ReportDraftState['zentaoOptions'], parent = {}) {
    await flush(); const account = state.form.zentaoUsername; state.zentaoLoading[entity] = true;
    try {
      const items: ReportSelectOption[] = []; let cursor: string | undefined;
      do { const result = await call('report_query_scope', { workspaceId: context.workspaceId, entity, parent, readPolicy: 'online', limit: 100, ...(cursor ? { cursor } : {}) }); items.push(...result.data.items.map((item: any) => ({ value: item.id, label: item.name }))); cursor = result.data.nextCursor || undefined; } while (cursor);
      const parentKey = ({ projects: 'productId', executions: 'projectId', testTasks: 'productId', builds: 'executionId' } as Record<string, string>)[entity];
      if (account !== state.form.zentaoUsername || parentKey && (parent as any)[parentKey] !== (state.form as any)[parentKey]) return;
      state.zentaoOptions[entity] = items; state.linkageStatus = { type: 'success', message: `已加载 ${items.length} 个候选` };
    } catch (error: any) { state.linkageStatus = { type: 'error', message: error.message }; }
    finally { state.zentaoLoading[entity] = false; }
  }
  async function testZentaoConnection() {
    state.testingConnection = true;
    try { await flush(); await call('report_test_connection', { workspaceId: context.workspaceId, provider: 'zentao' }); state.connectionStatus = { type: 'success', message: '连接验证成功' }; await query('products'); }
    catch (error: any) { state.connectionStatus = { type: 'error', message: error.message }; }
    finally { state.testingConnection = false; }
  }
  async function loadAsyncTestProjects() {
    state.asyncTestProjectsLoading = true;
    try { await syncReportAuth(); const response: any = await ApiGetJoinProjects({}); const items = Array.isArray(response) ? response : response?.results; if (!Array.isArray(items)) throw new Error('请先登录 AsyncTest'); state.asyncTestProjects = items.map((item: any) => ({ value: String(item.id), label: `${item.name} · #${item.id}` })); state.asyncTestLoggedIn = true; if (!state.asyncTestProjects.some(item => item.value === state.asyncTestProjectId)) state.asyncTestProjectId = state.asyncTestProjects[0]?.value || ''; return true; }
    catch (error: any) { state.asyncTestLoggedIn = false; state.asyncTestProjects = []; state.showLoginDialog = true; toast('error', error.message || '获取可访问项目失败'); return false; }
    finally { state.asyncTestProjectsLoading = false; }
  }
  async function openAmindDialog() { if (await loadAsyncTestProjects()) state.amindDialogVisible = true; }
  async function openExcelDialog() { if (await loadAsyncTestProjects()) state.excelDialogVisible = true; }
  async function importLocalFiles(files: File[], kind: 'amind' | 'excel') {
    if (state.importingLocal || state.importingDirectory || state.generatingReport || !files.length) return; state.importingLocal = true;
    try {
      const inputs: Array<{ name: string; bytes?: Uint8Array; localPath?: string }> = [];
      for (const file of files) { if (!file.size || file.size > 50 * 1024 ** 2 || !(kind === 'amind' ? /\.amind$/i : /\.xlsx$/i).test(file.name)) throw new Error('请选择有效文件（单份不超过 50 MB）'); const localPath = api.getLocalFilePath?.(file); inputs.push(localPath ? { name: file.name, localPath } : { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }); }
      await serialized(async () => { await save(); const result = await api.importFiles({ ...metadata(), files: inputs }); if (!result.ok) throw new Error(result.summary); await pull(); if (kind === 'excel') { const sourceId = result.data.sourceIds[0] || result.data.alreadyAttached[0]; if (sourceId) { await call('report_update_sources', { ...metadata(), operations: [{ op: 'activate_assignment', sourceId }] }); await pull(); } } });
    } catch (error: any) { toast('error', error.message); }
    finally { state.importingLocal = false; }
  }
  async function importSourceDirectory() {
    if (state.importingDirectory || state.importingLocal || state.generatingReport || !state.serviceReady) return;
    state.importingDirectory = true;
    state.directoryImportStatus = { type: 'idle', message: '正在读取目录…' };
    try {
      await flush();
      await syncReportAuth();
      const result = await importReportSourceDirectory({
        folderUrl: state.sourceDirectoryUrl, call, mutate,
        progress: message => { if (!disposed) state.directoryImportStatus = { type: 'idle', message }; },
        disposed: () => disposed,
      });
      if (!result || disposed) return;
      await serialized(pull);
      state.directoryImportStatus = { type: 'success', message: result.message };
    } catch (error: any) {
      if (!disposed) {
        state.directoryImportStatus = { type: 'error', message: error.message || '目录导入未完成，请重试' };
        if (error.code === 'AUTH_REQUIRED') state.showLoginDialog = true;
      }
    } finally { state.importingDirectory = false; }
  }
  async function importProject(files: any[], project: ReportSelectOption | null, activate: boolean) {
    if (!project) return;
    const siteOrigin = new URL(import.meta.env.DEV ? 'http://localhost:6001' : import.meta.env.VITE_API_URL).origin;
    try { await syncReportAuth(); await serialized(async () => { await save(); const result = await api.importProjectFiles({ ...metadata(), files: files.map(file => ({ fileId: String(file.id), folderUrl: `${siteOrigin}/home/main/project/${project.value}/settings/source/files/${String(file.folder || file.path?.split('/').slice(0, -1).join('/') || '').split('/').map(encodeURIComponent).join('/')}` })) }); if (!result.ok) throw new Error(result.summary); await pull(); if (activate) { const sourceId = result.data.sourceIds[0] || result.data.alreadyAttached[0]; if (sourceId) { await call('report_update_sources', { ...metadata(), operations: [{ op: 'activate_assignment', sourceId }] }); await pull(); } } }); }
    catch (error: any) { toast('error', error.message); }
  }
  const sources = (operations: any[]) => action('report_update_sources', { operations });
  async function parseExcelFile(overrides: { sheetName?: string; columnMapping?: Partial<ReportExcelColumnMapping>; excludedModules?: string[]; excludedOwners?: string[]; rowFilter?: ReportExcelRowFilter | null } = {}) {
    if (!state.excelFile) return;
    const { sheetName, ...rest } = overrides; state.parsingExcel = true;
    try { await action('report_configure_assignment', { sourceId: state.excelFile.id, parseRevision: state.sourceRevisions?.[state.excelFile.id], patch: { ...rest, ...(sheetName ? { selectedSheet: sheetName } : {}) } }); }
    finally { state.parsingExcel = false; }
  }
  async function loadRecentExports() { if (!context) return; const result = await call('report_list_history', { workspaceId: context.workspaceId, kind: 'exports', limit: 100 }); state.recentExports = result.data.items; }
  async function startGenerationPreview() {
    if (state.generatingReport || state.importingDirectory || state.importingLocal) return false;
    localGeneration = true; state.generatingReport = true; state.logs = [];
    try {
      const dataPolicy = state.dataPolicy === 'snapshot' ? { mode: 'snapshot', snapshotId: state.selectedSnapshotId, acceptSnapshotDifferences: true } : { mode: state.dataPolicy || 'refresh' };
      const result = await mutate('report_generate', { dataPolicy, output: 'zip' });
      if (!result.operationId) throw new Error(result.issues?.map((issue: any) => issue.message).join('\n') || result.summary);
      state.operationId = result.operationId; let afterEvent = 0;
      while (!disposed) {
        const operation = await call('report_get_operation', { operationId: result.operationId, afterEvent });
        for (const event of operation.data.events || []) { log(event.message); afterEvent = event.sequence; }
        if (operation.status === 'completed') { await pull(); await loadRecentExports(); state.recentExportsFlashToken++; toast('success', '报告已生成，可编辑正文或保存'); return true; }
        if (['failed', 'interrupted', 'cancelled'].includes(operation.status)) throw new Error(operation.data.summary);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) { log('生成未完成', error.message, 'error'); toast('error', error.message); }
    finally { localGeneration = false; state.generatingReport = false; }
    return false;
  }
  async function saveRecentExport(recordId: string) {
    state.savingRecentExportId = recordId;
    try { const result = await api.saveArtifact(recordId); if (!result.ok && !result.canceled) throw new Error(result.summary); if (!result.canceled) toast('success', '报告已另存'); }
    catch (error: any) { toast('error', error.message); }
    finally { state.savingRecentExportId = ''; }
  }
  void initializeReportService().then(pull).then(loadRecentExports).catch((error: Error) => { state.saveStatus = '服务尚未就绪'; toast('error', error.message); });
  return {
    state, reloadServiceState, flushReportSettings: flush, reportCall: call, reportMutation: mutate,
    addEnvironment: () => state.environments.push({ id: `env-${crypto.randomUUID()}`, kind: 'custom', name: '', enabled: true, bugFilterKeyword: '', bugExcludeKeyword: '', bugRange: 'version', filterBugWithoutSolution: true, includeDate: false, reportDate: '', envUrl: '', gitlabUrl: '', conclusion: '测试通过', projectRisk: '暂无' }),
    removeEnvironment: (id: string) => { state.environments = state.environments.filter(env => env.id !== id || env.kind !== 'custom'); },
    ensureProjectsLoaded: () => query('projects', { productId: state.form.productId }),
    ensureExecutionsLoaded: () => query('executions', { projectId: state.form.projectId }),
    ensureTestTasksLoaded: () => query('testTasks', { productId: state.form.productId }),
    ensureProductsLoaded: () => query('products'), ensureBuildsLoaded: () => state.form.executionId ? query('builds', { executionId: state.form.executionId }) : undefined,
    handleProductChange: async () => { await flush(); await Promise.all([query('projects', { productId: state.form.productId }), query('testTasks', { productId: state.form.productId })]); },
    handleProjectChange: async () => { await flush(); await query('executions', { projectId: state.form.projectId }); },
    handleExecutionChange: async () => { await flush(); await query('builds', { executionId: state.form.executionId }); },
    clearPassword: () => action('report_update_settings', { target: 'defaults_and_workspace', patch: { zentaoPassword: null } }),
    testZentaoConnection, saveDraftManually: () => void flush().then(() => toast('success', '配置已保存')).catch(error => toast('error', error.message)),
    triggerInputAction: (key: string) => key === 'amind' ? openAmindDialog() : openExcelDialog(),
    runZendaoPreview: startGenerationPreview, startGenerationPreview, saveRecentExport,
    cancelGeneration: () => state.operationId ? action('report_cancel_operation', { operationId: state.operationId }) : undefined,
    handleLoginSuccess: () => { state.showLoginDialog = false; void loadAsyncTestProjects(); }, ensureAsyncTestLoginPrompt: loadAsyncTestProjects, loadAsyncTestProjects,
    setAsyncTestProjectId: (id: string) => { state.asyncTestProjectId = id; },
    addAmindFiles: (files: any[], project: ReportSelectOption | null) => void importProject(files, project, false), addExcelFile: (files: any[], project: ReportSelectOption | null) => void importProject(files, project, true), importLocalFiles, importSourceDirectory,
    removeAmindFile: (id: string) => void sources([{ op: 'detach', sourceId: id }]), removeExcelFile: () => state.excelFile ? void sources([{ op: 'detach', sourceId: state.excelFile.id }]) : undefined,
    activateAssignment: (id: string) => void sources([{ op: 'activate_assignment', sourceId: id }]),
    updateAmindDocxFileType: (value: { fileId: string; value: string }) => void sources([{ op: 'set_attachment_format', sourceId: value.fileId, docxFileType: value.value }]),
    updateAmindSelectedBoards: (value: { fileId: string; boardIds: string[] }) => void sources([{ op: 'set_boards', sourceId: value.fileId, selectedBoardIds: value.boardIds }]),
    updateAmindIncludeFreeNodes: (value: { fileId: string; value: boolean }) => void sources([{ op: 'set_free_nodes', sourceId: value.fileId, includeFreeNodes: value.value }]),
    parseAmindFiles: pull, parseExcelFile, updateExcelSelectedSheet: (sheetName: string) => void parseExcelFile({ sheetName }),
    updateExcelColumnMapping: (value: { key: keyof ReportExcelColumnMapping; value: string }) => void parseExcelFile({ columnMapping: { [value.key]: value.value } }),
    excludeExcelModule: (value: string) => void parseExcelFile({ excludedModules: [...(state.excelParseResult?.excludedModules || []), value] }),
    excludeExcelOwner: (value: string) => void parseExcelFile({ excludedOwners: [...(state.excelParseResult?.excludedOwners || []), value] }),
    toggleExcelEmptyModule: () => { const excluded = state.excelParseResult?.excludedModules || []; void parseExcelFile({ excludedModules: excluded.includes('【空】') ? excluded.filter(value => value !== '【空】') : [...excluded, '【空】'] }); },
    collectGenerationValidationErrors: () => collectReportIssues(state).map(issue => issue.message),
  };
}
