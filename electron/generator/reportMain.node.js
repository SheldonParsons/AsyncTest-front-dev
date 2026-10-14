import { app, ipcMain, BrowserWindow, safeStorage, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ReportService } from './reportService.node.js';
import { AsyncTestFilesAdapter, reportSiteOrigins } from './adapters/asynctestFiles.node.js';
import { hash, atomicWrite } from './reportStore.node.js';
import { startReportBridge, reportLaunchConfig } from '../mcp/reportBridge.node.js';

export async function initReportMain() {
  const profileId = hash(app.getPath('userData')).slice(0, 24);
  const identityPath = path.join(app.getPath('userData'), 'generator', 'report-installation.json');
  let installationId;
  try { installationId = JSON.parse(await fs.readFile(identityPath, 'utf8')).installationId; } catch {}
  if (!installationId) {
    try { installationId = JSON.parse(await fs.readFile(path.join(app.getPath('userData'), 'generator', 'report-v1', profileId, 'manifest.json'), 'utf8')).installationId; } catch {}
    installationId ||= randomUUID(); await atomicWrite(identityPath, JSON.stringify({ installationId }));
  }
  // Identity survives application upgrades/moves; development and packaged profiles are already isolated by Main.
  const identity = { installationId, profileId, instanceId: randomUUID() };
  let auth = null;
  const files = new AsyncTestFilesAdapter({ getAuth: async () => auth });
  const root = path.join(app.getPath('userData'), 'generator', 'report-v1', identity.profileId);
  const service = await new ReportService({ root, identity, secureStorage: safeStorage, files }).init();
  await service.migrateLegacyExports(path.join(app.getPath('userData'), 'generator'));
  const bridge = await startReportBridge(service);
  const trusted = event => {
    const url = event.senderFrame?.url || event.sender.getURL();
    const devOrigin = new URL(process.env.ASYNCTEST_DEV_SERVER_URL || 'http://localhost:3333').origin;
    if (!(url.startsWith('file://') || !app.isPackaged && new URL(url).origin === devOrigin)) throw new Error('报告 IPC 仅允许桌面页面');
    return { sessionId: `desktop:${event.sender.id}`, desktop: true };
  };
  ipcMain.handle('report:call', (event, { name, args }) => service.call(name, args, trusted(event)));
  ipcMain.handle('report:migrate', (event, legacy) => { trusted(event); return service.migrateLegacy(legacy).catch(error => ({ ok: false, summary: error.message, error: { code: error.code || 'MIGRATION_FAILED' } })); });
  ipcMain.handle('report:import', (event, args) => service.importDesktop(args, trusted(event)).catch(error => ({ ok: false, summary: error.message, error: { code: error.code } })));
  ipcMain.handle('report:importProject', (event, args) => service.importProjectDesktop(args, trusted(event)).catch(error => ({ ok: false, summary: error.message, error: { code: error.code } })));
  ipcMain.handle('report:auth', (event, value) => {
    trusted(event);
    if (!value) { auth = null; return true; }
    const base = new URL(value.baseURL);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('无效的 AsyncTest 服务地址');
    auth = { baseURL: value.baseURL, token: value.token, siteOrigins: reportSiteOrigins(value.baseURL, event.sender.getURL(), value.siteOrigins || []) }; return true;
  });
  ipcMain.handle('report:mcpConfig', event => { trusted(event); return reportLaunchConfig({ appPath: app.getAppPath(), executable: process.execPath, bindingPath: bridge.bindingPath, identity, packaged: app.isPackaged, connection: service.controlState() }); });
  ipcMain.handle('report:control', (event, action) => { trusted(event); return service.desktopControl(action); });
  ipcMain.handle('report:saveArtifact', async (event, artifactId) => {
    const caller = trusted(event), artifact = service.store.state.exports[artifactId];
    if (!artifact) return { ok: false, summary: '报告产物不存在' };
    const chosen = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), { title: '另存测试报告', defaultPath: artifact.fileName });
    if (chosen.canceled || !chosen.filePath) return { ok: true, canceled: true };
    const ws = service.store.state.workspaces[artifact.workspaceId];
    return service.call('report_export', { workspaceId: ws.id, expectedRevisions: service.revisions(service.store.state, ws), requestId: randomUUID(), artifactId, destinationPath: chosen.filePath, overwrite: true }, caller);
  });
  const broadcast = payload => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (window.isDestroyed() || window.webContents.isDestroyed()) continue;
      // A renderer can finish closing between enumeration and IPC delivery.
      try { window.webContents.send('report:changed', payload); } catch {}
    }
  };
  service.on('changed', broadcast); service.on('control', state => broadcast({ control: state }));
  app.on('web-contents-created', (_event, contents) => {
    const sessionId = `desktop:${contents.id}`;
    contents.once('destroyed', () => service.disconnect(sessionId));
  });
  return { service, close: async () => { for (const runtime of service.running.values()) { runtime.controller.abort(); await runtime.worker?.terminate(); } await bridge.close(); } };
}
