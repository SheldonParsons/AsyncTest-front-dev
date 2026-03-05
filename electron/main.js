import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// 1. 解决 ESM 环境下的路径问题
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// 2. 加载更新器和 Rust 引擎（使用 require 绕过 ESM 导出陷阱）
// 注意：即使源文件是 .ts，在运行时的 main.js 引用它通常不写后缀或由构建工具处理
import { initUpdater } from './updater.ts'; 
const rustEngine = require('../src-rust/index.js');

// 3. 全局变量声明
let mainWindow = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 820,
    minWidth: 1300,
    minHeight: 820,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 8 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,    // 建议设为 false，通过 preload 暴露 API 更安全
      contextIsolation: true,   
      webSecurity: false
    }
  });

  // macOS 特有的红绿灯控制
  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false);
  }

  // 窗口关闭逻辑：macOS 默认隐藏而不是退出
  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3333').catch(() => {
      console.error('无法连接到开发服务器，请检查 npm run dev 是否启动');
    });
    mainWindow.webContents.openDevTools();
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

// --- App 生命周期管理 ---

app.whenReady().then(() => {
  const win = createWindow();

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