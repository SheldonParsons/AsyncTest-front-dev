import { BrowserWindow } from 'electron';
import { logCloseDebug } from './closeDebugLogger.js';

/**
 * WindowManager:
 * - create/get/close/focus/list
 * - sendTo/broadcast
 * - closed 自动清理
 * - 支持 beforeClose：关闭前询问 renderer（未保存确认）
 * - 支持 onClosed：真正 closed 后业务清理（比如 docStore/fileIndex）
 */
export class WindowManager {
  /**
   * @param {{ preloadPath: string, isDev: boolean, devBaseURL?: string, prodIndexHTML?: string }} options
   */
  constructor(options) {
    this.options = options;
    /** @type {Map<string, BrowserWindow>} */
    this.windows = new Map();

    // key -> { resolve, timer }
    this._closeRequests = new Map();
    /** @type {Map<string, Promise<boolean>>} */
    this._closeAttempts = new Map();
    /** @type {Map<string, () => Promise<boolean>>} */
    this._managedCloseHandlers = new Map();
  }

  has(key) {
    return this.windows.has(key);
  }

  get(key) {
    const win = this.windows.get(key);
    if (win && !win.isDestroyed()) return win;
    this.windows.delete(key);
    return null;
  }

  listKeys() {
    return [...this.windows.keys()];
  }

  _buildCloseDebugPayload(extra = {}) {
    return {
      ...extra,
      windowKeys: this.listKeys(),
      pid: process.pid,
      platform: process.platform,
    };
  }

  /**
   * 主进程请求 renderer 决定是否允许关闭。
   * renderer 需监听 'wm:before-close' 并调用 ipc invoke 'wm:closeResponse' 回传。
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async requestCloseFromRenderer(key) {
    const win = this.get(key);
    logCloseDebug('wm', 'requestCloseFromRenderer:start', this._buildCloseDebugPayload({ key }));
    if (!win) return true;

    // 已有等待中的请求，复用（避免并发）
    if (this._closeRequests.has(key)) {
      const req = this._closeRequests.get(key);
      return await new Promise((resolve) => {
        const prevResolve = req.resolve;
        req.resolve = (v) => {
          prevResolve(v);
          resolve(v);
        };
      });
    }

    const TIMEOUT_MS = 60000;

    const p = new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._closeRequests.delete(key);
        // 超时策略：默认取消关闭，避免未保存确认在无明确响应时被强制放行。
        resolve(false);
      }, TIMEOUT_MS);

    this._closeRequests.set(key, { resolve, timer });
  });

  win.webContents.send('wm:before-close', { key });
  logCloseDebug('wm', 'requestCloseFromRenderer:sent', this._buildCloseDebugPayload({ key }));
  return await p;
}

  /**
   * renderer 回传 close 决策（由 main.js 的 ipcMain.handle('wm:closeResponse') 调用）
   * @param {string} key
   * @param {boolean} allow
   */
  resolveCloseRequest(key, allow) {
    logCloseDebug('wm', 'resolveCloseRequest', this._buildCloseDebugPayload({ key, allow: !!allow }));
    const req = this._closeRequests.get(key);
    if (!req) return false;
    clearTimeout(req.timer);
    this._closeRequests.delete(key);
    req.resolve(!!allow);
    return true;
  }

  async requestManagedClose(key) {
    logCloseDebug('wm', 'requestManagedClose:entry', this._buildCloseDebugPayload({ key }));
    const handler = this._managedCloseHandlers.get(key);
    if (typeof handler === 'function') {
      return await handler();
    }

    const win = this.get(key);
    if (!win) return true;
    win.close();
    return !this.get(key);
  }

