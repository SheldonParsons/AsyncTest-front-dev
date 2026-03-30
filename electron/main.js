import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { initUpdater } from './updater.js';
import { WindowManager } from './windowManager.js';
import { initAmindMain } from './amind/ipcMain.node.js';
import { initGeneratorMain } from './generator/ipcMain.node.js';
import { initProjectFilesMain } from './projectFiles.node.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const rustEngine = require('../src-rust/index.cjs');

let mainWindow = null;
let windowManager = null;
let isQuitting = false;
let isQuitApproved = false;
let pendingAppQuitPromise = null;

// amind 主模块实例（必须由 initAmindMain 返回 openFileInWindow 等能力）
let amindMain = null;

// ===== 单实例锁（Windows 必需）=====
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// ===== 打开文件：多入口统一调度（pending + 去重，避免兜底重复触发）=====
const pendingOpenQueue = []; // { abs, source }
const scheduledAbsSet = new Set(); // 同一�� abs 只 schedule 一次（open-file/argv/second-instance）
let gotMacOpenFileEventThisLaunch = false;

function isQuittingForUpdate() {
  return app['__isQuittingForUpdate'] === true;
}

function extractAmindPathsFromArgv(argv) {
  if (!Array.isArray(argv)) return [];
  // 支持一次传多个文件
  return argv.filter(a => typeof a === 'string' && a.toLowerCase().endsWith('.amind'));
}

function extractAmindPathsFromEnv() {
  const raw = process.env.AMIND_OPEN;
  if (typeof raw !== 'string' || !raw.trim()) return [];

  // 允许 AMIND_OPEN="/a.amind:/b.amind"
  const parts = raw.split(':').map(s => s.trim()).filter(Boolean);
  return parts.filter(p => p.toLowerCase().endsWith('.amind'));
}

function scheduleOpenAmind(filePath, source) {
  if (!filePath) return;

  const abs = path.resolve(filePath);

  // 兜底不重复触发：同一个 abs 生命周期只 schedule 一次
  if (scheduledAbsSet.has(abs)) return;
  scheduledAbsSet.add(abs);

  pendingOpenQueue.push({ abs, source });

  if (app.isReady() && windowManager && amindMain) {
    flushPendingOpenQueue().catch(console.error);
  }
}

async function flushPendingOpenQueue() {
  if (!windowManager || !amindMain) return;

  while (pendingOpenQueue.length) {
    const { abs } = pendingOpenQueue.shift();

    // 处理前先移除 scheduled 标记：保证同一文件以后还能再次 schedule（例如窗口关闭后重新双击）
    scheduledAbsSet.delete(abs);

    await amindMain.openFileInWindow(abs);
  }
}

// ===== 平台入口事件 =====

// mac：Finder 双击 / Dock Recent / 打开方式
if (process.platform === 'darwin') {
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    gotMacOpenFileEventThisLaunch = true;
    scheduleOpenAmind(filePath, 'mac:open-file');
  });
}

// win/linux：第二实例（已打开时再次双击文件）
// mac 也可能触发（比如命令行重复启动）
app.on('second-instance', async (event, argv) => {
  const files = extractAmindPathsFromArgv(argv);
  if (files.length) {
    for (const f of files) scheduleOpenAmind(f, 'second-instance');
  } else {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }
});

// ===== 创建主窗口 =====
async function createMainWindow() {
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

  windowManager = new WindowManager({
    preloadPath: path.join(__dirname, 'preload.js'),
    isDev,
    devBaseURL: 'http://localhost:3333',
    prodIndexHTML: path.join(__dirname, '../dist/index.html'),
  });

  mainWindow = await windowManager.createOrFocus('main', {
    width: 1600,
    height: 820,
    minWidth: 1300,
    minHeight: 820,
    trafficLightPosition: { x: 12, y: 12 },
    openDevTools: true,
    title: 'AsyncTest',
    frameless: true,
    nativeHeaderless: true,
    query: { windowKey: 'main' },
    route: '/',
    onReadyToShow: (win) => {
      if (process.platform === 'darwin') {
        win.setWindowButtonVisibility(false);
      }
    },
    closeBehavior: 'platform',
  });

  // 主窗口关闭策略：mac 默认 hide 而不是退出
  mainWindow.on('close', (event) => {
    if (isQuitting || isQuittingForUpdate()) return;
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
      return;
    }

    event.preventDefault();
    void requestAppQuit();
  });

  return mainWindow;
}

