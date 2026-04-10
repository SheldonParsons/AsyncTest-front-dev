/**
 * Python 脚本运行器 — Electron main 进程
 *
 * 负责：
 *  1. 检测本地 Python 环境及版本
 *  2. spawn python3 执行用户脚本
 *  3. 实时推送 stdout/stderr 到 renderer
 *  4. 进程生命周期管理（运行/停止）
 *  5. 持久化用户选择的 Python 路径
 */

import { ipcMain, dialog, app } from 'electron';
import { spawn, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

let runningProcess = null;   // ChildProcess 对象
let senderWebContents = null;
let outputStopped = false;   // 数据推送开关

const SERVER_PYTHON_VERSION = '3.11.7';

// ── 持久化配置 ──

function getConfigPath() {
  return path.join(app.getPath('userData'), 'python-config.json');
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[pythonRunner] saveConfig failed:', e.message);
  }
}

/**
 * 检测 Python 环境
 */
function detectPython() {
  return new Promise((resolve) => {
    const candidates = process.platform === 'win32'
      ? ['python', 'python3', 'py']
      : ['python3', 'python'];

    let idx = 0;

    function tryNext() {
      if (idx >= candidates.length) {
        resolve({ found: false, binary: null, version: null, binPath: null });
        return;
      }
      const bin = candidates[idx++];
      execFile(bin, ['--version'], { timeout: 5000 }, (err, stdout, stderr) => {
        if (err) {
          tryNext();
          return;
        }
        const output = (stdout || stderr || '').trim();
        const match = output.match(/Python\s+(\d+\.\d+\.\d+)/);
        if (match) {
          // 获取完整路径
          const whichCmd = process.platform === 'win32' ? 'where' : 'which';
          execFile(whichCmd, [bin], { timeout: 3000 }, (e2, pathOut) => {
            const binPath = e2 ? bin : pathOut.trim().split('\n')[0];
            resolve({ found: true, binary: bin, version: match[1], binPath });
          });
        } else {
          tryNext();
        }
      });
    }

    tryNext();
  });
}

/**
 * 比较主版本号是否一致
 */
function versionMismatchWarning(localVersion) {
  if (!localVersion) return null;
  if (localVersion !== SERVER_PYTHON_VERSION) {
    return `本地 Python ${localVersion} 与服务器 Python ${SERVER_PYTHON_VERSION} 版本不一致，运行结果可能存在差异`;
  }
  return null;
}

/**
 * 彻底终止当前运行的进程：断开 pipe、kill、销毁流
 */
function forceKillRunning() {
  if (!runningProcess) return;
  const proc = runningProcess;
  const pid = proc.pid;
  runningProcess = null;
  outputStopped = true;

  console.log('[pythonRunner] forceKill pid:', pid);

  // 1. 移除 stdout/stderr 监听 + 销毁流
  proc.stdout.removeAllListeners('data');
  proc.stderr.removeAllListeners('data');
  try { proc.stdin.destroy(); } catch (e) {}
  try { proc.stdout.destroy(); } catch (e) {}
  try { proc.stderr.destroy(); } catch (e) {}

  // 2. 杀进程
  try {
    proc.kill('SIGKILL');
    console.log('[pythonRunner] proc.kill(SIGKILL) done');
  } catch (e) {
    console.warn('[pythonRunner] proc.kill failed:', e.message);
  }

  try {
    process.kill(pid, 9);
    console.log('[pythonRunner] process.kill(pid, 9) done');
  } catch (e) {
    if (e.code !== 'ESRCH') {
      console.warn('[pythonRunner] process.kill failed:', e.code);
      try { spawn('kill', ['-9', String(pid)], { stdio: 'ignore' }); } catch (e2) {}
    }
  }

  // 3. 500ms 后检测进程是否真的死了
  setTimeout(() => {
    try {
      process.kill(pid, 0); // signal 0 = 检测存活
      console.error('[pythonRunner] ⚠ pid', pid, 'STILL ALIVE after SIGKILL!');
      // 再杀一次
      try { spawn('kill', ['-9', String(pid)], { stdio: 'ignore' }); } catch (e) {}
    } catch (e) {
      console.log('[pythonRunner] ✓ pid', pid, 'confirmed dead');
    }
  }, 500);
}

/**
 * 初始化 IPC 处理
 */
