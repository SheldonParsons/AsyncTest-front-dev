// electron/main.js
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// 1. 解决 ESM 环境下的路径问题
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// 2. 加载更新器和 Rust 引擎（使用 require 绕过 ESM 导出陷阱）
// 注意：即使源文件是 .ts，在运行时的 main.js 引用它通常不写后缀或由构建工具处理
import { initUpdater } from './updater.js';
import { WindowManager } from './windowManager.js';
const rustEngine = require('../src-rust/index.cjs');

// 3. 全局变量声明
let mainWindow = null;
let windowManager = null;
let isQuitting = false;

// 新增：统一从 app 上读更新退出标记
function isQuittingForUpdate() {
  return app["__isQuittingForUpdate"] === true;
}



async function createMainWindow() {
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  // 统一窗口管理器：主进程唯一实例
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
    openDevTools: false,
    title: 'AsyncTest',
    frameless: true,
    query: { windowKey: 'main' },
    route: '/', // 你的主页面路由（hash路由为 '#/'）
    onReadyToShow: (win) => {
      if (process.platform === 'darwin') {
        win.setWindowButtonVisibility(false);
      }
    }
  });

  // macOS 特有的红绿灯控制
  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false);
  }

  // 窗口关闭逻辑：macOS 默认隐藏而不是退出
  mainWindow.on('close', (event) => {
    // 关键：如果是“正常退出”或“更新安装退出”，必须放行
    if (isQuitting || isQuittingForUpdate()) return;

    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });



  if (isDev) {
    mainWindow.loadURL('http://localhost:3333').catch(() => {
      console.error('无法连接到开发服务器，请检查 npm run dev 是否启动');
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return mainWindow;
}

// --- IPC 监听器：务必放在 createWindow 之外，防止重复绑定 ---

ipcMain.on('set-traffic-lights', (event, visible) => {
  if (mainWindow && process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(visible);
  }
});

ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url);
});
ipcMain.handle('ping', async () => 'pong');
// 2) 新增：主窗口请求打开“新窗口”
// 渲染进程用 ipcRenderer.invoke('wm:open', {...}) 调用
ipcMain.handle('wm:open', async (event, options) => {
  const opts = options || {};
  const { key } = opts;

  if (!key) throw new Error('wm:open 缺少 key（窗口唯一标识）');

  // 透传：只做 query 合并和默认值（可选）
  const config = {
    ...opts,

    // 建议默认不绑定 parent，避免 mac 上各种“附属窗口”行为
    parentKey: Object.prototype.hasOwnProperty.call(opts, 'parentKey')
      ? opts.parentKey
      : null,

    query: {
      ...(opts.query || {}),
      windowKey: key,
    },
  };

  const win = await windowManager.createOrFocus(key, config);

  return { key, id: win.id };
});

ipcMain.handle('wm:control', async (event, { key, action }) => {
  if (!key || !action) return false;

  switch (action) {
    case 'minimize':
      windowManager.minimize(key);
      return true;
    case 'maximizeToggle':
      windowManager.maximizeToggle(key);
      return true;
    case 'close':
      windowManager.close(key);
      return true;
    case 'hide':
      windowManager.hide(key);
      return true;
    default:
      return false;
  }
});

ipcMain.handle('wm:change_title', async (event, key, title) => {
  if (!key) return false
  const win = windowManager.get(key)
  win.setTitle(config.title);
})

// 3) 新增：关闭窗口
ipcMain.handle('wm:close', async (event, key) => {
  if (!key) return false;
  windowManager.close(key);
  return true;
});

// 4) 新增：聚焦窗口
ipcMain.handle('wm:focus', async (event, key) => {
  if (!key) return false;
  windowManager.focus(key);
  return true;
});

// 5) 新增：列出所有窗口 keys（调试/管理用）
ipcMain.handle('wm:list', async () => {
  return windowManager.listKeys();
});

// 6) 新增：窗口之间通信（主进程转发）
// from renderer: invoke('wm:sendTo', { targetKey, channel, payload })
ipcMain.handle('wm:sendTo', async (event, { targetKey, channel, payload }) => {
  if (!targetKey || !channel) return false;
  windowManager.sendTo(targetKey, channel, payload);
  return true;
});

// 7) 新增：广播
ipcMain.handle('wm:broadcast', async (event, { channel, payload }) => {
  if (!channel) return false;
  windowManager.broadcast(channel, payload);
  return true;
});

// --- App 生命周期管理 ---

app.whenReady().then(async () => {
  const win = await createMainWindow();

  // 初始化 Rust 引擎测试（已验证通过）
  try {
    console.log('🧪 Rust Engine Test (plus100):', rustEngine.plus100(42));
  } catch (e) {
    console.error('Rust 引擎加载失败:', e);
  }

  // 初始化更新器
  initUpdater(win);

  // 启动时立即执行第一次检查
  ipcMain.emit('check-for-update');
});

// 核心修复：防止多窗口被重复创建
app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});