function isManagedWindowVisible(win) {
  return !!win && !win.isDestroyed() && !win.isMinimized() && win.isVisible();
}

function isManagedWindowHidden(win) {
  return !!win && !win.isDestroyed() && !win.isMinimized() && !win.isVisible();
}

function getManagedWindowEntries() {
  if (!windowManager) return [];
  return windowManager
    .listKeys()
    .map((key) => [key, windowManager.get(key)])
    .filter((entry) => !!entry[1]);
}

function shouldRestoreMainWindowOnActivate() {
  const managedEntries = getManagedWindowEntries();
  if (managedEntries.some(([, win]) => isManagedWindowVisible(win))) {
    return false;
  }

  const childWindowsHiddenOrClosed = managedEntries
    .filter(([key]) => key !== 'main')
    .every(([, win]) => isManagedWindowHidden(win));

  const main = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  const mainHiddenOrClosed = !main || isManagedWindowHidden(main);

  return childWindowsHiddenOrClosed && mainHiddenOrClosed;
}

function getManagedChildWindowKeys() {
  if (!windowManager) return [];
  return windowManager.listKeys().filter((key) => key !== 'main');
}

function resolveWindowKeyFromWebContents(webContents) {
  if (!windowManager || !webContents) return null;
  for (const key of windowManager.listKeys()) {
    const win = windowManager.get(key);
    if (win?.webContents === webContents) return key;
  }
  return null;
}

async function requestAppQuit() {
  if (isQuitApproved || isQuittingForUpdate()) {
    isQuitting = true;
    return true;
  }

  if (pendingAppQuitPromise) {
    return await pendingAppQuitPromise;
  }

  pendingAppQuitPromise = (async () => {
    try {
      for (const key of getManagedChildWindowKeys()) {
        const childWin = windowManager?.get(key);
        if (!childWin) continue;

        windowManager?.bringToFront(key);
        const closed = await windowManager.requestManagedClose(key);
        if (!closed) {
          isQuitting = false;
          return false;
        }
      }

      isQuitApproved = true;
      isQuitting = true;
      app.quit();
      return true;
    } catch (error) {
      console.error('requestAppQuit failed', error);
      isQuitting = false;
      return false;
    } finally {
      pendingAppQuitPromise = null;
    }
  })();

  return await pendingAppQuitPromise;
}

// ===== 通用 IPC（放 createMainWindow 外，防重复绑定）=====
ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url);
});
ipcMain.handle('ping', async () => 'pong');

ipcMain.on('set-traffic-lights', (event, visible) => {
  if (mainWindow && process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(visible);
  }
});

ipcMain.handle('wm:open', async (event, options) => {
  const opts = options || {};
  const { key } = opts;
  if (!key) throw new Error('wm:open 缺少 key（窗口唯一标识）');
  const existedBefore = windowManager.has(key);

  const config = {
    ...opts,
    parentKey: Object.prototype.hasOwnProperty.call(opts, 'parentKey') ? opts.parentKey : null,
    query: {
      ...(opts.query || {}),
      windowKey: key,
    },
  };

  const win = await windowManager.createOrFocus(key, config);
  if (!existedBefore) {
    windowManager.hide('main');
  }
  return { key, id: win.id };
});

