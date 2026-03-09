// electron/windowManager.js
import { BrowserWindow } from 'electron';
import path from 'path';

/**
 * 一个简单可用的窗口管理器：
 * - 统一 create/get/close/focus/list
 * - 统一发送消息到某个窗口 / 广播
 * - 统一注册生命周期，防止内存泄漏（closed 自动清理）
 */
export class WindowManager {
    /**
     * @param {{ preloadPath: string, isDev: boolean, devBaseURL?: string, prodIndexHTML?: string }} options
     */
    constructor(options) {
        this.options = options;
        /** @type {Map<string, BrowserWindow>} */
        this.windows = new Map();
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

    /**
     * 创建或复用窗口（默认：如果已存在则 focus/show）
     * @param {string} key - 窗口唯一 key（如 'main', 'settings', 'child:xxx'）
     * @param {{
     *  width?: number,
     *  height?: number,
     *  minWidth?: number,
     *  minHeight?: number,
     *  title?: string,
     *  parentKey?: string,
     *  modal?: boolean,
     *  show?: boolean,
     *  resizable?: boolean,
     *  route?: string, // 你前端的路由，如 '/settings' 或 '/child?id=1'
     *  hash?: string,  // 若你喜欢 hash 路由，也可用
     *  query?: Record<string, string>,
     *  alwaysOnTop?: boolean,
     *  frameless?: boolean,
     *  onReadyToShow?: (win: BrowserWindow) => void
     * }} config
     */
    async createOrFocus(key, config = {}) {
        const existing = this.get(key);
        if (existing) {
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
            onReadyToShow
        } = config;

        const parent = parentKey ? this.get(parentKey) : null;

        const isMac = process.platform === 'darwin';

        const win = new BrowserWindow({
            width,
            height,
            minWidth,
            minHeight,
            title,
            show: false, // 等 ready-to-show 再 show，减少白屏
            resizable,
            x,
            y,
            parent: parent || undefined,
            modal: parent ? modal : false,
            trafficLightPosition,
            ...(nativeHeaderless
                ? (isMac
                    ? {
                        titleBarStyle: 'hiddenInset',
                        frame: true, // mac 建议保留 frame=true + hidden，更稳定
                    }
                    : {
                        frame: false, // Windows/Linux 用 frame:false
                    })
                : {}),
            alwaysOnTop,
            webPreferences: {
                preload: this.options.preloadPath,
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: false
            }
        });

        win.webContents.on('did-finish-load', () => {
            if (config.title) win.setTitle(config.title);
        });

        if (this.options.isDev && openDevTools) {
            win.webContents.openDevTools({ mode: 'detach' });
        }

        // 注册到管理器
        this.windows.set(key, win);

        // 关闭后自动清理
        win.on('closed', () => {
            console.log("closed");

            this.windows.delete(key);
        });

        // 关闭策略：mac 默认 hide，Windows 默认 close（只针对“子窗口”更常见）
        win.on('close', (event) => {
            const isMain = key === 'main';
            const isMac = process.platform === 'darwin';

            const finalBehavior = closeBehavior === 'platform' ? (isMac ? (isMain ? 'close' : 'close') : 'close') : closeBehavior;
            console.log(finalBehavior);
            
            if (finalBehavior === 'hide') {
                event.preventDefault();
                win.hide();
            }
        });

        // 统一 show 逻辑
        win.once('ready-to-show', () => {
            if (show) win.show();
            if (typeof onReadyToShow === 'function') onReadyToShow(win);
        });

        // 加载 URL（dev / prod）
        const finalURL = this._buildURL({ route, hash, query });
        if (this.options.isDev) {
            await win.loadURL(finalURL);
            // 子窗口一般不开 devtools，你需要的话自己打开：
            win.webContents.openDevTools({ mode: 'detach' });
        } else {
            // 生产环境：loadFile + hash/查询参数
            // 这里用 loadFile 更稳；route/hash/query 拼到 hash 里也行
            // 方案：统一用 hash 承载路由（即使你是 history 路由，也可在前端解析）
            await win.loadFile(this.options.prodIndexHTML, {
                hash: hash ?? this._hashFromRouteQuery(route, query)
            });
        }

        return win;
    }

    close(key) {
        const win = this.get(key);
        console.log("win");
        console.log(win);


        if (win) win.close();
    }

    minimize(key) {
        const win = this.get(key);
        if (win) win.minimize();
    }
    maximizeToggle(key) {
        const win = this.get(key);
        if (!win) return;
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    }
    hide(key) {
        const win = this.get(key);
        if (win) win.hide();
    }

    focus(key) {
        const win = this.get(key);
        if (win) {
            win.show();
            win.focus();
        }
    }

    /**
     * 给某个窗口发送消息（窗口必须存在）
     */
    sendTo(key, channel, payload) {
        const win = this.get(key);
        if (win) win.webContents.send(channel, payload);
    }

    /**
     * 广播给所有窗口
     */
    broadcast(channel, payload) {
        for (const [, win] of this.windows) {
            if (win && !win.isDestroyed()) {
                win.webContents.send(channel, payload);
            }
        }
    }

    _buildURL({ route = '/', hash, query }) {
        // dev 下：用 devBaseURL 拼 route/query/hash
        // 比如 http://localhost:3333/#/settings 或 http://localhost:3333/settings
        const base = this.options.devBaseURL || 'http://localhost:3333';

        // 如果你用 hash 路由：推荐传 route='/xxx' 然后生成 '#/xxx?...'
        // 如果你用 history 路由：也可以让 route='/xxx' 直接拼到 base 后面
        // 这里默认按 hash 路由生成（更适合 Electron 打包后）
        const finalHash = hash ?? this._hashFromRouteQuery(route, query);
        return `${base}${finalHash ? `#${finalHash}` : ''}`;
    }

    _hashFromRouteQuery(route, query) {
        // 生成形如 "/child?id=123"
        const qs =
            query && Object.keys(query).length
                ? `?${new URLSearchParams(query).toString()}`
                : '';
        // 保证 route 以 / 开头
        const r = route.startsWith('/') ? route : `/${route}`;
        return `${r}${qs}`;
    }
}