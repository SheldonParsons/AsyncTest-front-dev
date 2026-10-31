import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { EventEmitter } from 'node:events';
import { REPORT_VERSION, PARSER_VERSION, ReportError, assert, getConfigSchema, formFields, scopeKeys, descendants, defaultEnvironment } from './core/schema.js';
import { collectReportIssues } from './core/validation.js';
import { editDocument, mergeDocument, templateFromDocument, applyTemplate } from './core/document.js';
import { ReportStore, newWorkspace, clone, uid, now, hash, stable, atomicWrite } from './reportStore.node.js';
import { ZentaoAdapter, projectBugs, ZENTAO_BUG_COLLECTION_VERSION } from './adapters/zentao.node.js';
import { validateTool } from '../mcp/reportProtocol.node.js';

const terminal = status => ['completed', 'failed', 'cancelled', 'interrupted'].includes(status);
const ok = (data = {}, summary = '已完成', extra = {}) => ({ ok: true, status: 'completed', summary, data, issues: [], nextActions: [], operationId: null, ...extra });
const failure = error => ({ ok: false, status: error.code === 'REVISION_CONFLICT' || error.code === 'AMBIGUOUS_TARGET' || error.code === 'MIGRATION_PENDING' ? 'needs_input' : 'failed', summary: error.message, error: { code: error.code || 'REPORT_FAILED', message: error.message, details: error.details || {} }, issues: [], nextActions: ['重新读取当前上下文与版本，再处理提示的缺项'], operationId: null });
function merge(base, patch) {
  const next = clone(base);
  for (const [key, value] of Object.entries(patch || {})) next[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(next[key] || {}, value) : clone(value);
  return next;
}
function safeConfig(config, partial = false) {
  const next = clone(config);
  if (!partial || Object.hasOwn(next, 'passwordRef')) next.passwordConfigured = !!next.passwordRef;
  delete next.passwordRef; delete next.zentaoPassword;
  // 保留历史存储和快照，只在当前配置投影中隐藏已停用的采集上限。
  if (next.customFields) delete next.customFields.zendaoBugLimit;
  return next;
}
function effective(state, ws) {
  const override = clone(ws.overrides); const environments = override.environments; delete override.environments;
  const config = merge(state.settings.values, override);
  if (environments) {
    config.environments = config.environments.map(env => environments[env.id] ? merge(env, environments[env.id]) : env).filter(env => !env.deleted);
    for (const [id, env] of Object.entries(environments)) if (!config.environments.some(item => item.id === id) && !env.deleted && env.kind === 'custom') config.environments.push(clone(env));
  }
  return config;
}
function diff(before, after, prefix = [], result = []) {
  if (stable(before) === stable(after)) return result;
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) diff(before[key], after[key], [...prefix, key], result);
  } else result.push({ path: prefix, before: before === undefined ? null : clone(before), beforeMissing: before === undefined, after: after === undefined ? null : clone(after), afterMissing: after === undefined });
  return result;
}
function atPath(root, keys) { return keys.reduce((value, key) => value?.[key], root); }
function setPath(root, keys, value, remove = false) { const parent = keys.slice(0, -1).reduce((object, key) => object[key] ||= {}, root); if (remove) delete parent[keys.at(-1)]; else parent[keys.at(-1)] = clone(value); }
function paged(items, args, version) {
  let offset = 0;
  if (args.cursor) { let cursor; try { cursor = JSON.parse(Buffer.from(args.cursor, 'base64url').toString()); } catch { throw new ReportError('INVALID_CURSOR', '分页游标无效'); } assert(cursor.version === version, 'REVISION_CONFLICT', '内容版本已变化，请从第一页读取'); offset = cursor.offset; assert(Number.isSafeInteger(offset) && offset >= 0, 'INVALID_CURSOR', '分页位置无效'); }
  const limit = Math.min(args.limit || 20, 100);
  return { items: items.slice(offset, offset + limit), total: items.length, nextCursor: offset + limit < items.length ? Buffer.from(JSON.stringify({ version, offset: offset + limit })).toString('base64url') : null };
}
export class ReportService extends EventEmitter {
  constructor({ root, identity, secureStorage, zentao = new ZentaoAdapter(), files, workerFactory } = {}) {
    super(); this.identity = identity; this.zentao = zentao; this.files = files; this.sessions = new Map(); this.running = new Map(); this.workerFactory = workerFactory;
    this.store = new ReportStore(root, { ...identity, secureStorage });
    this.store.on('changed', event => this.emit('changed', event));
  }
  async init() { await this.store.init(); return this; }
  connect(sessionId) { const session = { id: sessionId, workspaceId: this.store.state.defaultWorkspaceId, connectedAt: now(), released: false }; this.sessions.set(sessionId, session); this.emit('control', this.controlState()); return session; }
  disconnect(sessionId) { this.sessions.delete(sessionId); this.emit('control', this.controlState()); }
  session(id) { return this.sessions.get(id) || this.connect(id); }
  workspace(args, sessionId, state = this.store.state) {
    const workspaceId = args.workspaceId || this.session(sessionId).workspaceId;
    const ws = state.workspaces[workspaceId]; assert(ws && !ws.archived, 'NOT_FOUND', '草稿不存在或已归档，请列出草稿选择'); return ws;
  }
  revisions(state, ws) { return { settings: state.settings.revision, workspace: ws?.revision }; }
  checkRevisions(state, ws, expected, { settings = true } = {}) {
    assert(expected && expected.workspace === ws.revision && (!settings || expected.settings === state.settings.revision), 'REVISION_CONFLICT', '配置已被其他入口修改；本次未覆盖，请读取最新版本', { actual: this.revisions(state, ws) });
  }
  controlState() { return { applicationAvailable: true, stopped: this.store.state.control.stopped, restoreRequested: this.store.state.control.restoreRequested, connectedAgents: [...this.sessions.values()].filter(session => !session.id.startsWith('desktop:')).length, authorizedAgents: [...this.sessions.values()].filter(session => !session.id.startsWith('desktop:') && !session.released).length, ...this.identity, version: REPORT_VERSION }; }
  async desktopControl(action) {
    assert(['stop', 'restore'].includes(action), 'INVALID_PARAMS', '未知控制动作');
    await this.store.transaction(state => { state.control = { stopped: action === 'stop', restoreRequested: false }; return ok(); });
    if (action === 'restore') for (const session of this.sessions.values()) session.released = false;
    if (action === 'stop') for (const [id, runtime] of this.running) { runtime.controller.abort(); await runtime.worker?.terminate(); await this.finishOperation(id, 'cancelled', { summary: '用户在桌面停止 MCP 控制' }); }
    this.emit('control', this.controlState()); return ok(this.controlState());
  }
  async call(name, args = {}, caller = { sessionId: 'desktop:main', desktop: true }) {
    try {
      validateTool(name, args); this.session(caller.sessionId);
      assert(caller.desktop || name === 'report_control' || !this.store.state.control.stopped && !this.session(caller.sessionId).released, 'CONTROL_STOPPED', '用户已停止 MCP 控制；请在桌面恢复');
      if (name === 'report_control') {
        if (args.action === 'release') { this.session(caller.sessionId).released = true; this.emit('control', this.controlState()); }
        if (args.action === 'request_restore') await this.store.transaction(state => { state.control.restoreRequested = true; return ok(); });
        return ok({ ...this.controlState(), sessionReleased: this.session(caller.sessionId).released }, args.action === 'request_restore' ? '已申请恢复，请在桌面点击恢复控制' : '报告 MCP 控制状态');
      }
      const method = name.slice('report_'.length);
      return await this[method](args, caller);
    } catch (error) { return failure(error); }
  }
  async write(method, args, caller, callback) {
    assert(args.requestId && args.expectedRevisions, 'INVALID_PARAMS', '写入必须提供 requestId 和 expectedRevisions');
    return this.store.transaction(async state => {
      const ws = this.workspace(args, caller.sessionId, state);
      const key = `${state.profileId}:${ws.id}:${method}:${args.requestId}`; const fingerprint = this.store.fingerprint(args); const receipt = state.receipts[key];
      if (receipt) { assert(receipt.fingerprint === fingerprint, 'IDEMPOTENCY_CONFLICT', '同一 requestId 对应不同参数；请使用新的请求 ID'); return receipt.result; }
      this.checkRevisions(state, ws, args.expectedRevisions);
      assert(caller.desktop || !state.control.stopped && !this.session(caller.sessionId).released, 'CONTROL_STOPPED', 'MCP 控制已停止');
      const before = { settings: clone(state.settings.values), workspaces: clone(state.workspaces), template: clone(state.template) };
      const value = await callback(state, ws);
      const after = { settings: state.settings.values, workspaces: state.workspaces, template: state.template };
      const changes = diff(before, after).filter(change => !['revision', 'updatedAt', 'dirty'].includes(change.path.at(-1)));
      const changeId = changes.length ? uid('chg') : null;
      if (changeId) state.changes[changeId] = { id: changeId, workspaceId: ws.id, method, at: now(), changes };
      const result = { ...value, workspaceId: ws.id, revisions: this.revisions(state, ws), changeId };
      state.receipts[key] = { fingerprint, requestId: args.requestId, method, workspaceId: ws.id, at: now(), result };
      return { value: result, event: { object: ws.id, revisions: result.revisions, paths: changes.map(change => change.path.join('.')), source: caller.sessionId } };
    });
  }
  touch(ws) { ws.revision++; ws.updatedAt = now(); ws.dirty = true; }
  async migrateLegacy(legacy) {
    return this.store.transaction(async state => {
      if (state.migrationVersion >= 1) return ok({ migrationVersion: 1 });
      assert(legacy === null || legacy && typeof legacy === 'object' && !Array.isArray(legacy), 'MIGRATION_INVALID', '旧配置损坏，保留原记录等待恢复');
      const source = legacy || {}; const initialized = new Set(state.settings.initialized);
      for (const key of Object.keys(formFields)) if (Object.hasOwn(source, key) && !initialized.has(key)) state.settings.values[key] = String(source[key] ?? '');
      if (source.zentaoPassword && !initialized.has('passwordRef')) state.settings.values.passwordRef = await this.store.encryptCredential(String(source.zentaoPassword));
      if (Array.isArray(source.environments) && !initialized.has('environments')) {
        const keys = Object.keys(defaultEnvironment('test'));
        state.settings.values.environments = source.environments.map(env => Object.fromEntries(keys.map(key => [key, env[key] ?? defaultEnvironment(env.kind || 'custom', env.id)[key]])));
      }
      if (source.customFields) for (const key of Object.keys(state.settings.values.customFields)) if (Object.hasOwn(source.customFields, key) && !initialized.has(`customFields.${key}`)) state.settings.values.customFields[key] = source.customFields[key];
      state.settings.revision++; state.migrationVersion = 1; state.migratedAt = now();
      return ok({ migrationVersion: 1, verified: true }, '旧报告配置已迁入共享存储');
    });
  }
  async migrateLegacyExports(directory) {
    if (this.store.state.exportsMigrationVersion) return;
    let records;
    try { records = JSON.parse(await fs.readFile(path.join(directory, 'recent-exports.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') records = []; else { this.store.recoveryWarning = '旧导出历史无法解析，原文件已保留'; return; } }
    const imported = [];
    const allowedDirectory = path.join(directory, 'recent-exports') + path.sep;
    for (const record of Array.isArray(records) ? records : []) {
      if (!record?.cachedFilePath || !record?.id) continue;
      try {
        const sourcePath = await fs.realpath(record.cachedFilePath); if (!sourcePath.startsWith(allowedDirectory)) continue;
        const bytes = await fs.readFile(sourcePath), id = `legacy_${hash({ id: record.id, content: hash(bytes) }).slice(0, 32)}`;
        const fileName = path.basename(record.fileName || sourcePath).replace(/[\\/:*?"<>|]/g, '_');
        const target = path.join(this.store.root, 'exports', id, fileName); await atomicWrite(target, bytes);
        imported.push({ id, workspaceId: this.store.state.defaultWorkspaceId, legacy: true, fileName, title: record.title || fileName, createdAt: record.createdAt || now(), size: bytes.length, hash: hash(bytes), format: 'zip', path: target, envNames: record.envNames || [], reports: [] });
      } catch { this.store.recoveryWarning = '部分旧导出文件已不存在，其余历史已保留'; }
    }
    await this.store.transaction(state => { for (const artifact of imported) state.exports[artifact.id] ||= artifact; state.exportsMigrationVersion = 1; return ok({ imported: imported.length }); });
  }
  async projection(ws, state = this.store.state) {
    const config = safeConfig(effective(state, ws)); const amindFiles = [], amindParseResults = []; let excelFile = null, excelParseResult = null;
    for (const source of ws.sources) {
      let parsed;
      try { parsed = await this.store.readJSON(source.parsePath); }
      catch { parsed = { result: { fileId: source.id, fileName: source.name, status: 'error', errorMessage: '持久化解析结果缺失，请恢复备份或重新导入', boardOptions: [], previewRows: [], rowCount: 0, sourceRowCount: 0 } }; }
      const entry = { ...source, id: source.id, source: 'local', backendFileId: null, projectId: source.origin?.projectId || '', projectName: source.origin?.provider === 'asynctest' ? 'AsyncTest' : '本地', path: source.name, downloadUrl: '', ...source.config };
      delete entry.parsePath; delete entry.assetPath;
      if (source.role === 'amind') { amindFiles.push({ ...entry, boardOptions: parsed.result.boardOptions }); const result = clone(parsed.result); delete result.outline; amindParseResults.push(result); }
      if (source.id === ws.activeAssignmentId) { excelFile = entry; excelParseResult = parsed.result; }
    }
    return { config, amindFiles, amindParseResults, excelFile, excelParseResult };
  }
  async get_context(args, caller) {
    const state = this.store.state, ws = this.workspace(args, caller.sessionId, state); const projection = await this.projection(ws, state);
    return ok({ instance: { ...this.identity, machine: os.hostname(), version: REPORT_VERSION }, migration: state.migrationVersion ? 'completed' : 'migration_pending', recoveryWarning: this.store.recoveryWarning || null, control: this.controlState(), workspace: { id: ws.id, name: ws.name, dirty: ws.dirty, updatedAt: ws.updatedAt }, workspaces: Object.values(state.workspaces).filter(item => !item.archived).map(item => ({ id: item.id, name: item.name, revision: item.revision, updatedAt: item.updatedAt })), defaults: safeConfig(state.settings.values), overrides: safeConfig(ws.overrides, true), effective: projection.config, sources: ws.sources.map(({ parsePath, ...source }) => source), activeAssignmentId: ws.activeAssignmentId, reports: ws.reports, operations: Object.values(state.operations).filter(operation => operation.workspaceId === ws.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, args.include?.includes('operations') ? 100 : 10).map(({ id, kind, status, createdAt, summary, events }) => ({ id, kind, status, createdAt, summary, lastEvent: events.at(-1) || null })), snapshots: Object.values(state.snapshots).filter(snap => snap.workspaceId === ws.id), ...caller.desktop ? { projection } : {} }, '已读取当前报告上下文', { workspaceId: ws.id, revisions: this.revisions(state, ws), issues: await this.issues(ws, state, { mode: 'refresh' }) });
  }
  async get_schema(args) {
    const schema = getConfigSchema();
    if (args.section === 'document') return ok({ blocks: schema.document, operations: schema.documentOperations }, '正文与排版操作合同');
    if (args.section === 'sources') return ok({ assignment: schema.assignment, fields: schema.fields.filter(field => field.scope.includes('workspace') && field.path.startsWith('sources.')) }, '来源与筛选合同');
    return ok(args.section && args.section !== 'all' ? { [args.section]: schema[args.section] || schema } : schema, '报告字段与操作合同');
  }
  async manage_workspace(args, caller) {
    if (args.operation === 'list') { const items = Object.values(this.store.state.workspaces).filter(ws => !ws.archived).map(({ id, name, revision, updatedAt }) => ({ id, name, revision, updatedAt })); return ok(paged(items, args, hash(items))); }
    if (args.operation === 'open') { const ws = this.workspace(args, caller.sessionId); this.session(caller.sessionId).workspaceId = ws.id; return this.get_context(args, caller); }
    const result = await this.write('manage_workspace', args, caller, async (state, ws) => {
      if (args.operation === 'archive') { assert(Object.values(state.workspaces).filter(w => !w.archived).length > 1, 'LAST_WORKSPACE', '至少保留一份草稿'); ws.archived = true; this.touch(ws); if (state.defaultWorkspaceId === ws.id) state.defaultWorkspaceId = Object.values(state.workspaces).find(w => !w.archived).id; return ok({ id: ws.id }, '草稿已归档'); }
      const from = args.operation === 'fork' ? state.workspaces[args.sourceWorkspaceId || ws.id] : null;
      assert(args.operation !== 'fork' || from && !from.archived, 'NOT_FOUND', '复制来源草稿不存在');
      const created = newWorkspace(args.name || '新测试报告', from); state.workspaces[created.id] = created; return ok({ id: created.id, revision: created.revision }, '草稿已创建');
    });
    if (result.ok && args.operation !== 'archive') this.session(caller.sessionId).workspaceId = result.data.id; return result;
  }
  async queryAll(entity, parent, config, readPolicy, signal) {
    const identity = { baseURL: this.zentao.baseURL, username: config.zentaoUsername, credential: config.passwordRef, entity, parent };
    const key = hash(identity), cached = this.store.state.scopeCache[key];
    if (readPolicy === 'cached') { assert(cached, 'CACHE_MISSING', '本地没有该范围候选，请联网查询'); return cached; }
    const token = await this.zentao.login(config, await this.store.password(config.passwordRef), signal);
    const result = { items: await this.zentao.query(entity, parent, token, signal), fetchedAt: now(), identity: { ...identity, credential: undefined } };
    await this.store.transaction(state => { state.scopeCache[key] = result; return ok(); }); return result;
  }
  async query_scope(args, caller) {
    const config = effective(this.store.state, this.workspace(args, caller.sessionId));
    const parentKey = { projects: 'productId', executions: 'projectId', testTasks: 'productId', builds: 'executionId' }[args.entity];
    const parent = parentKey ? { [parentKey]: args.parent?.[parentKey] || config[parentKey] } : {};
    const result = await this.queryAll(args.entity, parent, config, args.readPolicy);
    const items = result.items.filter(item => (!args.query || item.name.toLowerCase().includes(args.query.toLowerCase()) || item.id === args.query) && (!args.status || args.status === 'all' || item.status === args.status)).map(({ raw, ...item }) => item);
    return ok({ ...paged(items, args, hash(result)), fetchedAt: result.fetchedAt, parent }, '已查询候选，当前选择未改变');
  }
  async validateScope(config) {
    const token = await this.zentao.login(config, await this.store.password(config.passwordRef)); const labels = {};
    for (const [key, entity, parent] of [['productId', 'products', {}], ['projectId', 'projects', { productId: config.productId }], ['executionId', 'executions', { projectId: config.projectId }], ['testTaskId', 'testTasks', { productId: config.productId }], ['buildId', 'builds', { executionId: config.executionId }]]) {
      if (!config[key]) continue;
      const items = await this.zentao.query(entity, parent, token); const selected = items.find(item => item.id === config[key]);
      assert(selected, 'INVALID_DEPENDENCY', `${key} 不属于当前父级；所有范围修改均未保存`, { field: key, candidates: items.map(({ raw, ...item }) => item) }); labels[key] = selected.name;
    }
    return labels;
  }
  async update_settings(args, caller) {
    return this.write('update_settings', args, caller, async (state, ws) => {
      const before = effective(state, ws), patch = clone(args.patch || {}); const defaults = args.target !== 'workspace';
      if (Object.hasOwn(patch, 'zentaoPassword')) { patch.passwordRef = await this.store.encryptCredential(patch.zentaoPassword); delete patch.zentaoPassword; }
      const base = defaults ? state.settings.values : ws.overrides; const cleared = [];
      Object.assign(base, merge(base, patch));
      for (const key of Object.keys(patch)) if (args.target === 'defaults_and_workspace') { if (key === 'customFields') for (const field of Object.keys(patch.customFields)) { if (ws.overrides.customFields) delete ws.overrides.customFields[field]; } else delete ws.overrides[key]; }
      for (const key of args.unset || []) { assert(Object.hasOwn(formFields, key) || key === 'passwordRef', 'INVALID_PARAMS', '只支持清除定义过的字段覆盖'); if (args.target === 'workspace') delete ws.overrides[key]; else base[key] = ''; }
      for (const [upstream, downstream] of Object.entries(descendants)) if (Object.hasOwn(patch, upstream) && patch[upstream] !== before[upstream]) for (const key of downstream) if (!Object.hasOwn(patch, key)) { base[key] = ''; cleared.push(key); }
      if (base.scopeLabels) for (const key of scopeKeys) if (base[key] === '') delete base.scopeLabels[key];
      for (const operation of args.environmentOperations || []) {
        const current = effective(state, ws).environments.find(env => env.id === operation.id);
        if (operation.op === 'add') { assert(!current, 'INVALID_PARAMS', '环境 ID 已存在'); const env = { ...defaultEnvironment('custom', operation.id), ...operation.values }; if (defaults) base.environments.push(env); else { base.environments ||= {}; base.environments[env.id] = env; } }
        else {
          assert(current, 'NOT_FOUND', '环境不存在');
          assert(operation.op !== 'remove' || current.kind === 'custom', 'INVALID_PARAMS', '内置环境只能停用');
          if (defaults) { const env = base.environments.find(e => e.id === operation.id); assert(env, 'INVALID_PARAMS', '该环境仅存在于草稿，请先添加默认环境'); if (operation.op === 'remove') base.environments = base.environments.filter(e => e.id !== operation.id); else Object.assign(env, operation.patch); }
          else { base.environments ||= {}; base.environments[operation.id] = { ...base.environments[operation.id], ...(operation.op === 'remove' ? { deleted: true } : operation.patch) }; }
          if (args.target === 'defaults_and_workspace' && ws.overrides.environments?.[operation.id]) { if (operation.op === 'remove') delete ws.overrides.environments[operation.id]; else for (const key of Object.keys(operation.patch)) delete ws.overrides.environments[operation.id][key]; }
        }
      }
      const config = effective(state, ws);
      if (scopeKeys.some(key => Object.hasOwn(patch, key) && patch[key])) {
        const labels = await this.validateScope(defaults ? state.settings.values : config); base.scopeLabels = { ...(base.scopeLabels || before.scopeLabels || {}), ...labels };
      }
      if (defaults) {
        state.settings.revision++;
        const changed = diff(before, effective(state, ws)).map(item => item.path.join('.'));
        state.settings.initialized = [...new Set([...state.settings.initialized, ...Object.keys(patch), ...changed])];
        for (const other of Object.values(state.workspaces)) {
          const oldConfig = effective({ ...state, settings: { ...state.settings, values: this.store.state.settings.values } }, other);
          const newConfig = effective(state, other);
          for (const [key, children] of Object.entries(descendants)) if (oldConfig[key] !== newConfig[key]) for (const child of children) if (Object.hasOwn(other.overrides, child) && !(other.id === ws.id && Object.hasOwn(patch, child))) { delete other.overrides[child]; cleared.push(`${other.id}.${child}`); }
          // A draft may pin an upstream choice while inheriting changed defaults below it.
          // Revalidate that effective chain; clear invalid children in this transaction.
          if (scopeKeys.some(key => Object.hasOwn(patch, key)) && other.id !== ws.id) {
            for (let attempt = 0; attempt < scopeKeys.length; attempt++) {
              const effectiveConfig = effective(state, other);
              if (scopeKeys.every(key => effectiveConfig[key] === state.settings.values[key])) break;
              try { await this.validateScope(effectiveConfig); break; }
              catch (error) {
                const field = error.details?.field;
                if (error.code !== 'INVALID_DEPENDENCY' || !scopeKeys.includes(field)) throw error;
                for (const key of [field, ...(descendants[field] || [])]) { other.overrides[key] = ''; cleared.push(`${other.id}.${key}`); }
              }
            }
          }
          this.touch(other);
        }
      } else this.touch(ws);
      return ok({ effective: safeConfig(effective(state, ws)), cleared: [...new Set(cleared)], inheritedOverrides: Object.keys(ws.overrides) }, '报告设置已保存');
    });
  }
  async test_connection(args, caller) {
    assert(!args.profileId || args.profileId === this.identity.profileId, 'PROFILE_MISMATCH', '配置实例不匹配');
    if (args.provider === 'zentao') { const config = effective(this.store.state, this.workspace(args, caller.sessionId)); await this.zentao.login(config, await this.store.password(config.passwordRef)); }
    else await this.files.request('token/check');
    return ok({ provider: args.provider, connected: true, checkedAt: now() }, '连接验证成功');
  }
  runWorker(task, input, operationId) {
    return new Promise((resolve, reject) => {
      const worker = this.workerFactory ? this.workerFactory(task, input) : new Worker(new URL('./reportWorker.node.js', import.meta.url), { workerData: { task, input }, resourceLimits: { maxOldGenerationSizeMb: 768 } });
      const runtime = this.running.get(operationId); if (runtime) runtime.worker = worker;
      let settled = false;
      const finish = (error, result) => { if (settled) return; settled = true; if (runtime?.worker === worker) runtime.worker = null; void worker.terminate(); error ? reject(error) : resolve(result); };
      worker.on('message', message => { if (message.progress) { if (operationId) void this.progress(operationId, message.progress); } else if (message.error) finish(new ReportError(message.error.code, message.error.message, message.error.details)); else finish(null, message.result); });
      worker.on('error', error => finish(error)); worker.on('exit', code => { if (!settled) finish(new ReportError(runtime?.controller.signal.aborted ? 'CANCELLED' : 'WORKER_EXIT', `报告工作进程已结束（${code}）`)); });
    });
  }
  async list_source_entries(args) {
    assert(Boolean(args.folderUrl) !== Boolean(args.localDirectory), 'INVALID_PARAMS', '请选择一个目录来源');
    if (args.folderUrl) { const result = await this.files.list(args.folderUrl); return ok({ ...result, entries: undefined, ...paged(result.entries, args, hash(result.entries)) }, '已列出目录，文件尚未附加'); }
    assert(path.isAbsolute(args.localDirectory), 'SOURCE_NOT_LOCAL', '请使用本机绝对目录路径', { machine: os.hostname() });
    const entries = await fs.readdir(args.localDirectory, { withFileTypes: true }).catch(() => { throw new ReportError('SOURCE_NOT_LOCAL', '无法读取本机目录', { machine: os.hostname() }); });
    const files = [];
    for (const entry of entries) if (entry.isFile() && /\.(amind|xlsx)$/i.test(entry.name)) { const filePath = path.join(args.localDirectory, entry.name), stat = await fs.stat(filePath); files.push({ name: entry.name, localPath: filePath, size: stat.size, updatedAt: stat.mtime.toISOString(), type: entry.name.toLowerCase().endsWith('.amind') ? 'amind' : 'assignment' }); }
    return ok(paged(files, args, hash(files)), '已列出本地目录，文件尚未附加');
  }
  async prepareSource(input, existing, operationId) {
    let bytes, origin, name;
    if (input.localPath) {
      assert(path.isAbsolute(input.localPath), 'SOURCE_NOT_LOCAL', '请使用同机绝对文件路径', { machine: os.hostname() });
      const handle = await fs.open(input.localPath, 'r').catch(() => { throw new ReportError('SOURCE_NOT_LOCAL', '本机无法读取指定文件', { machine: os.hostname(), path: input.localPath }); });
      try {
        const before = await handle.stat(); assert(before.isFile() && before.size > 0 && before.size <= 50 * 1024 ** 2, 'FILE_TOO_LARGE', '来源必须是非空文件，且不超过 50 MB');
        bytes = await handle.readFile(); const after = await handle.stat(); assert(before.size === after.size && before.mtimeMs === after.mtimeMs, 'FILE_CHANGED', '读取期间文件发生变化，请重新导入');
      } finally { await handle.close(); }
      origin = { provider: 'local', localPath: input.localPath, machine: os.hostname() }; name = path.basename(input.localPath);
    } else if (input.bytes) { bytes = Buffer.from(input.bytes); name = input.name; origin = { provider: 'desktop', name }; }
    else {
      const entry = input.entry || this.files.handles.get(input.entryHandle); assert(entry, 'NOT_FOUND', '来源句柄过期，请重新列目录');
      assert(entry.type !== 'folder' && !entry.is_dir, 'INVALID_PARAMS', '请选择文件；递归目录需逐层列举'); bytes = await this.files.download(entry); origin = entry; name = entry.name;
    }
    assert(bytes.length > 0 && bytes.length <= 50 * 1024 ** 2, 'FILE_TOO_LARGE', '文件超过 50 MB 或为空');
    assert(/\.(amind|xlsx)$/i.test(name), 'INVALID_SOURCE', '只支持 amind 和 xlsx');
    const role = name.toLowerCase().endsWith('.amind') ? 'amind' : 'assignment'; assert(!input.role || input.role === role, 'INVALID_SOURCE', '文件类型与指定用途不一致');
    const asset = await this.store.putAsset(bytes);
    const source = { id: existing?.id || uid('source'), name, role, ...asset, origin, importedAt: now(), parseRevision: (existing?.parseRevision || 0) + 1, parserVersion: PARSER_VERSION, config: clone(existing?.config || (role === 'amind' ? { selectedBoardIds: [], includeFreeNodes: false, docxFileType: 'xmind' } : {})) };
    if (operationId) this.ensureRunning(operationId);
    await this.parseSource(source, operationId); return source;
  }
  async parseSource(source, operationId) {
    const parsed = await this.runWorker('parse', { path: path.join(this.store.root, source.relative), expectedHash: source.assetId, role: source.role, source: { id: source.id, name: source.name, projectId: source.origin?.projectId || '', projectName: '', ...source.config }, config: source.config }, operationId);
    if (source.role === 'amind' && source.config.selectedBoardIds?.length) assert(source.config.selectedBoardIds.every(id => parsed.result.boardOptions.some(option => option.value === id)), 'FILE_CHANGED', '新文件不再包含所选画板，旧来源保持不变');
    if (source.role === 'amind') source.config.selectedBoardIds = parsed.result.selectedBoardIds;
    else source.config = { selectedSheet: parsed.result.selectedSheet, columnMapping: parsed.result.columnMapping, rowFilter: parsed.result.rowFilter, excludedModules: parsed.result.excludedModules, excludedOwners: parsed.result.excludedOwners };
    source.parsePath = `assets/${source.assetId}/parses/${hash({ sourceId: source.id, config: source.config, version: PARSER_VERSION })}.json`;
    await this.store.putJSON(source.parsePath, parsed); return parsed;
  }
  attach(state, ws, sources) {
    const attached = [], alreadyAttached = [], sameNameVersions = [];
    for (const source of sources) {
      const duplicate = ws.sources.find(item => item.assetId === source.assetId && item.role === source.role);
      if (duplicate) { alreadyAttached.push(duplicate.id); continue; }
      const sameName = ws.sources.filter(item => item.name === source.name && item.role === source.role);
      if (sameName.length) sameNameVersions.push({ name: source.name, previousSourceIds: sameName.map(item => item.id), newSourceId: source.id, message: '同名文件内容不同，已作为新版本保留；旧版本没有被覆盖' });
      assert(ws.sources.reduce((sum, item) => sum + item.size, 0) + source.size <= 100 * 1024 ** 2, 'SOURCE_TOTAL_LIMIT', '当前草稿来源总量超过 100 MB');
      state.assets[source.assetId] ||= { id: source.assetId, relative: source.relative, hash: source.hash, size: source.size, name: source.name };
      ws.sources.push(source); attached.push(source.id);
    }
    const candidates = ws.sources.filter(source => source.role === 'assignment');
    if (!ws.activeAssignmentId && candidates.length === 1 && attached.includes(candidates[0].id)) ws.activeAssignmentId = candidates[0].id;
    if (attached.length) this.touch(ws);
    return { sourceIds: attached, alreadyAttached, sameNameVersions, activeAssignmentId: ws.activeAssignmentId, assignmentCandidates: ws.sources.filter(source => source.role === 'assignment').map(source => ({ id: source.id, name: source.name })) };
  }
  async import_sources(args, caller) {
    const result = await this.write('import_sources', args, caller, async (state, ws) => {
      assert(args.sources.length, 'INVALID_PARAMS', '请指定至少一个来源');
      const sources = args.sources.map(input => input.entryHandle ? { ...input, entry: this.files.handles.get(input.entryHandle) } : input);
      for (const source of sources) if (source.entryHandle) assert(source.entry, 'NOT_FOUND', '文件句柄已过期，请重新列目录');
      const id = uid('op'); state.operations[id] = { id, workspaceId: ws.id, requestId: args.requestId, kind: 'import', status: 'accepted', createdAt: now(), events: [], frozen: { sources, allowPartial: args.allowPartial, workspaceRevision: ws.revision } };
      return ok({ operationId: id }, '文件导入已受理，成功解析后原子附加', { status: 'accepted', operationId: id });
    });
    if (result.operationId && !this.running.has(result.operationId) && this.store.state.operations[result.operationId]?.status === 'accepted') this.startJob(result.operationId);
    return result;
  }
  // IPC-only bytes intake. Bytes never enter stdio tools or renderer storage.
  async importDesktop(args, caller) {
    return this.write('import_sources_desktop', args, caller, async (state, ws) => {
      const sources = [];
      for (const input of args.files) sources.push(await this.prepareSource(input.localPath ? { localPath: input.localPath } : { bytes: input.bytes, name: input.name }));
      return ok(this.attach(state, ws, sources), '本地文件已持久保存');
    });
  }
  async importProjectDesktop(args, caller) {
    return this.write('import_project_sources_desktop', args, caller, async (state, ws) => {
      const sources = [];
      for (const input of args.files) {
        const listing = await this.files.list(input.folderUrl); const entry = listing.entries.find(entry => entry.fileId === String(input.fileId));
        assert(entry, 'ACCESS_DENIED', '所选文件不在已授权目录中'); sources.push(await this.prepareSource({ entry }));
      }
      return ok(this.attach(state, ws, sources), '项目文件已保存到本地');
    });
  }
  async update_sources(args, caller) {
    return this.write('update_sources', args, caller, async (state, ws) => {
      for (const op of args.operations) {
        const source = ws.sources.find(item => item.id === op.sourceId); assert(source, 'NOT_FOUND', '来源不在当前草稿');
        if (op.op === 'detach') { ws.sources = ws.sources.filter(item => item.id !== source.id); if (ws.activeAssignmentId === source.id) ws.activeAssignmentId = null; continue; }
        if (op.op === 'activate_assignment') { assert(source.role === 'assignment', 'INVALID_SOURCE', '只有 Excel 可作为任务分配表'); ws.activeAssignmentId = source.id; continue; }
        if (op.op === 'refresh') {
          const input = source.origin.provider === 'local' ? { localPath: source.origin.localPath } : source.origin.provider === 'asynctest' ? { entry: source.origin } : null;
          assert(input, 'SOURCE_NOT_LOCAL', '请通过桌面重新选择这份文件'); const replacement = await this.prepareSource(input, source);
          assert(!ws.sources.some(item => item.id !== source.id && item.assetId === replacement.assetId), 'SOURCE_ALREADY_ATTACHED', '新内容已在当前草稿中，请移除重复来源');
          assert(ws.sources.reduce((sum, item) => sum + (item.id === source.id ? replacement.size : item.size), 0) <= 100 * 1024 ** 2, 'SOURCE_TOTAL_LIMIT', '刷新后来源总量超过 100 MB');
          state.assets[replacement.assetId] ||= { id: replacement.assetId, relative: replacement.relative, hash: replacement.hash, name: replacement.name, size: replacement.size }; Object.assign(source, replacement); continue;
        }
        assert(source.role === 'amind', 'INVALID_SOURCE', '该操作仅适用于 amind');
        if (op.op === 'set_boards') { const parsed = await this.store.readJSON(source.parsePath); assert(op.selectedBoardIds.length && op.selectedBoardIds.every(id => parsed.result.boardOptions.some(board => board.value === id)), 'INVALID_PARAMS', '请选择该文件中实际存在的画板'); source.config.selectedBoardIds = op.selectedBoardIds; }
        if (op.op === 'set_free_nodes') source.config.includeFreeNodes = op.includeFreeNodes;
        if (op.op === 'set_attachment_format') source.config.docxFileType = op.docxFileType;
        source.parseRevision++; await this.parseSource(source);
      }
      this.touch(ws); return ok({ activeAssignmentId: ws.activeAssignmentId, sources: ws.sources.map(({ parsePath, ...source }) => source) }, '来源已更新；原文件和历史报告保留');
    });
  }
  async configure_assignment(args, caller) {
    return this.write('configure_assignment', args, caller, async (_state, ws) => {
      const source = ws.sources.find(item => item.id === args.sourceId);
      assert(source && source.id === ws.activeAssignmentId, 'INVALID_SOURCE', '请先激活这份任务分配表');
      assert(source.parseRevision === args.parseRevision, 'REVISION_CONFLICT', '解析版本已变化，请重新预览');
      const parsed = await this.store.readJSON(source.parsePath); const patch = args.patch;
      const changedSheet = patch.selectedSheet !== undefined && patch.selectedSheet !== source.config.selectedSheet;
      if (patch.selectedSheet) assert(parsed.workbook.sheets[patch.selectedSheet], 'INVALID_PARAMS', '工作表不存在');
      const sheet = parsed.workbook.sheets[patch.selectedSheet || source.config.selectedSheet];
      for (const column of Object.values(patch.columnMapping || {})) assert(sheet.columns.some(item => item.value === column), 'INVALID_PARAMS', '映射列不存在');
      source.config = merge(changedSheet ? { selectedSheet: patch.selectedSheet, rowFilter: null, excludedModules: [], excludedOwners: [] } : source.config, patch);
      source.parseRevision++; const next = await this.parseSource(source); this.touch(ws);
      return ok({ before: parsed.result.rowCount, sourceRows: next.result.sourceRowCount, matchedRows: next.result.matchedRowCount, includedRows: next.result.rowCount, excludedRows: next.result.excludedRowCount, parseRevision: source.parseRevision, config: source.config, cleared: changedSheet ? ['rowFilter', 'columnMapping', 'excludedModules', 'excludedOwners'] : [] }, `当前参与计算 ${next.result.rowCount} 行任务`, { issues: next.result.rowFilter?.value === null ? [{ code: 'FILTER_INCOMPLETE', message: '请选择匹配值' }] : next.result.rowCount === 0 ? [{ code: 'EMPTY_RESULT', message: '筛选结果为零，生成前请调整' }] : [] });
    });
  }
  async inspect_source(args, caller) {
    const ws = this.workspace(args, caller.sessionId), source = ws.sources.find(item => item.id === args.sourceId); assert(source, 'NOT_FOUND', '来源不存在');
    const parsed = await this.store.readJSON(source.parsePath), version = `${source.assetId}:${source.parseRevision}:${hash({ view: args.view, board: args.boardId, column: args.column, query: args.query, status: args.status })}`;
    const metadata = { sourceId: source.id, assetId: source.assetId, parserVersion: source.parserVersion, parseRevision: source.parseRevision };
    if (args.view === 'summary') { const result = clone(parsed.result); delete result.outline; delete result.previewRows; return ok({ ...metadata, summary: result }); }
    let items = [];
    if (source.role === 'assignment') {
      const sheet = parsed.workbook.sheets[source.config.selectedSheet];
      if (args.view === 'sheets') items = parsed.workbook.sheetOptions;
      else if (args.view === 'columns') items = sheet.columns.map(column => ({ ...column, samples: [...new Set(sheet.rows.map(row => row[Number(column.value)]))].slice(0, 5) }));
      else if (args.view === 'values') {
        assert(sheet.columns.some(column => column.value === args.column), 'INVALID_PARAMS', '请提供实际列 ID');
        const counts = new Map();
        for (const row of sheet.rows) if (Object.values(source.config.columnMapping).some(column => row[Number(column)])) { const value = row[Number(args.column)] || ''; counts.set(value, (counts.get(value) || 0) + 1); }
        items = [...counts].map(([value, count]) => ({ value, count, label: value || '（空值）' })).filter(item => !args.query || item.value.includes(args.query));
      } else if (args.view === 'rows') items = parsed.result.previewRows;
      else throw new ReportError('INVALID_PARAMS', 'Excel 支持 summary/sheets/columns/values/rows');
    } else {
      const boards = parsed.result.outline;
      if (args.view === 'outline') items = boards.map(board => ({ boardId: board.boardId, title: board.boardTitle, roots: board.rootIds.map(id => ({ id, text: board.nodes[id]?.text, children: board.nodes[id]?.children || [] })) }));
      else {
        const board = args.boardId ? boards.find(item => item.boardId === args.boardId) : boards.length === 1 ? boards[0] : null;
        assert(board, 'AMBIGUOUS_TARGET', '请先选择画板', { candidates: boards.map(({ boardId, boardTitle }) => ({ boardId, boardTitle })) });
        const visited = new Set();
        const walk = (id, inheritedError = false, inheritedReuse = false) => {
          if (visited.has(id)) return; visited.add(id); const node = board.nodes[id]; if (!node) return;
          const markers = node.markers || [], error = inheritedError || markers.includes('other:error'), reuse = inheritedReuse || markers.includes('other:lightbulb');
          const children = node.children || []; const status = error ? 'failed' : markers.includes('task:100') ? 'passed' : 'pending';
          const text = typeof node.text === 'object' ? node.text?.plain || '' : node.text || node.title || '';
          if ((!args.query || String(text).includes(args.query)) && (!args.status || !children.length && (args.status === 'reused' ? reuse : args.status === status))) items.push({ id, boardId: board.boardId, text, status, reused: reuse, node });
          children.forEach(child => walk(child, error, reuse));
        };
        if (args.view === 'subtree') { assert(board.nodes[args.nodeId], 'NOT_FOUND', '节点不存在'); walk(args.nodeId); } else if (args.view === 'search') board.rootIds.forEach(id => walk(id)); else throw new ReportError('INVALID_PARAMS', 'amind 支持 summary/outline/subtree/search');
      }
    }
    return ok({ ...metadata, ...paged(items, args, version), ...(source.role === 'assignment' ? { sourceRows: parsed.result.sourceRowCount, matchedRows: parsed.result.matchedRowCount, includedRows: parsed.result.rowCount } : {}) });
  }
  async issues(ws, state, policy) {
    const projection = await this.projection(ws, state), config = projection.config;
    const issues = collectReportIssues({ ...projection, form: config, passwordConfigured: config.passwordConfigured || policy?.mode !== 'refresh', environments: config.environments, customFields: config.customFields });
    if (!state.migrationVersion) issues.unshift({ key: 'migration', page: 'basic', code: 'MIGRATION_PENDING', message: '请让桌面完成旧配置迁移' });
    for (const issue of state.integrityIssues || []) if (issue.workspaceId === ws.id && (!issue.sourceId || ws.sources.some(source => source.id === issue.sourceId))) issues.push({ ...issue, key: issue.sourceId || 'storage', page: 'sources' });
    return issues;
  }
  async validate(args, caller) {
    if (args.reportIds?.length) {
      const issues = args.reportIds.filter(id => !this.store.state.documents[id]).map(id => ({ key: id, message: '报告不存在' })); return ok({ valid: !issues.length }, issues.length ? '报告不可导出' : '冻结报告可在本机导出', { issues, status: issues.length ? 'needs_input' : 'completed' });
    }
    const ws = this.workspace(args, caller.sessionId); let issues;
    if (args.dataPolicy?.mode === 'snapshot') issues = this.store.state.snapshots[args.dataPolicy.snapshotId] ? [] : [{ key: 'snapshot', message: '指定快照不存在' }];
    else issues = await this.issues(ws, this.store.state, args.dataPolicy || { mode: 'refresh' });
    return ok({ valid: !issues.length }, issues.length ? `还有 ${issues.length} 项需要处理` : '配置检查通过', { issues, status: issues.length ? 'needs_input' : 'completed' });
  }
  fingerprintInput(config, ws) {
    const safe = safeConfig(config); delete safe.passwordConfigured;
    return hash({ config: safe, sources: ws.sources.map(source => ({ id: source.id, assetId: source.assetId, config: source.config, parserVersion: source.parserVersion })), activeAssignmentId: ws.activeAssignmentId });
  }
  async frozenPayload(ws, config) {
    const projection = await this.projection(ws, { ...this.store.state, settings: { values: config } });
    const label = key => config.scopeLabels?.[key] || config[key];
    return {
      title: label('testTaskId') || ws.name, generatedAt: now(), meta: { reporter: config.reporter, reviewer: config.reviewer, zentaoUsername: config.zentaoUsername, ...Object.fromEntries(scopeKeys.map(key => [key.replace('Id', 'Label'), label(key)])) },
      customFields: clone(config.customFields), environments: clone(config.environments.filter(env => env.enabled)),
      amindFiles: ws.sources.filter(source => source.role === 'amind').map(source => ({ id: source.id, name: source.name, size: source.size, assetId: source.assetId, assetPath: path.join(this.store.root, source.relative), ...source.config })),
      amindResults: projection.amindParseResults, excelFile: projection.excelFile ? { ...projection.excelFile, assetPath: path.join(this.store.root, ws.sources.find(source => source.id === ws.activeAssignmentId).relative) } : null,
      excelResult: projection.excelParseResult,
    };
  }
  async generate(args, caller) {
    const result = await this.write('generate', args, caller, async (state, ws) => {
      let config = effective(state, ws); const inputFingerprint = this.fingerprintInput(config, ws);
      if (args.environmentIds) {
        assert(args.environmentIds.length && args.environmentIds.every(id => config.environments.some(env => env.id === id)), 'INVALID_PARAMS', '生成环境不存在');
        config.environments = config.environments.map(env => ({ ...env, enabled: args.environmentIds.includes(env.id) }));
      }
      if (args.dataPolicy.mode !== 'snapshot') {
        const temporaryState = { ...state, settings: { ...state.settings, values: config } }, temporaryWs = { ...ws, overrides: {} };
        const issues = await this.issues(temporaryWs, temporaryState, args.dataPolicy);
        if (issues.length) return ok({}, '请先处理报告缺项', { status: 'needs_input', issues });
      } else assert(args.dataPolicy.snapshotId, 'INVALID_PARAMS', 'snapshot 策略必须指定 snapshotId');
      const operationId = uid('op'); const operation = { id: operationId, workspaceId: ws.id, requestId: args.requestId, kind: 'generate', status: 'accepted', createdAt: now(), events: [], frozen: { workspace: clone(ws), config, revisions: this.revisions(state, ws), inputFingerprint, dataPolicy: args.dataPolicy, output: args.output, environmentIds: args.environmentIds, previousReports: clone(ws.reports), previousDocumentRevisions: Object.fromEntries(Object.values(ws.reports).map(id => [id, state.documents[id].revision])), template: clone(state.template) } };
      state.operations[operationId] = operation; return ok({ operationId }, '生成任务已受理，输入已冻结', { status: 'accepted', operationId });
    });
    if (result.operationId && !this.running.has(result.operationId) && this.store.state.operations[result.operationId]?.status === 'accepted') this.startJob(result.operationId);
    return result;
  }
  startJob(id) {
    const controller = new AbortController(); this.running.set(id, { controller, worker: null, artifactDirectories: [] });
    void this.performJob(id).catch(async error => {
      await this.finishOperation(id, controller.signal.aborted ? 'cancelled' : 'failed', { summary: controller.signal.aborted ? '作业已取消' : error.message, error: controller.signal.aborted ? undefined : { code: error.code || 'REPORT_FAILED', message: error.message, details: error.details || {} } });
    }).finally(async () => {
      const operation = this.store.state.operations[id];
      if (operation?.status !== 'completed') {
        await fs.rm(path.join(this.store.root, 'jobs', id), { recursive: true, force: true }).catch(() => {});
        for (const directory of this.running.get(id)?.artifactDirectories || []) await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
      }
      this.running.delete(id);
    });
  }
  async progress(id, message, stage = 'running') {
    await this.store.transaction(state => {
      const op = state.operations[id]; if (!op || terminal(op.status)) return ok();
      op.status = 'running'; op.events.push({ sequence: op.events.length + 1, at: now(), stage, message }); return ok();
    });
  }
  ensureRunning(id) { const runtime = this.running.get(id); assert(runtime && !runtime.controller.signal.aborted && !terminal(this.store.state.operations[id].status), 'CANCELLED', '作业已取消'); return runtime.controller.signal; }
  async finishOperation(id, status, data) {
    return this.store.transaction(state => {
      const op = state.operations[id]; if (!op || terminal(op.status)) return ok();
      op.status = status; op.finishedAt = now(); Object.assign(op, data); op.events.push({ sequence: op.events.length + 1, at: now(), stage: status, message: data.summary || status }); return ok();
    });
  }
  coverageMatches(raw, config) {
    return raw.complete && raw.coverage?.collectionVersion === ZENTAO_BUG_COLLECTION_VERSION && raw.coverage.baseURL === this.zentao.baseURL && raw.coverage.username === config.zentaoUsername && ['productId', 'executionId', 'testTaskId', 'buildId'].every(key => raw.coverage[key] === config[key]);
  }
  async performJob(id) {
    const op = clone(this.store.state.operations[id]);
    await this.progress(id, op.kind === 'export' ? '读取冻结报告' : '准备冻结输入', 'preparing');
    const jobDir = path.join(this.store.root, 'jobs', id); await fs.mkdir(jobDir, { recursive: true, mode: 0o700 });
    if (op.kind === 'import') {
      const sources = [], errors = [];
      for (const [index, input] of op.frozen.sources.entries()) {
        this.ensureRunning(id);
        try { sources.push(await this.prepareSource(input, null, id)); }
        catch (error) { this.ensureRunning(id); errors.push({ index, code: error.code || 'IMPORT_FAILED', message: error.message }); }
        await this.progress(id, `已处理 ${index + 1} / ${op.frozen.sources.length} 份来源`, 'importing');
      }
      assert(!errors.length || op.frozen.allowPartial, 'IMPORT_FAILED', '部分文件未能导入，尚未附加任何文件', { errors });
      this.ensureRunning(id);
      await this.store.transaction(state => {
        const operation = state.operations[id]; assert(!terminal(operation.status), 'CANCELLED', '导入已取消');
        const ws = state.workspaces[op.workspaceId]; assert(ws.revision === op.frozen.workspaceRevision, 'REVISION_CONFLICT', '导入期间草稿已修改，文件已缓存但尚未附加；请重新读取后重试');
        const before = clone(ws), attached = this.attach(state, ws, sources);
        const changes = diff(before, ws, ['workspaces', ws.id]).filter(change => !['revision', 'updatedAt', 'dirty'].includes(change.path.at(-1)));
        const changeId = changes.length ? uid('chg') : null;
        if (changeId) state.changes[changeId] = { id: changeId, workspaceId: ws.id, method: 'import_sources', at: now(), changes };
        Object.assign(operation, attached, { changeId, status: 'completed', finishedAt: now(), importErrors: errors, summary: `已加入 ${attached.sourceIds.length} 份来源，${attached.alreadyAttached.length} 份已存在` });
        operation.events.push({ sequence: operation.events.length + 1, at: now(), stage: 'completed', message: operation.summary }); return ok();
      }); return;
    }
    if (op.kind === 'export') {
      const artifacts = [];
      // Each report may refer to a different historical snapshot.
      for (const [index, target] of op.frozen.reports.entries()) {
        this.ensureRunning(id); const document = await this.readDocumentVersion(target.reportId, target.revision);
        const snapshot = await this.store.readJSON(this.store.state.snapshots[document.snapshotId].path);
        const payload = clone(snapshot.payload); payload.environments = payload.environments.filter(env => env.id === document.environmentId);
        artifacts.push(...await this.renderArtifacts(id, payload, [document], path.join(jobDir, String(index)), 'docx'));
      }
      if (op.frozen.format === 'zip') {
        const exportId = uid('export'), fileName = '测试报告.zip', destination = path.join(jobDir, fileName);
        const packed = await this.runWorker('pack', { files: artifacts, destination }, id); this.ensureRunning(id);
        const artifactPath = path.join(this.store.root, 'exports', exportId, fileName); await atomicWrite(artifactPath, await fs.readFile(destination));
        this.running.get(id).artifactDirectories.push(path.dirname(artifactPath));
        const combined = { id: exportId, workspaceId: op.workspaceId, operationId: id, fileName, title: '测试报告', createdAt: now(), format: 'zip', ...packed, path: artifactPath, reports: artifacts.flatMap(artifact => artifact.reports), envNames: artifacts.flatMap(artifact => artifact.envNames), dataAsOf: artifacts.map(artifact => artifact.dataAsOf).filter(Boolean).sort()[0] };
        for (const artifact of artifacts) await fs.rm(path.dirname(artifact.path), { recursive: true, force: true });
        artifacts.splice(0, artifacts.length, combined);
      }
      if (op.frozen.destinationPath) {
        assert(artifacts.length === 1, 'AMBIGUOUS_TARGET', '多个报告请逐个指定另存路径');
        await this.copyArtifact(artifacts[0].path, op.frozen.destinationPath, op.frozen.overwrite);
      }
      this.ensureRunning(id);
      await this.commitArtifacts(id, artifacts, { reportIds: op.frozen.reports.map(report => report.reportId) }); return;
    }
    const frozen = op.frozen; let { config } = frozen; let snapshot, raw;
    if (frozen.dataPolicy.mode === 'snapshot') {
      const meta = this.store.state.snapshots[frozen.dataPolicy.snapshotId]; assert(meta && meta.complete || meta && frozen.dataPolicy.allowIncomplete, 'SNAPSHOT_MISMATCH', '快照不存在或数据不完整');
      snapshot = await this.store.readJSON(meta.path);
      assert(snapshot.parserVersion === PARSER_VERSION, 'SNAPSHOT_MISMATCH', '快照解析器版本不兼容');
      const differs = snapshot.inputFingerprint !== frozen.inputFingerprint;
      assert(!differs || frozen.dataPolicy.acceptSnapshotDifferences, 'SNAPSHOT_MISMATCH', '当前草稿与指定快照不同；明确使用旧快照后再生成', { snapshotId: snapshot.id, differences: diff(safeConfig(config), snapshot.config).map(item => item.path.join('.')), sourcesDiffer: true });
      snapshot = clone(snapshot); config = snapshot.config;
      if (frozen.environmentIds) { assert(frozen.environmentIds.every(id => snapshot.payload.environments.some(env => env.id === id)), 'SNAPSHOT_MISMATCH', '快照未包含所选环境'); snapshot.payload.environments = snapshot.payload.environments.filter(env => frozen.environmentIds.includes(env.id)); }
      await this.progress(id, `使用 ${snapshot.dataAsOf} 的完整快照，无网络请求`, 'snapshot');
    } else {
      if (frozen.dataPolicy.mode === 'refresh') {
        await this.progress(id, '正在采集禅道数据', 'collecting');
        raw = await this.zentao.collect(config, await this.store.password(config.passwordRef), this.ensureRunning(id), message => { void this.progress(id, message, 'collecting'); });
      } else {
        const candidates = Object.values(this.store.state.snapshots).sort((a, b) => b.dataAsOf.localeCompare(a.dataAsOf));
        for (const candidate of candidates) { const cached = await this.store.readJSON(candidate.path); if (this.coverageMatches(cached.raw, config)) { raw = cached.raw; break; } }
        assert(raw, 'CACHE_MISSING', '没有范围、账号和采集口径兼容的完整缓存；请使用 refresh 或指定快照');
        await this.progress(id, `复用 ${raw.fetchedAt} 的缺陷数据，无网络请求`, 'cached');
      }
      this.ensureRunning(id);
      assert(raw.complete || frozen.dataPolicy.allowIncomplete, 'INCOMPLETE_DATA', '禅道缺陷尚未完整获取，请重新获取后生成报告');
      const payload = await this.frozenPayload(frozen.workspace, config); payload.zendao = projectBugs(raw, config); payload.testTask = raw.task; payload.incomplete = !raw.complete;
      for (const env of payload.environments) if (!env.bugFilterKeyword.trim()) await this.progress(id, `${env.name}的标题包含为空，按既有规则不匹配任何缺陷`, 'filter_notice');
      snapshot = { id: uid('snap'), workspaceId: op.workspaceId, config: safeConfig(config), inputFingerprint: frozen.inputFingerprint, scopeFingerprint: hash(Object.fromEntries(scopeKeys.map(key => [key, config[key]]))), assets: frozen.workspace.sources.map(source => ({ sourceId: source.id, assetId: source.assetId, hash: source.hash, parseRevision: source.parseRevision })), parserVersion: PARSER_VERSION, templateVersion: '1', revisions: frozen.revisions, dataAsOf: raw.fetchedAt, createdAt: now(), complete: raw.complete, raw, payload };
      await this.store.putJSON(`snapshots/${snapshot.id}/snapshot.json`, snapshot);
      this.ensureRunning(id);
      await this.store.transaction(state => { state.snapshots[snapshot.id] = { id: snapshot.id, workspaceId: op.workspaceId, dataAsOf: snapshot.dataAsOf, complete: snapshot.complete, scopeFingerprint: snapshot.scopeFingerprint, path: `snapshots/${snapshot.id}/snapshot.json` }; return ok(); });
    }
    this.ensureRunning(id); await this.progress(id, '组装报告正文并保留手工修改', 'document');
    const generated = await this.runWorker('document', { payload: snapshot.payload }, id); const documents = [];
    for (const auto of generated) {
      const previousId = frozen.previousReports[auto.environmentId]; const previous = previousId ? await this.readDocumentVersion(previousId, frozen.previousDocumentRevisions[previousId]) : null;
      const document = mergeDocument(previous, applyTemplate(auto, frozen.template));
      Object.assign(document, { id: previousId || uid('report'), workspaceId: op.workspaceId, snapshotId: snapshot.id, revision: (previous?.revision || 0) + 1, updatedAt: now(), sourceRevision: snapshot.revisions });
      const relative = `documents/${document.id}/${document.revision}/document.json`; await this.store.putJSON(relative, document); documents.push({ document, path: relative, previousRevision: previous?.revision || 0 });
    }
    this.ensureRunning(id);
    // Publish valid editable documents before rendering. A cancelled/failed export can be
    // continued from these exact revisions without recollecting or losing completed work.
    await this.store.transaction(state => {
      const operation = state.operations[id]; assert(!terminal(operation.status), 'CANCELLED', '作业已结束');
      for (const item of documents) assert((state.documents[item.document.id]?.revision || 0) === item.previousRevision, 'REVISION_CONFLICT', '生成期间正文已被修改；旧正文完整保留');
      const ws = state.workspaces[op.workspaceId];
      for (const item of documents) {
        state.documents[item.document.id] = { id: item.document.id, workspaceId: op.workspaceId, environmentId: item.document.environmentId, snapshotId: snapshot.id, revision: item.document.revision, path: item.path };
        ws.reports[item.document.environmentId] = item.document.id;
      }
      ws.dirty = this.fingerprintInput(effective(state, ws), ws) !== frozen.inputFingerprint;
      Object.assign(operation, { snapshotId: snapshot.id, reportIds: documents.map(item => item.document.id), documentVersions: documents.map(item => ({ reportId: item.document.id, revision: item.document.revision, environmentId: item.document.environmentId })), dataAsOf: snapshot.dataAsOf });
      operation.events.push({ sequence: operation.events.length + 1, at: now(), stage: 'documents_saved', message: `已保存 ${documents.length} 份可编辑正文，导出失败时可从这些版本继续` }); return ok();
    });
    const artifacts = frozen.output === 'draft' ? [] : await this.renderArtifacts(id, snapshot.payload, documents.map(item => item.document), jobDir, frozen.output);
    this.ensureRunning(id);
    await this.store.transaction(state => {
      const operation = state.operations[id]; assert(!terminal(operation.status), 'CANCELLED', '作业已结束');
      for (const artifact of artifacts) state.exports[artifact.id] = artifact;
      Object.assign(operation, { status: 'completed', finishedAt: now(), snapshotId: snapshot.id, reportIds: documents.map(item => item.document.id), artifactIds: artifacts.map(item => item.id), dataAsOf: snapshot.dataAsOf, summary: '报告生成完成' });
      operation.events.push({ sequence: operation.events.length + 1, at: now(), stage: 'completed', message: `已完成 ${documents.length} 个环境` }); return ok();
    });
  }
  async renderArtifacts(operationId, payload, documents, jobDir, format) {
    const assets = Object.fromEntries(Object.entries(this.store.state.assets).map(([id, asset]) => [id, { name: asset.name, path: path.join(this.store.root, asset.relative) }]));
    const result = await this.runWorker('export', { payload, documents, jobDir, assets }, operationId); this.ensureRunning(operationId);
    const artifacts = [];
    for (const file of result.files.filter(file => file.format === format)) {
      const id = uid('export'), relative = `exports/${id}/${file.fileName}`; await atomicWrite(path.join(this.store.root, relative), await fs.readFile(file.filePath));
      this.running.get(operationId)?.artifactDirectories.push(path.join(this.store.root, 'exports', id));
      artifacts.push({ id, workspaceId: this.store.state.operations[operationId].workspaceId, operationId, fileName: file.fileName, title: payload.title, createdAt: now(), format, size: file.size, hash: file.hash, path: path.join(this.store.root, relative), reports: documents.map(doc => ({ reportId: doc.id, revision: doc.revision, snapshotId: doc.snapshotId })), envNames: payload.environments.map(env => env.name), dataAsOf: payload.zendao?.fetchedAt });
    }
    return artifacts;
  }
  async commitArtifacts(id, artifacts, extra) {
    return this.store.transaction(state => { const op = state.operations[id]; assert(!terminal(op.status), 'CANCELLED', '作业已取消'); for (const artifact of artifacts) state.exports[artifact.id] = artifact; Object.assign(op, extra, { status: 'completed', finishedAt: now(), artifactIds: artifacts.map(artifact => artifact.id), summary: '本地导出完成' }); op.events.push({ sequence: op.events.length + 1, at: now(), stage: 'completed', message: '产物已保存' }); return ok(); });
  }
  async readDocumentVersion(id, revision) {
    const meta = this.store.state.documents[id]; assert(meta, 'NOT_FOUND', '报告正文不存在');
    assert(revision === undefined || Number.isSafeInteger(revision) && revision > 0 && revision <= meta.revision, 'NOT_FOUND', '正文版本不存在');
    return this.store.readJSON(revision ? `documents/${id}/${revision}/document.json` : meta.path);
  }
  async read_document(args) {
    const document = await this.readDocumentVersion(args.reportId, args.revision);
    const items = document.blocks.filter(block => !args.blockIds || args.blockIds.includes(block.id)).filter(block => args.view !== 'search' || stable(block).includes(args.query || ''));
    const blocks = !args.view || args.view === 'outline' ? items.map(block => ({ id: block.id, type: block.type, text: block.content?.slice(0, 160), rows: block.rows?.length, visible: block.visible, manualOverride: block.manualOverride })) : items;
    return ok({ reportId: document.id, workspaceId: document.workspaceId, revision: document.revision, snapshotId: document.snapshotId, dataAsOf: this.store.state.snapshots[document.snapshotId]?.dataAsOf, environmentId: document.environmentId, page: document.page, ...paged(blocks, args, `${document.id}:${document.revision}:${args.view || 'outline'}`) });
  }
  async edit_document(args, caller) {
    return this.write('edit_document', args, caller, async (state, ws) => {
      assert(args.reportIds.length > 0, 'INVALID_PARAMS', '请指定要修改的报告');
      const updates = [];
      for (const id of args.reportIds) {
        const meta = state.documents[id]; assert(meta?.workspaceId === ws.id, 'NOT_FOUND', '报告不属于当前草稿');
        assert(args.documentRevisions.find(item => item.reportId === id)?.revision === meta.revision, 'REVISION_CONFLICT', '报告正文版本已变化');
        const before = await this.store.readJSON(meta.path), next = editDocument(before, args.operations);
        for (const block of next.blocks) if (block.type === 'attachment' && block.assetId) assert(state.assets[block.assetId], 'NOT_FOUND', '附件资产不存在');
        next.revision++; next.updatedAt = now(); const relative = `documents/${id}/${next.revision}/document.json`; await this.store.putJSON(relative, next);
        updates.push({ id, before, next, relative });
      }
      const documentChangeId = uid('chg');
      state.changes[documentChangeId] = { id: documentChangeId, workspaceId: ws.id, method: 'edit_document', at: now(), documentChanges: updates.map(({ id, before, next }) => ({ id, beforeRevision: before.revision, afterRevision: next.revision })) };
      for (const item of updates) Object.assign(state.documents[item.id], { revision: item.next.revision, path: item.relative });
      if (args.saveAsDefaultTemplate) { assert(updates.length === 1, 'AMBIGUOUS_TARGET', '请指定一份报告作为默认模板'); state.template = templateFromDocument(updates[0].next); state.settings.revision++; }
      return ok({ reports: updates.map(item => ({ id: item.id, revision: item.next.revision })), documentChangeId }, '报告正文已保存，原始统计与历史导出保持不变');
    });
  }
  async copyArtifact(source, destination, overwrite) {
    assert(path.isAbsolute(destination), 'INVALID_PARAMS', '另存路径必须为绝对路径');
    const directory = path.dirname(destination); await fs.access(directory).catch(() => { throw new ReportError('NOT_FOUND', '目标目录不存在'); });
    if (!overwrite) await fs.copyFile(source, destination, fs.constants.COPYFILE_EXCL).catch(error => { if (error.code === 'EEXIST') throw new ReportError('FILE_EXISTS', '目标文件已存在，请换名称或明确 overwrite', { suggestedPath: path.join(directory, `${path.parse(destination).name}-${Date.now()}${path.extname(destination)}`) }); throw error; });
    else await atomicWrite(destination, await fs.readFile(source));
  }
  async export(args, caller) {
    const result = await this.write('export', args, caller, async (state, ws) => {
      if (args.artifactId) {
        const artifact = state.exports[args.artifactId]; assert(artifact?.workspaceId === ws.id, 'NOT_FOUND', '历史产物不存在'); assert(args.destinationPath, 'INVALID_PARAMS', '另存产物需要 destinationPath');
        await this.copyArtifact(artifact.path, args.destinationPath, args.overwrite); return ok({ artifactId: artifact.id, filePath: args.destinationPath, hash: artifact.hash }, '历史产物已另存');
      }
      assert(args.reports?.length && args.format, 'INVALID_PARAMS', '请提供报告版本和导出格式');
      for (const report of args.reports) { const meta = state.documents[report.reportId]; assert(meta?.workspaceId === ws.id, 'NOT_FOUND', '报告不属于当前草稿'); await this.readDocumentVersion(report.reportId, report.revision); }
      const id = uid('op'); state.operations[id] = { id, workspaceId: ws.id, requestId: args.requestId, kind: 'export', status: 'accepted', createdAt: now(), events: [], frozen: { reports: args.reports, format: args.format, destinationPath: args.destinationPath, overwrite: args.overwrite } };
      return ok({ operationId: id }, '本地导出已受理', { status: 'accepted', operationId: id });
    });
    if (result.operationId && !this.running.has(result.operationId) && this.store.state.operations[result.operationId]?.status === 'accepted') this.startJob(result.operationId);
    return result;
  }
  async get_operation(args) {
    const matches = Object.values(this.store.state.operations).filter(op => args.operationId ? op.id === args.operationId : args.requestId && op.requestId === args.requestId);
    if (!matches.length && args.requestId) {
      const receipts = Object.values(this.store.state.receipts).filter(receipt => receipt.requestId === args.requestId);
      assert(receipts.length === 1, receipts.length ? 'AMBIGUOUS_TARGET' : 'NOT_FOUND', '请求回执不存在或不唯一');
      return ok({ receipt: receipts[0].result, method: receipts[0].method, workspaceId: receipts[0].workspaceId, retryAllowed: false }, '已读取持久化请求回执');
    }
    assert(matches.length === 1, matches.length ? 'AMBIGUOUS_TARGET' : 'NOT_FOUND', '请选择唯一作业', { candidates: matches.map(op => ({ id: op.id, workspaceId: op.workspaceId })) });
    const { frozen, ...operation } = clone(matches[0]); operation.events = operation.events.filter(event => event.sequence > (args.afterEvent || 0));
    operation.artifacts = (operation.artifactIds || []).map(id => this.store.state.exports[id]);
    return ok({ ...operation, retryAllowed: ['failed', 'interrupted', 'cancelled'].includes(operation.status), suggestedPollMs: terminal(operation.status) ? null : 1000 }, operation.summary || '报告任务进行中', { status: operation.status, operationId: operation.id });
  }
  async cancel_operation(args, caller) {
    const result = await this.write('cancel_operation', args, caller, async (state, ws) => {
      const op = state.operations[args.operationId]; assert(op?.workspaceId === ws.id, 'NOT_FOUND', '作业不存在');
      if (terminal(op.status)) return ok({ status: op.status }, '作业已经结束');
      op.status = 'cancelling'; return ok({ status: 'cancelling' }, '正在取消作业');
    });
    if (result.data?.status === 'cancelling') { const runtime = this.running.get(args.operationId); runtime?.controller.abort(); await runtime?.worker?.terminate(); await fs.rm(path.join(this.store.root, 'jobs', args.operationId), { force: true, recursive: true }); await this.finishOperation(args.operationId, 'cancelled', { summary: '作业已取消' }); result.data.status = 'cancelled'; }
    return result;
  }
  async list_history(args, caller) {
    const ws = this.workspace(args, caller.sessionId), kind = args.kind || 'exports';
    const items = Object.values(this.store.state[kind]).filter(item => item.workspaceId === ws.id).sort((a, b) => (b.at || b.createdAt).localeCompare(a.at || a.createdAt)).map(item => kind === 'exports' ? item : { id: item.id, at: item.at, method: item.method, fields: item.changes?.map(change => change.path.join('.')), documentChanges: item.documentChanges });
    return ok(paged(items, args, hash(items)));
  }
  async restore_change(args, caller) {
    return this.write('restore_change', args, caller, async (state, ws) => {
      const change = state.changes[args.changeId]; assert(change?.workspaceId === ws.id, 'NOT_FOUND', '修改记录不存在');
      if (change.documentChanges) {
        for (const item of change.documentChanges) {
          const meta = state.documents[item.id]; assert(meta.revision === item.afterRevision, 'REVISION_CONFLICT', '此后正文已再次修改，无法直接撤销');
          const before = await this.readDocumentVersion(item.id, item.beforeRevision); before.revision = meta.revision + 1; before.updatedAt = now();
          const relative = `documents/${item.id}/${before.revision}/document.json`; await this.store.putJSON(relative, before); Object.assign(meta, { revision: before.revision, path: relative });
        }
      } else {
        const target = { settings: state.settings.values, workspaces: state.workspaces, template: state.template };
        for (const item of change.changes) assert(stable(atPath(target, item.path)) === stable(item.afterMissing ? undefined : item.after), 'REVISION_CONFLICT', '后续同字段已修改，不能撤销该记录', { path: item.path.join('.') });
        for (const item of change.changes) setPath(target, item.path, item.before, item.beforeMissing);
        state.settings.values = target.settings; state.workspaces = target.workspaces; state.template = target.template;
        if (change.changes.some(item => item.path[0] === 'settings')) state.settings.revision++;
        this.touch(state.workspaces[ws.id]);
      }
      return ok({ restoredChangeId: args.changeId }, '已撤销指定修改');
    });
  }
}