ipcMain.handle('wm:control', async (event, { key, action }) => {
  if (!key || !action) return false;
  const senderKey = resolveWindowKeyFromWebContents(event.sender);
  if (senderKey && senderKey !== key) {
    console.warn('[wm:control] blocked cross-window control request', { senderKey, targetKey: key, action });
    return false;
  }

  switch (action) {
    case 'minimize':
      windowManager.minimize(key);
      return true;
    case 'maximizeToggle':
      windowManager.maximizeToggle(key);
      return true;
    case 'close':
      if (process.platform === 'win32' && key.startsWith('mind:')) {
        return await windowManager.requestManagedClose(key);
      }
      windowManager.close(key);
      return true;
    case 'hide':
      windowManager.hide(key);
      return true;
    default:
      return false;
  }
});

ipcMain.handle('wm:closeResponse', async (event, { key, allow }) => {
  const senderKey = resolveWindowKeyFromWebContents(event.sender);
  if (senderKey && senderKey !== key) {
    console.warn('[wm:closeResponse] blocked mismatched close response', { senderKey, targetKey: key, allow: !!allow });
    return false;
  }
  return windowManager.resolveCloseRequest(key, !!allow);
});

ipcMain.handle('wm:close', async (event, key) => {
  if (!key) return false;
  const senderKey = resolveWindowKeyFromWebContents(event.sender);
  if (senderKey && senderKey !== key) {
    console.warn('[wm:close] blocked cross-window close request', { senderKey, targetKey: key });
    return false;
  }
  if (process.platform === 'win32' && key.startsWith('mind:')) {
    return await windowManager.requestManagedClose(key);
  }
  windowManager.close(key);
  return true;
});

ipcMain.handle('wm:focus', async (event, key) => {
  if (!key) return false;
  windowManager.focus(key);
  return true;
});

ipcMain.handle('wm:list', async () => {
  return windowManager.listKeys();
});

ipcMain.handle('wm:sendTo', async (event, { targetKey, channel, payload }) => {
  if (!targetKey || !channel) return false;
  windowManager.sendTo(targetKey, channel, payload);
  return true;
});

ipcMain.handle('wm:broadcast', async (event, { channel, payload }) => {
  if (!channel) return false;
  windowManager.broadcast(channel, payload);
  return true;
});

ipcMain.handle('wm:popupMenu', async (event, options = {}) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  if (!browserWindow) return null;
  const items = Array.isArray(options.items) ? options.items : [];
  if (!items.length) return null;

  return await new Promise((resolve) => {
    let chosenId = null;
    const menu = Menu.buildFromTemplate(
      items.map((item) => ({
        label: item.label,
        enabled: item.enabled !== false,
        click: () => {
          chosenId = item.id ?? null;
        },
      }))
    );
    menu.popup({
      window: browserWindow,
      x: Number.isFinite(options.x) ? Math.round(options.x) : undefined,
      y: Number.isFinite(options.y) ? Math.round(options.y) : undefined,
      callback: () => resolve(chosenId),
    });
  });
});

// ===== App 生命周期 =====
app.whenReady().then(async () => {
  const win = await createMainWindow();

  amindMain = initAmindMain({
    userDataPath: app.getPath('userData'),
    windowManager,
  });

  initGeneratorMain();
  initProjectFilesMain();

  await flushPendingOpenQueue();

  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

  const argvFiles = extractAmindPathsFromArgv(process.argv);
  const envFiles = isDev && argvFiles.length === 0 ? extractAmindPathsFromEnv() : [];

  const files = argvFiles.length ? argvFiles : envFiles;

  // mac：收到 open-file 就不处理 argv/env（避免重复）
  const shouldHandleCli = process.platform !== 'darwin' || gotMacOpenFileEventThisLaunch === false;

  if (shouldHandleCli && files.length) {
    for (const f of files) scheduleOpenAmind(f, argvFiles.length ? 'argv' : 'env');
    await flushPendingOpenQueue();
  }

  initUpdater(win);
  ipcMain.emit('check-for-update');
});

app.on('activate', () => {
  if (shouldRestoreMainWindowOnActivate()) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  }
});

app.on('before-quit', (event) => {
  if (isQuitApproved || isQuittingForUpdate()) {
    isQuitting = true;
    return;
  }

  event.preventDefault();
  void requestAppQuit();
});
