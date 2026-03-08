import { createRequire } from "module";
import { ipcMain, app } from "electron";
import log from "electron-log";
import path from "path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { autoUpdater } = require("electron-updater");

function normalizeBase(base) {
  if (!base) return "";
  return base.endsWith("/") ? base : base + "/";
}

function getUpdateBaseUrl() {
  // 1) 生产：读 resources/update-config.json
  try {
    const cfgPath = path.join(process.resourcesPath, "update-config.json");
    const raw = fs.readFileSync(cfgPath, "utf8");
    const cfg = JSON.parse(raw);
    if (cfg?.base && typeof cfg.base === "string") return normalizeBase(cfg.base);
  } catch {
    // ignore
  }

  // 2) 开发兜底：env
  if (process.env.VITE_UPDATE_URL) return normalizeBase(process.env.VITE_UPDATE_URL);

  return "";
}

function computeFeedUrl(base) {
  if (!base) return "";

  if (process.platform === "darwin") {
    return `${base}mac/${process.arch}/`;
  }

  if (process.platform === "win32") {
    return `${base}win/x64/`;
  }

  return "";
}

let checkInterval = null;
let cachedUpdateInfo = null;

export function initUpdater(mainWindow) {
  log.info("electron-log file =", log.transports.file.getFile().path);
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;

  if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true;
    const devConfigPath = path.join(process.cwd(), "dev-app-update.yml");
    autoUpdater.updateConfigPath = devConfigPath;
    log.info("开发模式配置路径已修正:", devConfigPath);
  }

  const base = getUpdateBaseUrl();
  const feed = computeFeedUrl(base);

  if (feed) {
    log.info("autoUpdater baseURL =", base);
    log.info("autoUpdater feedURL =", feed);
    log.info("platform/arch =", process.platform, process.arch);
    log.info("resourcesPath =", process.resourcesPath);
    autoUpdater.setFeedURL({
      provider: "generic",
      url: feed,
    });
    log.info("platform/arch =", process.platform, process.arch);
    log.info("resourcesPath =", process.resourcesPath);
    log.info("update-config base =", base);
    log.info("computed feed =", feed);
  } else {
    log.warn("autoUpdater feedURL not set (missing update-config.json base?)");
  }

  const checkUpdate = () => {
    log.info("正在执行例行版本检查...");
    autoUpdater.checkForUpdates().catch((err) => {
      log.error("例行检查失败:", err?.message ?? String(err));
    });
  };

  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(checkUpdate, 2 * 60 * 60 * 1000);

  autoUpdater.on("before-quit-for-update", () => {
    log.info("before-quit-for-update");
    app["__isQuittingForUpdate"] = true;
  });

  autoUpdater.on("update-available", (info) => {
    log.info("检测到更新，原始数据:", info.releaseNotes);

    let parsedNotes = {};
    const rawNotes = info.releaseNotes;

    if (typeof rawNotes === "object" && rawNotes !== null) {
      parsedNotes = rawNotes;
    } else if (typeof rawNotes === "string") {
      try {
        parsedNotes = JSON.parse(rawNotes);
      } catch (e) {
        log.warn("releaseNotes 解析 JSON 失败，当作纯文本处理");
        parsedNotes = { notes: rawNotes, isForce: rawNotes.includes("[FORCE]") };
      }
    }

    cachedUpdateInfo = {
      version: info.version,
      notes: parsedNotes.notes || "",
      isForce: !!parsedNotes.isForce,
      publishDate: parsedNotes.publishDate || "",
    };

    log.info("准备向前端发送格式化后的数据:", cachedUpdateInfo);
    sendUpdateToRenderer();
  });

  const sendUpdateToRenderer = () => {
    if (cachedUpdateInfo && mainWindow && !mainWindow.isDestroyed()) {
      log.info("正在向窗口发送信号, 窗口标题:", mainWindow.getTitle());
      mainWindow.webContents.send("update-available", cachedUpdateInfo);
    } else {
      log.error("无法发送信号：mainWindow 丢失、销毁或缓存为空");
    }
  };

  ipcMain.on("renderer-ready-for-update", () => {
    log.info("渲染进程报告：已准备就绪，正在检查是否有缓存的更新信息...");
    if (cachedUpdateInfo) sendUpdateToRenderer();
    else checkUpdate();
  });

  ipcMain.on("renderer-confirmed-receipt", () => {
    log.info("!!! 确认：渲染进程已经收到了更新信号 !!!");
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("已经是最新版:", info.version);
    mainWindow.webContents.send("update-not-available", info.version);
  });

  autoUpdater.on("error", (err) => {
    log.error("更新器报错:", err);
    mainWindow.webContents.send("updater-error", err?.message ?? String(err));
  });

  autoUpdater.on("download-progress", (progressObj) => {
    mainWindow.webContents.send("download-progress", Math.floor(progressObj.percent));
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("更新下载完成");
    const isForce = (info.releaseNotes || "").includes?.("[FORCE]") || false;
    mainWindow.webContents.send("update-downloaded", { isForce });
  });

  ipcMain.on("check-for-update", () => {
    checkUpdate();
  });

  ipcMain.on("start-download", () => {
    log.info("用户点击：开始下载更新");
    autoUpdater.downloadUpdate();
  });

  ipcMain.on("install-now", () => {
    log.info("用户点击：立即重启安装");
    app["__isQuittingForUpdate"] = true;
    autoUpdater.quitAndInstall();
  });
}

export function stopUpdater() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}