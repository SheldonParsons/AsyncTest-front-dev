/**
 * Harness Engineering — Electron local settings IPC.
 *
 * Harness API traffic now goes through the Django same-origin HTTP API from
 * the renderer. This file only keeps the small Electron userData key-value
 * store that the knowledge UI uses for local development preferences.
 */

import { app, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export function initHarnessMain() {
  const storeFile = path.join(app.getPath('userData'), 'harness-settings.json');

  function readStore() {
    try { return JSON.parse(fs.readFileSync(storeFile, 'utf-8')); }
    catch { return {}; }
  }

  function writeStore(data) {
    fs.writeFileSync(storeFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  ipcMain.handle('harness:storeGet', (_event, key) => {
    return readStore()[key] ?? null;
  });

  ipcMain.handle('harness:storeSet', (_event, key, value) => {
    const store = readStore();
    store[key] = value;
    writeStore(store);
    return true;
  });
}