  /**
   * 创建或复用窗口（默认：如果已存在则 focus/show）
   * @param {string} key
   * @param {{
   *  width?: number,
   *  height?: number,
   *  minWidth?: number,
   *  minHeight?: number,
   *  title?: string,
   *  parentKey?: string|null,
   *  modal?: boolean,
   *  show?: boolean,
   *  resizable?: boolean,
   *  route?: string,
   *  hash?: string,
   *  query?: Record<string, any>,
   *  alwaysOnTop?: boolean,
   *  frameless?: boolean,
   *  nativeHeaderless?: boolean,
   *  openDevTools?: boolean,
   *  closeBehavior?: 'platform'|'close'|'hide',
   *  trafficLightPosition?: {x:number,y:number},
   *  onReadyToShow?: (win: BrowserWindow) => void,
   *  onClosed?: () => void,
   *  beforeClose?: () => Promise<boolean>|boolean,
   * }} config
   */
  async createOrFocus(key, config = {}) {
    const existing = this.get(key);
    if (existing) {
      logCloseDebug('wm', 'createOrFocus:existing', this._buildCloseDebugPayload({ key }));
      if (existing.isMinimized()) existing.restore();
      existing.show();
      existing.focus();
      return existing;
    }

    const {
      width = 1200,
      height = 800,
      minWidth = 800,
      minHeight = 600,
      title = key,
      x,
      y,
      parentKey,
      modal = false,
      openDevTools = false,
      nativeHeaderless = true,
      closeBehavior = 'platform',
      trafficLightPosition = { x: 12, y: 12 },
      show = true,
      resizable = true,
      route = '/',
      hash,
      query,
      alwaysOnTop = false,
      frameless = false,
      onReadyToShow,
      onClosed,
      beforeClose,
    } = config;

    const parent = parentKey ? this.get(parentKey) : null;
    const isMac = process.platform === 'darwin';

    const win = new BrowserWindow({
      width,
      height,
      minWidth,
      minHeight,
      title,
      show: false,
      resizable,
      x,
      y,
      parent: parent || undefined,
      modal: parent ? modal : false,
      trafficLightPosition,
      ...(nativeHeaderless
        ? (isMac
          ? { titleBarStyle: 'hiddenInset', frame: true }
          : { frame: false })
        : {}),
      frame: frameless ? false : undefined,
      alwaysOnTop,
      webPreferences: {
        preload: this.options.preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
      },
    });

    this.windows.set(key, win);
    logCloseDebug('wm', 'createOrFocus:created', this._buildCloseDebugPayload({ key, title, route }));

    win.webContents.on('did-finish-load', () => {
      if (config.title) win.setTitle(config.title);
      logCloseDebug('wm', 'window:did-finish-load', this._buildCloseDebugPayload({ key, title: config.title || title }));
    });

    if (this.options.isDev && openDevTools) {
      win.webContents.openDevTools({ mode: 'detach' });
    }

    // closed：统一清理 + 回调
    win.on('closed', () => {
      logCloseDebug('wm', 'window:closed', this._buildCloseDebugPayload({ key }));
      this.windows.delete(key);
      this._managedCloseHandlers.delete(key);
      this._closeAttempts.delete(key);

      const req = this._closeRequests.get(key);
      if (req) {
        clearTimeout(req.timer);
        this._closeRequests.delete(key);
      }

      if (typeof onClosed === 'function') onClosed();
    });

    // close：hide / beforeClose 拦截
    let bypassCloseOnce = false;
    const requestManagedClose = async () => {
      logCloseDebug('wm', 'requestManagedClose:start', this._buildCloseDebugPayload({ key }));
      const currentWin = this.get(key);
      if (!currentWin) return true;

      if (this._closeAttempts.has(key)) {
        logCloseDebug('wm', 'requestManagedClose:reuse-pending', this._buildCloseDebugPayload({ key }));
        return await this._closeAttempts.get(key);
      }

      const closePromise = (async () => {
        let allow = true;
        if (typeof beforeClose === 'function') {
          try {
            allow = await Promise.resolve(beforeClose());
            logCloseDebug('wm', 'requestManagedClose:beforeClose-resolved', this._buildCloseDebugPayload({ key, allow }));
          } catch {
            allow = false;
            logCloseDebug('wm', 'requestManagedClose:beforeClose-threw', this._buildCloseDebugPayload({ key }));
          }
        }

        if (!allow) return false;

        const targetWin = this.get(key);
        if (!targetWin) return true;

        return await new Promise((resolve) => {
          let settled = false;
          const onClosed = () => finish(true);
          const finish = (value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            targetWin.removeListener('closed', onClosed);
            if (!value) {
              bypassCloseOnce = false;
            }
            resolve(value);
          };
          const timer = setTimeout(() => {
            finish(!this.get(key));
          }, 15000);

          targetWin.once('closed', onClosed);
          bypassCloseOnce = true;

          try {
            logCloseDebug('wm', 'requestManagedClose:calling-close', this._buildCloseDebugPayload({ key }));
            targetWin.close();
          } catch {
            logCloseDebug('wm', 'requestManagedClose:close-threw', this._buildCloseDebugPayload({ key }));
            finish(false);
          }
        });
      })().finally(() => {
        logCloseDebug('wm', 'requestManagedClose:finally', this._buildCloseDebugPayload({ key }));
        this._closeAttempts.delete(key);
      });

      this._closeAttempts.set(key, closePromise);
      return await closePromise;
    };

    this._managedCloseHandlers.set(key, requestManagedClose);

    win.on('close', (event) => {
      logCloseDebug('wm', 'window:close:event', this._buildCloseDebugPayload({ key, bypassCloseOnce, closeBehavior }));
      const finalBehavior =
        closeBehavior === 'platform'
          ? 'close'
          : closeBehavior;

      if (finalBehavior === 'hide') {
        event.preventDefault();
        win.hide();
        logCloseDebug('wm', 'window:close:hide', this._buildCloseDebugPayload({ key }));
        return;
      }

      if (bypassCloseOnce) return;

      if (typeof beforeClose === 'function') {
        event.preventDefault();
        logCloseDebug('wm', 'window:close:delegating-managed-close', this._buildCloseDebugPayload({ key }));
        void requestManagedClose();
        return;
      }
    });

    win.once('ready-to-show', () => {
      if (show) win.show();
      logCloseDebug('wm', 'window:ready-to-show', this._buildCloseDebugPayload({ key, show }));
      if (typeof onReadyToShow === 'function') onReadyToShow(win);
    });

    win.on('show', () => {
      logCloseDebug('wm', 'window:show', this._buildCloseDebugPayload({ key }));
    });
    win.on('hide', () => {
      logCloseDebug('wm', 'window:hide', this._buildCloseDebugPayload({ key }));
    });
    win.on('minimize', () => {
      logCloseDebug('wm', 'window:minimize', this._buildCloseDebugPayload({ key }));
    });
    win.on('restore', () => {
      logCloseDebug('wm', 'window:restore', this._buildCloseDebugPayload({ key }));
    });
    win.on('focus', () => {
      logCloseDebug('wm', 'window:focus', this._buildCloseDebugPayload({ key }));
    });

    const finalURL = this._buildURL({ route, hash, query });

    if (this.options.isDev) {
      await win.loadURL(finalURL);
    } else {
      await win.loadFile(this.options.prodIndexHTML, {
        hash: hash ?? this._hashFromRouteQuery(route, query),
      });
    }

    return win;
  }

