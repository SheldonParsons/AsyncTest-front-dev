/**
 * Pyright Language Server — Electron main 进程管理
 *
 * 负责：
 *  1. spawn pyright-langserver --stdio 子进程
 *  2. 维护 JSON-RPC 消息流（stdin/stdout）
 *  3. 通过 IPC 与 renderer 双向转发 LSP 消息
 */

import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess = null;
let pendingRequests = new Map(); // id → { resolve, reject, timer }
let nextRequestId = 1;
let headerBuf = '';
let contentLength = -1;
let bodyBuf = Buffer.alloc(0);
let senderWebContents = null;
let initialized = false;

function getPyrightBinary() {
  // electron/lsp/ → 上两层到项目根目录
  const base = path.resolve(__dirname, '..', '..', 'node_modules', '.bin', 'pyright-langserver');
  return process.platform === 'win32' ? base + '.cmd' : base;
}

/**
 * 发送 JSON-RPC 消息到 pyright 进程
 */
function sendToServer(message) {
  if (!serverProcess || !serverProcess.stdin.writable) return;
  const json = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(json, 'utf-8')}\r\n\r\n`;
  serverProcess.stdin.write(header + json, 'utf-8');
}

/**
 * 解析 LSP 消息流（Content-Length 分帧）
 */
function handleServerData(chunk) {
  bodyBuf = Buffer.concat([bodyBuf, chunk]);

  while (true) {
    if (contentLength === -1) {
      // 找 header 结束
      const idx = bodyBuf.indexOf('\r\n\r\n');
      if (idx === -1) break;
      const headerStr = bodyBuf.slice(0, idx).toString('utf-8');
      const match = headerStr.match(/Content-Length:\s*(\d+)/i);
      if (match) contentLength = parseInt(match[1], 10);
      bodyBuf = bodyBuf.slice(idx + 4);
    }

    if (contentLength === -1) break;

    if (bodyBuf.length < contentLength) break;

    const messageStr = bodyBuf.slice(0, contentLength).toString('utf-8');
    bodyBuf = bodyBuf.slice(contentLength);
    contentLength = -1;

    try {
      const message = JSON.parse(messageStr);
      handleServerMessage(message);
    } catch (e) {
      console.error('[pyright] JSON parse error:', e.message);
    }
  }
}

/**
 * 处理从 pyright 收到的 JSON-RPC 消息
 */
function handleServerMessage(message) {
  // Response: 有 id 且有 result 或 error
  if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
    const pending = pendingRequests.get(message.id);
    if (pending) {
      clearTimeout(pending.timer);
      pendingRequests.delete(message.id);
      pending.resolve(message);
    }
    return;
  }

  // Server → Client notification (如 publishDiagnostics)
  if (message.method && message.id === undefined) {
    if (senderWebContents && !senderWebContents.isDestroyed()) {
      senderWebContents.send('lsp:notification', message);
    }
    return;
  }

  // Server → Client request (如 window/showMessage)
  if (message.method && message.id !== undefined) {
    // 简单回复空结果
    sendToServer({ jsonrpc: '2.0', id: message.id, result: null });
  }
}

/**
 * 发送 LSP 请求并等待响应
 */
function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    const id = nextRequestId++;
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`LSP request timeout: ${method}`));
    }, 10000);

    pendingRequests.set(id, { resolve, reject, timer });
    sendToServer({ jsonrpc: '2.0', id, method, params });
  });
}

/**
 * 发送 LSP 通知（无响应）
 */
function sendNotification(method, params) {
  sendToServer({ jsonrpc: '2.0', method, params });
}

/**
 * 启动 pyright 服务
 */
async function startServer(webContents) {
  if (serverProcess) return { status: 'already_running' };

  senderWebContents = webContents;

  const binPath = getPyrightBinary();
  serverProcess = spawn(binPath, ['--stdio'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  serverProcess.stdout.on('data', handleServerData);

  serverProcess.stderr.on('data', (data) => {
    console.error('[pyright stderr]', data.toString());
  });

  serverProcess.on('exit', (code) => {
    console.log('[pyright] exited with code:', code);
    serverProcess = null;
    initialized = false;
    for (const [id, pending] of pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Server exited'));
    }
    pendingRequests.clear();
  });

  serverProcess.on('error', (err) => {
    console.error('[pyright] spawn error:', err);
    serverProcess = null;
  });

  console.log('[pyright] spawned PID:', serverProcess.pid, 'binary:', binPath);

  // LSP initialize
  try {
    const initResult = await sendRequest('initialize', {
      processId: process.pid,
      capabilities: {
        textDocument: {
          completion: {
            completionItem: {
              snippetSupport: true,
              documentationFormat: ['plaintext', 'markdown'],
            },
          },
          hover: {
            contentFormat: ['plaintext', 'markdown'],
          },
          signatureHelp: {
            signatureInformation: {
              documentationFormat: ['plaintext', 'markdown'],
              parameterInformation: { labelOffsetSupport: true },
            },
          },
          publishDiagnostics: {
            relatedInformation: true,
          },
        },
      },
      rootUri: null,
      workspaceFolders: null,
    });

    sendNotification('initialized', {});
    initialized = true;

    return {
      status: 'ok',
      capabilities: initResult.result?.capabilities || {},
    };
  } catch (err) {
    stopServer();
    return { status: 'error', message: err.message };
  }
}

/**
 * 停止 pyright 服务
 */
function stopServer() {
  if (serverProcess) {
    try {
      sendNotification('shutdown', null);
      sendNotification('exit', null);
    } catch (e) {}
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
    }, 1000);
  }
  initialized = false;
}

/**
 * 初始化 IPC 处理
 */
export function initLspMain() {
  // 启动 LSP 服务
  ipcMain.handle('lsp:start', async (event) => {
    return startServer(event.sender);
  });

  // 停止 LSP 服务
  ipcMain.handle('lsp:stop', async () => {
    stopServer();
    return { status: 'ok' };
  });

  // 打开文档
  ipcMain.handle('lsp:didOpen', async (event, payload) => {
    if (!initialized) return { status: 'not_initialized' };
    sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: payload.uri,
        languageId: payload.languageId || 'python',
        version: payload.version || 1,
        text: payload.text,
      },
    });
    return { status: 'ok' };
  });

  // 文档变更
  ipcMain.handle('lsp:didChange', async (event, payload) => {
    if (!initialized) return { status: 'not_initialized' };
    sendNotification('textDocument/didChange', {
      textDocument: { uri: payload.uri, version: payload.version },
      contentChanges: [{ text: payload.text }],
    });
    return { status: 'ok' };
  });

  // 关闭文档
  ipcMain.handle('lsp:didClose', async (event, payload) => {
    if (!initialized) return { status: 'not_initialized' };
    sendNotification('textDocument/didClose', {
      textDocument: { uri: payload.uri },
    });
    return { status: 'ok' };
  });

  // 补全请求
  ipcMain.handle('lsp:completion', async (event, payload) => {
    if (!initialized) return { items: [] };
    try {
      const result = await sendRequest('textDocument/completion', {
        textDocument: { uri: payload.uri },
        position: payload.position,
      });
      return result.result || { items: [] };
    } catch {
      return { items: [] };
    }
  });

  // 悬停请求
  ipcMain.handle('lsp:hover', async (event, payload) => {
    if (!initialized) return null;
    try {
      const result = await sendRequest('textDocument/hover', {
        textDocument: { uri: payload.uri },
        position: payload.position,
      });
      return result.result || null;
    } catch {
      return null;
    }
  });

  // 签名帮助
  ipcMain.handle('lsp:signatureHelp', async (event, payload) => {
    if (!initialized) return null;
    try {
      const result = await sendRequest('textDocument/signatureHelp', {
        textDocument: { uri: payload.uri },
        position: payload.position,
      });
      return result.result || null;
    } catch {
      return null;
    }
  });

  // 获取定义位置
  ipcMain.handle('lsp:definition', async (event, payload) => {
    if (!initialized) return null;
    try {
      const result = await sendRequest('textDocument/definition', {
        textDocument: { uri: payload.uri },
        position: payload.position,
      });
      return result.result || null;
    } catch {
      return null;
    }
  });

  // 获取状态
  ipcMain.handle('lsp:status', async () => {
    return {
      running: !!serverProcess,
      initialized,
    };
  });
}

/**
 * 清理（app 退出时调用）
 */
export function cleanupLsp() {
  stopServer();
}
