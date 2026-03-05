// electron/updater.ts
import { createRequire } from 'module';
import { ipcMain, BrowserWindow, app } from 'electron'; // 引入 app
import log from 'electron-log';
import path from 'path'; // 必须引入 path 处理路径

const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater');

let checkInterval: NodeJS.Timeout | null = null;
let cachedUpdateInfo: any = null;

export function initUpdater(mainWindow: BrowserWindow) {
    // --- 0. 基础配置 ---
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false;

    // --- 【关键修改】开发环境测试配置 ---
    if (!app.isPackaged) {
        autoUpdater.forceDevUpdateConfig = true;
        // 使用 process.cwd() 获取项目根目录最稳妥
        const devConfigPath = path.join(process.cwd(), 'dev-app-update.yml');
        autoUpdater.updateConfigPath = devConfigPath;
        log.info('开发模式配置路径已修正:', devConfigPath);
    }

    // 动态设置更新源
    const updateUrl = process.env.VITE_UPDATE_URL;
    if (updateUrl) {
        autoUpdater.setFeedURL(updateUrl);
    }

    // --- 1. 定时检查逻辑 ---
    const checkUpdate = () => {
        log.info('正在执行例行版本检查...');
        // 如果是开发环境，确保 checkForUpdates 能够运行
        autoUpdater.checkForUpdates().catch((err: Error) => {
            log.error('例行检查失败:', err.message);
        });
    };

    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(checkUpdate, 2 * 60 * 60 * 1000);

    // --- 2. 监听事件流 ---
    autoUpdater.on('update-available', (info: any) => {
        log.info('检测到更新，原始数据:', info.releaseNotes);

        let parsedNotes: any = {};
        const rawNotes = info.releaseNotes;

        if (typeof rawNotes === 'object') {
            // 如果已经是对象，直接用
            parsedNotes = rawNotes;
        } else if (typeof rawNotes === 'string') {
            try {
                // 如果是字符串，尝试解析
                parsedNotes = JSON.parse(rawNotes);
            } catch (e) {
                log.warn('releaseNotes 解析 JSON 失败，当作纯文本处理');
                parsedNotes = { notes: rawNotes, isForce: rawNotes.includes('[FORCE]') };
            }
        }

        // 确保发给前端的字段名和 Vue 组件里的一致
        cachedUpdateInfo = {
            version: info.version,
            notes: parsedNotes.notes || '',
            isForce: !!parsedNotes.isForce,
            publishDate: parsedNotes.publishDate || ''
        };

        log.info('准备向前端发送格式化后的数据:', cachedUpdateInfo);

        sendUpdateToRenderer()
    });

    const sendUpdateToRenderer = () => {
        if (cachedUpdateInfo && mainWindow && !mainWindow.isDestroyed()) {
            // 打印窗口标题，确认它不是一个空的或者后台的隐藏窗口
            log.info('正在向窗口发送信号, 窗口标题:', mainWindow.getTitle());
            mainWindow.webContents.send('update-available', cachedUpdateInfo);
        } else {
            log.error('无法发送信号：mainWindow 丢失、销毁或缓存为空');
        }
    };

    // --- 关键：监听渲染进程的“我准备好了”信号 ---
    ipcMain.on('renderer-ready-for-update', () => {
        log.info('渲染进程报告：已准备就绪，正在检查是否有缓存的更新信息...');
        if (cachedUpdateInfo) {
            sendUpdateToRenderer();
        } else {
            // 如果还没检查过，顺便触发一次检查
            checkUpdate();
        }
    });

    ipcMain.on('renderer-confirmed-receipt', () => {
        log.info('!!! 确认：渲染进程已经收到了更新信号 !!!');
    });

    autoUpdater.on('update-not-available', (info: any) => {
        log.info('已经是最新版:', info.version);
        mainWindow.webContents.send('update-not-available', info.version);
    });

    autoUpdater.on('error', (err: Error) => {
        log.error('更新器报错:', err);
        mainWindow.webContents.send('updater-error', err.message);
    });

    autoUpdater.on('download-progress', (progressObj: any) => {
        // 实时发送下载百分比到渲染进程
        mainWindow.webContents.send('download-progress', Math.floor(progressObj.percent));
    });

    autoUpdater.on('update-downloaded', (info: any) => {
        log.info('更新下载完成');
        const isForce = info.releaseNotes?.includes('[FORCE]') || false;
        mainWindow.webContents.send('update-downloaded', { isForce });
    });

    // --- 3. IPC 信号处理 ---
    ipcMain.on('check-for-update', () => {
        checkUpdate();
    });

    ipcMain.on('start-download', () => {
        log.info('用户点击：开始下载更新');
        autoUpdater.downloadUpdate();
    });

    ipcMain.on('install-now', () => {
        log.info('用户点击：立即重启安装');
        // 在开发环境，这一步会由于没有安装包可替换而报错，这是正常的
        autoUpdater.quitAndInstall(false, true);
    });
}

export function stopUpdater() {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}