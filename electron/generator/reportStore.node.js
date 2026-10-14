import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash, createHmac, randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { assert, defaultConfig } from './core/schema.js';

export const clone = value => structuredClone(value);
export const uid = prefix => `${prefix}_${randomUUID()}`;
export const now = () => new Date().toISOString();
export function stable(value) { return JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item); }
export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : stable(value)).digest('hex');
export async function atomicWrite(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await fs.open(temporary, 'wx', 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  await fs.rename(temporary, file);
  if (process.platform !== 'win32') { const directory = await fs.open(path.dirname(file), 'r'); try { await directory.sync(); } finally { await directory.close(); } }
}
export function newWorkspace(name = '当前测试报告', from) {
  return { id: uid('ws'), name, revision: 1, createdAt: now(), updatedAt: now(), archived: false, overrides: clone(from?.overrides || {}), sources: clone(from?.sources || []), activeAssignmentId: from?.activeAssignmentId || null, reports: {}, dirty: true };
}
export class ReportStore extends EventEmitter {
  constructor(root, { profileId, installationId, secureStorage } = {}) {
    super(); this.root = root; this.profileId = profileId; this.installationId = installationId; this.secureStorage = secureStorage; this.queue = Promise.resolve();
  }
  async init() {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    let state;
    for (const name of ['manifest.json', 'manifest.previous.json']) {
      try { const parsed = JSON.parse(await fs.readFile(path.join(this.root, name), 'utf8')); assert(parsed.schemaVersion === 1 && parsed.settings && parsed.workspaces, 'STORE_CORRUPT', '报告存储版本无效'); state = parsed; break; }
      catch (error) { if (error.code !== 'ENOENT') this.recoveryWarning = '报告存储已从最近可恢复版本读取，请检查草稿'; }
    }
    if (!state && this.recoveryWarning) throw new Error('报告存储损坏；已保留原件，请恢复 manifest 备份');
    const ws = newWorkspace();
    this.state = state || { schemaVersion: 1, profileId: this.profileId, installationId: this.installationId, migrationVersion: 0, settings: { revision: 1, values: defaultConfig(), initialized: [] }, workspaces: { [ws.id]: ws }, defaultWorkspaceId: ws.id, assets: {}, snapshots: {}, documents: {}, operations: {}, exports: {}, changes: {}, receipts: {}, scopeCache: {}, template: null, control: { stopped: false, restoreRequested: false } };
    assert(this.state.profileId === this.profileId && this.state.installationId === this.installationId, 'PROFILE_MISMATCH', '报告数据属于其他安装或用户配置');
    this.state.integrityIssues = [];
    for (const workspace of Object.values(this.state.workspaces)) for (const source of workspace.sources) {
      for (const relative of [source.relative, source.parsePath]) {
        try { await fs.access(path.join(this.root, relative)); }
        catch { this.state.integrityIssues.push({ workspaceId: workspace.id, sourceId: source.id, code: 'SOURCE_MISSING', message: `持久化来源 ${source.name} 缺失，请恢复备份或重新导入` }); }
      }
    }
    for (const item of [...Object.values(this.state.snapshots), ...Object.values(this.state.documents)]) {
      try { await fs.access(path.join(this.root, item.path)); }
      catch { this.state.integrityIssues.push({ workspaceId: item.workspaceId, code: 'SNAPSHOT_MISSING', message: `报告版本 ${item.id} 缺失，请恢复备份` }); }
    }
    const keyPath = path.join(this.root, 'credentials', 'request-fingerprint.key');
    try { this.fingerprintKey = await fs.readFile(keyPath); } catch (error) { if (error.code !== 'ENOENT') throw error; this.fingerprintKey = randomBytes(32); await atomicWrite(keyPath, this.fingerprintKey); }
    for (const operation of Object.values(this.state.operations)) {
      if (['accepted', 'running', 'cancelling'].includes(operation.status)) { operation.status = 'interrupted'; operation.finishedAt = now(); operation.events.push({ sequence: operation.events.length + 1, at: now(), stage: 'interrupted', message: '应用关闭，作业已中断；不会自动联网重试' }); }
    }
    await this.persist(this.state);
    return this;
  }
  fingerprint(value) { return createHmac('sha256', this.fingerprintKey).update(stable(value)).digest('hex'); }
  async persist(next) {
    const manifest = path.join(this.root, 'manifest.json');
    // Do not replace the recovery copy with a corrupt primary manifest.
    if (this.state) await atomicWrite(path.join(this.root, 'manifest.previous.json'), JSON.stringify(this.state));
    await atomicWrite(manifest, JSON.stringify(next));
  }
  transaction(callback) {
    const pending = this.queue.then(async () => {
      const next = clone(this.state);
      const result = await callback(next);
      await this.persist(next); this.state = next;
      this.emit('changed', { at: now(), ...result?.event });
      return clone(result?.value ?? result);
    });
    this.queue = pending.catch(() => {}); return pending;
  }
  async putJSON(relative, value) { await atomicWrite(path.join(this.root, relative), JSON.stringify(value)); return relative; }
  async readJSON(relative) { return JSON.parse(await fs.readFile(path.join(this.root, relative), 'utf8')); }
  async putAsset(bytes) {
    const assetId = hash(bytes), relative = `assets/${assetId}/source`;
    try { await fs.access(path.join(this.root, relative)); } catch { await atomicWrite(path.join(this.root, relative), bytes); }
    return { assetId, relative, size: bytes.length, hash: assetId };
  }
  async encryptCredential(password) {
    if (password === null || password === '') return null;
    assert(this.secureStorage?.isEncryptionAvailable() && this.secureStorage?.getSelectedStorageBackend?.() !== 'basic_text', 'SECURE_STORAGE_UNAVAILABLE', '系统安全存储不可用，密码未保存；请启用系统钥匙串');
    const relative = `credentials/${uid('credential')}.bin`;
    await atomicWrite(path.join(this.root, relative), this.secureStorage.encryptString(password)); return relative;
  }
  async password(reference) { return reference ? this.secureStorage.decryptString(await fs.readFile(path.join(this.root, reference))) : ''; }
}