export function initPythonRunnerMain() {
  // 检测 Python 环境
  ipcMain.handle('python:check-env', async () => {
    const result = await detectPython();
    const warning = result.found ? versionMismatchWarning(result.version) : null;
    return { ...result, serverVersion: SERVER_PYTHON_VERSION, versionWarning: warning };
  });

  // 选择 Python 可执行文件（持久化）
  ipcMain.handle('python:select-binary', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 Python 可执行文件',
      properties: ['openFile'],
      filters: process.platform === 'win32'
        ? [{ name: 'Executable', extensions: ['exe'] }, { name: 'All Files', extensions: ['*'] }]
        : [],
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    const selectedPath = result.filePaths[0];
    // 持久化
    const cfg = loadConfig();
    cfg.pythonBin = selectedPath;
    saveConfig(cfg);
    return { canceled: false, path: selectedPath };
  });

  // 获取已保存的配置
  ipcMain.handle('python:get-config', async () => {
    return loadConfig();
  });

  // 重置为自动检测
  ipcMain.handle('python:reset-binary', async () => {
    const cfg = loadConfig();
    delete cfg.pythonBin;
    saveConfig(cfg);
    return { status: 'ok' };
  });

  // 运行脚本
  ipcMain.handle('python:run', async (event, payload) => {
    senderWebContents = event.sender;

    // 如果已有进程在运行，先终止
    forceKillRunning();

    // 检测环境（优先使用持久化路径，其次 payload 指定，最后自动检测）
    let env;
    const customBin = payload.customBin || loadConfig().pythonBin;
    if (customBin) {
      try {
        const { stdout, stderr } = await new Promise((resolve, reject) => {
          execFile(customBin, ['--version'], { timeout: 5000 }, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve({ stdout, stderr });
          });
        });
        const output = (stdout || stderr || '').trim();
        const match = output.match(/Python\s+(\d+\.\d+\.\d+)/);
        if (match) {
          env = { found: true, binary: customBin, version: match[1], binPath: customBin };
        } else {
          return { status: 'no_python', message: `指定的路径 ${customBin} 不是有效的 Python 环境` };
        }
      } catch (e) {
        return { status: 'no_python', message: `无法执行 ${customBin}: ${e.message}` };
      }
    } else {
      env = await detectPython();
    }

    if (!env.found) {
      return {
        status: 'no_python',
        message: `未检测到 Python 环境，请安装 Python 后重试。建议版本：Python ${SERVER_PYTHON_VERSION}`,
      };
    }

    // 写临时文件
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `ast_exec_${Date.now()}.py`);
    try {
      fs.writeFileSync(tmpFile, payload.code, 'utf-8');
    } catch (e) {
      return { status: 'error', message: `写入临时文件失败: ${e.message}` };
    }

    outputStopped = false;

    // spawn
    return new Promise((resolve) => {
      const proc = spawn(env.binary, ['-u', tmpFile], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });

      runningProcess = proc;

      const vw = versionMismatchWarning(env.version);

      resolve({
        status: 'started',
        pid: proc.pid,
        pythonVersion: env.version,
        pythonPath: env.binPath,
        versionWarning: vw,
      });

      proc.stdout.on('data', (data) => {
        if (outputStopped) return;
        if (senderWebContents && !senderWebContents.isDestroyed()) {
          senderWebContents.send('python:output', {
            type: 'stdout',
            text: data.toString('utf-8'),
          });
        }
      });

      proc.stderr.on('data', (data) => {
        if (outputStopped) return;
        if (senderWebContents && !senderWebContents.isDestroyed()) {
          senderWebContents.send('python:output', {
            type: 'stderr',
            text: data.toString('utf-8'),
          });
        }
      });

      proc.on('close', (code, signal) => {
        if (runningProcess === proc) runningProcess = null;
        try { fs.unlinkSync(tmpFile); } catch (e) {}

        if (outputStopped) return;

        if (senderWebContents && !senderWebContents.isDestroyed()) {
          senderWebContents.send('python:exit', {
            code,
            signal,
            message: code === 0
              ? `\n进程正常退出 (code: ${code})`
              : `\n进程退出 (code: ${code}${signal ? ', signal: ' + signal : ''})`,
          });
        }
      });

      proc.on('error', (err) => {
        if (runningProcess === proc) runningProcess = null;
        try { fs.unlinkSync(tmpFile); } catch (e) {}

        if (outputStopped) return;

        if (senderWebContents && !senderWebContents.isDestroyed()) {
          senderWebContents.send('python:exit', {
            code: -1,
            signal: null,
            message: `\n执行错误: ${err.message}`,
          });
        }
      });
    });
  });

  // 停止脚本
  ipcMain.handle('python:stop', async () => {
    console.log('[pythonRunner] stop requested, hasProcess:', !!runningProcess, 'pid:', runningProcess?.pid);
    if (runningProcess) {
      const pid = runningProcess.pid;
      forceKillRunning();
      return { status: 'ok', pid };
    }
    return { status: 'not_running' };
  });
}

/**
 * 清理（app 退出时调用）
 */
export function cleanupPythonRunner() {
  forceKillRunning();
}
