import fs from 'node:fs';
import path from 'node:path';
import { app, dialog, ipcMain } from 'electron';
import { AMIND_EXT } from './constants.js';
import { createEmptyDoc, readAmindAsset, readAmindFile, writeAmindFile } from './amindFileService.node.js';
import { createAmindAssetCache } from './amindAssetCache.node.js';
import { createRecentStore } from './recentStore.js';
import { createDocStore } from './docStore.node.js';

export function initAmindMain({ userDataPath, windowManager }) {
  const recentStore = createRecentStore({ userDataPath });
  const assetCache = createAmindAssetCache();

  const docStore = createDocStore();

  // fileKey -> docId （用于：同文件单窗口）
  const fileIndex = new Map();

  function newDocId() {
    return `doc:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  }

  function addRecentForMac(filePath) {
    if (process.platform !== 'darwin') return;
    try { app.addRecentDocument(filePath); } catch { }
  }

  function normalizeFileKey(filePath) {
    const abs = path.resolve(filePath);
    let real = abs;
    try {
      real = fs.realpathSync.native(abs);
    } catch {
      // ignore
    }
    if (process.platform === 'win32' || process.platform === 'darwin') {
      real = real.toLowerCase();
    }
    return real;
  }

  function getFileKey({ docId, filePath }) {
    return filePath || docId;
  }

  function buildMindWindowTitle(filePath) {
    return filePath ? `AsyncTest Mind - ${path.basename(filePath)}` : 'AsyncTest Mind';
  }

  function refreshWindowTitle(docId) {
    if (!windowManager) return;
    const entry = docStore.get(docId);
    if (!entry?.windowKey) return;
    const win = windowManager.get(entry.windowKey);
    if (!win) return;
    win.setTitle(buildMindWindowTitle(entry.filePath));
  }

  async function openMindWindow({ docId, filePath, title }) {
    if (!windowManager) throw new Error('initAmindMain requires windowManager');

    const windowKey = `mind:${docId}`;

    const win = await windowManager.createOrFocus(windowKey, {
      key: windowKey,
      title: title || 'AsyncTest Mind',
      route: '/mind',
      width: 1600,
      height: 820,
      x: 100,
      y: 120,
      modal: false,
      alwaysOnTop: false,
      trafficLightPosition: { x: 16, y: 20 },
      nativeHeaderless: true,
      openDevTools: true,
      closeBehavior: 'platform',
      query: { windowKey, docId, filePath: filePath || null },

      onClosed: () => {
        const entry = docStore.get(docId);
        if (!entry) return;

        if (entry.filePath) {
          const fk = normalizeFileKey(entry.filePath);
          if (fileIndex.get(fk) === docId) fileIndex.delete(fk);
        }

        docStore.remove(docId);
      },

      beforeClose: async () => {
        if (typeof windowManager.requestCloseFromRenderer === 'function') {
          return await windowManager.requestCloseFromRenderer(windowKey);
        }
        return true;
      },
    });

    docStore.setWindowKey(docId, windowKey);

    win.show();
    win.focus();
    return { windowKey };
  }

  async function openFileInWindow(filePath) {
    const absInput = path.resolve(filePath);

    const fkInput = normalizeFileKey(absInput);
    const existingDocId = fileIndex.get(fkInput);
    if (existingDocId) {
      const entry = docStore.mustGet(existingDocId);
      if (entry.windowKey) windowManager.focus(entry.windowKey);
      return { reused: true, docId: existingDocId, filePath: entry.filePath };
    }

    const { path: realAbs, doc } = await readAmindFile(absInput);

    const fkReal = normalizeFileKey(realAbs);
    const existingDocId2 = fileIndex.get(fkReal);
    if (existingDocId2) {
      const entry = docStore.mustGet(existingDocId2);
      if (entry.windowKey) windowManager.focus(entry.windowKey);
      return { reused: true, docId: existingDocId2, filePath: entry.filePath };
    }

    await recentStore.add(realAbs);
    addRecentForMac(realAbs);

    const docId = newDocId();
    docStore.create(docId, { doc, filePath: realAbs, windowKey: null });
    fileIndex.set(fkReal, docId);

    await openMindWindow({ docId, filePath: realAbs, title: buildMindWindowTitle(realAbs) });

    return { reused: false, docId, filePath: realAbs };
  }

  // ===== IPC =====

  ipcMain.handle('amind:new', async () => {
    const docId = newDocId();
    const doc = createEmptyDoc();
    docStore.create(docId, { doc, filePath: null, windowKey: null });
    return { docId, filePath: null };
  });

  ipcMain.handle('amind:newAndOpenWindow', async () => {
    const docId = newDocId();
    const doc = createEmptyDoc();
    docStore.create(docId, { doc, filePath: null, windowKey: null });

    await openMindWindow({ docId, filePath: null, title: 'AsyncTest Mind' });
    return { docId, filePath: null };
  });

  ipcMain.handle('amind:openFileInWindow', async (event, { filePath }) => {
    return await openFileInWindow(filePath);
  });

  ipcMain.handle('amind:docGet', async (event, { docId }) => {
    const { doc, filePath } = docStore.mustGet(docId);
    return { docId, filePath, doc };
  });

  ipcMain.handle('amind:docUpdate', async (event, { docId, doc }) => {
    const entry = docStore.setDoc(docId, doc);
    return { docId, filePath: entry.filePath };
  });

  ipcMain.handle('amind:recents', async () => recentStore.load());

  ipcMain.handle('amind:openDialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'AsyncTest Mind', extensions: [AMIND_EXT.slice(1)] }],
    });
    if (canceled || !filePaths?.[0]) return null;

    return await openFileInWindow(filePaths[0]);
  });

  ipcMain.handle('amind:save', async (event, { docId }) => {
    const entry = docStore.mustGet(docId);
    if (!entry.filePath) return { needSaveAs: true };

    const fileKey = getFileKey({ docId, filePath: entry.filePath });
    const dirtyAssets = assetCache.listDirty(fileKey);

    const { path: abs, doc: saved } = await writeAmindFile(entry.filePath, entry.doc, {
      assetsToWrite: dirtyAssets.map(a => ({ assetId: a.assetId, ext: a.ext, bytes: a.bytes })),
    });

    assetCache.markClean(fileKey, dirtyAssets.map(a => ({ assetId: a.assetId, ext: a.ext })));

    docStore.setFilePath(docId, abs);
    docStore.setDoc(docId, saved);
    refreshWindowTitle(docId);

    await recentStore.add(abs);
    addRecentForMac(abs);

    return {
      needSaveAs: false,
      docId,
      filePath: abs,
      savedAt: saved?.manifest?.updatedAt ?? null,
      title: saved?.manifest?.title ?? null,
    };
  });

  /**
   * 你提的点：saveAsDialog 需要把 filePath “传给 windows”
   * 正确做法：
   * - 更新 docStore.filePath
   * - 更新 fileIndex（解绑旧路径，绑定新路径）
   * - 通知 renderer（可选，但建议）
   */
  ipcMain.handle('amind:saveAsDialog', async (event, { docId, defaultPath }) => {
    const entry = docStore.mustGet(docId);

    const oldFilePath = entry.filePath; // 可能为 null
    const oldFk = oldFilePath ? normalizeFileKey(oldFilePath) : null;

    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultPath || `Untitled${AMIND_EXT}`,
      filters: [{ name: 'AsyncTest Mind', extensions: [AMIND_EXT.slice(1)] }],
    });
    if (canceled || !filePath) return null;

    const fileKeyOldForAssets = getFileKey({ docId, filePath: oldFilePath });
    const dirtyAssets = assetCache.listDirty(fileKeyOldForAssets);

    const { path: abs, doc: saved } = await writeAmindFile(filePath, entry.doc, {
      assetsToWrite: dirtyAssets.map(a => ({ assetId: a.assetId, ext: a.ext, bytes: a.bytes })),
    });

    // 迁移 assetCache：docId/old -> new abs
    for (const a of dirtyAssets) {
      assetCache.putBytes({
        fileKey: abs,
        assetId: a.assetId,
        ext: a.ext,
        mime: a.mime,
        bytes: a.bytes,
        dirty: false,
      });
    }
    assetCache.markClean(fileKeyOldForAssets, dirtyAssets.map(a => ({ assetId: a.assetId, ext: a.ext })));

    // 更新 docStore
    docStore.setFilePath(docId, abs);
    docStore.setDoc(docId, saved);
    refreshWindowTitle(docId);

    // 更新 fileIndex：解绑旧，绑定新
    if (oldFk && fileIndex.get(oldFk) === docId) fileIndex.delete(oldFk);
    const newFk = normalizeFileKey(abs);
    fileIndex.set(newFk, docId);

    await recentStore.add(abs);
    addRecentForMac(abs);

    return {
      docId,
      filePath: abs,
      savedAt: saved?.manifest?.updatedAt ?? null,
      title: saved?.manifest?.title ?? null,
    };
  });

  // assets（保持不变）
  ipcMain.handle('amind:assetAddFromFile', async (event, { docId, sourceImagePath }) => {
    const entry = docStore.mustGet(docId);
    const fileKey = getFileKey({ docId, filePath: entry.filePath });
    return await assetCache.addFromFile({ fileKey, sourceImagePath });
  });

  ipcMain.handle('amind:assetAddFromBytes', async (event, { docId, bytes, mime }) => {
    const entry = docStore.mustGet(docId);
    const fileKey = getFileKey({ docId, filePath: entry.filePath });
    return await assetCache.addFromBytes({ fileKey, bytes, mime });
  });

  ipcMain.handle('amind:assetGetBytes', async (event, { docId, assetId, ext }) => {
    const entry = docStore.mustGet(docId);
    const fileKey = getFileKey({ docId, filePath: entry.filePath });

    const cached = assetCache.getBytes({ fileKey, assetId, ext });
    if (cached?.bytes) return { assetId, ext, bytes: cached.bytes, mime: cached.mime };

    if (!entry.filePath) throw new Error('assetGetBytes: file not saved yet and cache miss');

    const bytes = await readAmindAsset(entry.filePath, { assetId, ext });
    assetCache.putBytes({ fileKey, assetId, ext, mime: 'application/octet-stream', bytes, dirty: false });
    return { assetId, ext, bytes, mime: 'application/octet-stream' };
  });

  return {
    recentStore,
    assetCache,
    docStore,
    fileIndex,
    openFileInWindow,
  };
}
