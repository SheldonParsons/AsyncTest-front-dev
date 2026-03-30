import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = process.platform === 'win32' ? 'C:\\ast' : path.join(process.cwd(), 'ast');
const LOG_FILE_PATH = path.join(LOG_DIR, 'mind-close-debug.log');

let initAttempted = false;
let initSucceeded = false;
let writeFailureLogged = false;

function ensureLogFileReady() {
  if (initAttempted) return initSucceeded;
  initAttempted = true;
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE_PATH, '', 'utf8');
    initSucceeded = true;
  } catch (error) {
    initSucceeded = false;
    if (!writeFailureLogged) {
      writeFailureLogged = true;
      console.error('[mind-close-debug] init failed', error);
    }
  }
  return initSucceeded;
}

function normalizeValue(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (value instanceof Set) return Array.from(value);
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
}

function safeStringify(payload) {
  const seen = new WeakSet();
  return JSON.stringify(payload, (_key, value) => {
    const normalized = normalizeValue(value);
    if (normalized && typeof normalized === 'object') {
      if (seen.has(normalized)) return '[Circular]';
      seen.add(normalized);
    }
    return normalized;
  });
}

export function getCloseDebugLogPath() {
  return LOG_FILE_PATH;
}

export function logCloseDebug(scope, label, payload = {}) {
  if (!ensureLogFileReady()) return;
  const line = `${new Date().toISOString()} [${scope}] ${label} ${safeStringify(payload)}\n`;
  try {
    fs.appendFileSync(LOG_FILE_PATH, line, 'utf8');
  } catch (error) {
    if (!writeFailureLogged) {
      writeFailureLogged = true;
      console.error('[mind-close-debug] write failed', error);
    }
  }
}
