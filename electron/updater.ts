// electron/updater.ts
import { createRequire } from 'module';
import { ipcMain, BrowserWindow } from 'electron';
import log from 'electron-log';

// 使用 createRequire 来加载 CommonJS 模块，绕过 ESM 导出报错
const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater');

let checkInterval: NodeJS.Timeout | null = null;

export function initUpdater(mainWindow: BrowserWindow) {
    // 0. 基础配置
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false; // 严格控制：由用户点击后再下载

    // 动态设置更新源 (从打包注入的环境变量读取)
    const updateUrl = process.env.VITE_UPDATE_URL;
    if (updateUrl) {
        autoUpdater.setFeedURL(updateUrl);
    }

    // --- 1. 定时检查逻辑 ---
    const checkUpdate = () => {
        log.info('正在执行例行版本检查...');
        // checkForUpdates() 返回一个 Promise，必须 catch 捕获异常
        autoUpdater.checkForUpdates().catch((err: Error) => {
            log.error('例行检查失败:', err.message);
        });
    };

    // 每 2 小时检查一次
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(checkUpdate, 2 * 60 * 60 * 1000);

    // --- 2. 监听事件流 ---

    // 发现新版本
    autoUpdater.on('update-available', (info: any) => {
        log.info('发现新版本:', info.version);
        const isForce = info.releaseNotes?.includes('[FORCE]') || false;

        mainWindow.webContents.send('update-available', {
            version: info.version,
            releaseNotes: info.releaseNotes,
            isForce: isForce
        });
    });

    // 已经是最新版
    autoUpdater.on('update-not-available', (info: any) => {
        mainWindow.webContents.send('update-not-available', info.version);
    });

    // 更新报错 (如网络不通)
    autoUpdater.on('error', (err: Error) => {
        log.error('更新器报错:', err);
        mainWindow.webContents.send('updater-error', err.message);
    });

    // 进度条
    autoUpdater.on('download-progress', (progressObj: any) => {
        mainWindow.webContents.send('download-progress', Math.floor(progressObj.percent));
    });

    // 下载完成
    autoUpdater.on('update-downloaded', (info: any) => {
        const isForce = info.releaseNotes?.includes('[FORCE]') || false;
        mainWindow.webContents.send('update-downloaded', { isForce });
    });

    // --- 3. IPC 信号处理 ---

    // 渲染进程发起检查
    ipcMain.on('check-for-update', () => {
        checkUpdate();
    });

    // 启动下载
    ipcMain.on('start-download', () => {
        autoUpdater.downloadUpdate();
    });

    // 执行安装
    ipcMain.on('install-now', () => {
        autoUpdater.quitAndInstall(false, true);
    });
}

export function stopUpdater() {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}