  close(key) {
    const win = this.get(key);
    logCloseDebug('wm', 'close', this._buildCloseDebugPayload({ key, exists: !!win }));
    if (win) win.close();
  }

  minimize(key) {
    const win = this.get(key);
    logCloseDebug('wm', 'minimize', this._buildCloseDebugPayload({ key, exists: !!win }));
    if (win) win.minimize();
  }

  maximizeToggle(key) {
    const win = this.get(key);
    logCloseDebug('wm', 'maximizeToggle', this._buildCloseDebugPayload({ key, exists: !!win }));
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }

  hide(key) {
    const win = this.get(key);
    logCloseDebug('wm', 'hide', this._buildCloseDebugPayload({ key, exists: !!win }));
    if (win) win.hide();
  }

  focus(key) {
    const win = this.get(key);
    logCloseDebug('wm', 'focus', this._buildCloseDebugPayload({ key, exists: !!win }));
    if (win) {
      win.show();
      win.focus();
    }
  }

  bringToFront(key) {
    const win = this.get(key);
    logCloseDebug('wm', 'bringToFront', this._buildCloseDebugPayload({ key, exists: !!win }));
    if (!win) return false;

    if (win.isMinimized()) win.restore();
    win.show();
    if (typeof win.moveTop === 'function') {
      try {
        win.moveTop();
      } catch {}
    }
    win.focus();
    return true;
  }

  sendTo(key, channel, payload) {
    const win = this.get(key);
    if (win) win.webContents.send(channel, payload);
  }

  broadcast(channel, payload) {
    for (const [, win] of this.windows) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    }
  }

  _buildURL({ route = '/', hash, query }) {
    const base = this.options.devBaseURL || 'http://localhost:3333';
    const finalHash = hash ?? this._hashFromRouteQuery(route, query);
    return `${base}${finalHash ? `#${finalHash}` : ''}`;
  }

  _hashFromRouteQuery(route, query) {
    const qs =
      query && Object.keys(query).length
        ? `?${new URLSearchParams(query).toString()}`
        : '';
    const r = route.startsWith('/') ? route : `/${route}`;
    return `${r}${qs}`;
  }
}
