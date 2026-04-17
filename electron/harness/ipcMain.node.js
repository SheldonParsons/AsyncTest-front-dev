/**
 * Harness Engineering — Electron main-process IPC handlers.
 *
 * Calls the local HarnessEngineering backend (default http://localhost:7777)
 * and streams the SSE response back to the renderer via IPC events.
 *
 * SSE format:
 *   data: {"delta": "文本片段"}
 *   data: [DONE]
 */

import { ipcMain } from 'electron';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const HARNESS_BASE = 'http://localhost:7777';

/**
 * Stream POST: sends request, parses SSE `data: {"delta":"..."}` events,
 * and forwards each delta to webContents via IPC.
 */
function postStream(url, payload, webContents, requestId) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      if (res.statusCode >= 400) {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          webContents.send('harness:chat-stream', {
            requestId,
            type: 'error',
            error: `HTTP ${res.statusCode}: ${raw.slice(0, 200)}`,
          });
          resolve({ status: res.statusCode });
        });
        return;
      }

      let buffer = '';
      let doneSent = false;

      res.on('data', (chunk) => {
        if (webContents.isDestroyed()) return;
        buffer += chunk.toString('utf-8');

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            if (!doneSent) {
              doneSent = true;
              webContents.send('harness:chat-stream', { requestId, type: 'done' });
            }
          } else {
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.delta ?? '';
              if (delta) {
                webContents.send('harness:chat-stream', {
                  requestId,
                  type: 'chunk',
                  content: delta,
                });
              }
            } catch {
              // Non-JSON line — send raw
              webContents.send('harness:chat-stream', {
                requestId,
                type: 'chunk',
                content: data,
              });
            }
          }
        }
      });

      res.on('end', () => {
        if (!doneSent && !webContents.isDestroyed()) {
          webContents.send('harness:chat-stream', { requestId, type: 'done' });
        }
        resolve({ status: res.statusCode });
      });
    });

    req.on('error', (err) => {
      if (!webContents.isDestroyed()) {
        webContents.send('harness:chat-stream', {
          requestId,
          type: 'error',
          error: err.message || 'Network error',
        });
      }
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

export function initHarnessMain() {
  // Streaming chat — returns requestId immediately, sends chunks via IPC events
  ipcMain.handle('harness:chatStream', async (event, payload) => {
    const requestId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const webContents = event.sender;

    postStream(
      `${HARNESS_BASE}/chat`,
      { message: payload.message, model: payload.model },
      webContents,
      requestId,
    ).catch((err) => {
      if (!webContents.isDestroyed()) {
        webContents.send('harness:chat-stream', {
          requestId,
          type: 'error',
          error: err.message || 'Stream failed',
        });
      }
    });

    return { requestId };
  });

  // Generic HTTP proxy — forwards any request to HarnessEngineering backend
  ipcMain.handle('harness:request', async (_event, { method, path, body }) => {
    return new Promise((resolve) => {
      const url = new URL(`${HARNESS_BASE}${path}`);
      const payload = body != null ? JSON.stringify(body) : null;
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method || 'GET',
        headers: {
          'Accept': 'application/json',
          ...(payload ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          } : {}),
        },
      };

      const req = http.request(options, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode, data });
          } catch {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ status: 0, data: null, error: err.message || 'Network error' });
      });

      if (payload) req.write(payload);
      req.end();
    });
  });

  // ─── Persistent key-value store in userData ───
  const storeFile = path.join(app.getPath('userData'), 'harness-settings.json');

  function readStore() {
    try {
      return JSON.parse(fs.readFileSync(storeFile, 'utf-8'));
    } catch {
      return {};
    }
  }

  function writeStore(data) {
    fs.writeFileSync(storeFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  ipcMain.handle('harness:storeGet', (_event, key) => {
    const store = readStore();
    return store[key] ?? null;
  });

  ipcMain.handle('harness:storeSet', (_event, key, value) => {
    const store = readStore();
    store[key] = value;
    writeStore(store);
    return true;
  });
}
