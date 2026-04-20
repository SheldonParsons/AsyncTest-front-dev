import fs from 'node:fs';
import path from 'node:path';
import { app, dialog, ipcMain, shell } from 'electron';
import { AMIND_EXT } from './constants.js';
import { buildAmindBuffer, createEmptyDoc, readAmindAsset, readAmindBuffer, readAmindFile, writeAmindFile } from './amindFileService.node.js';
import { readXmindAsAmindDoc, writeXmindFile } from './xmindFileService.node.js';
import { docToMarkdown, markdownToDoc, readMarkdownFile, writeMarkdownFile } from './markdownService.node.js';
import { docToJson, jsonToDoc, readJsonFile, writeJsonFile } from './jsonService.node.js';
import { createAmindAssetCache } from './amindAssetCache.node.js';
import { createRecentStore } from './recentStore.js';
import { createDocStore } from './docStore.node.js';
import { createMindFontService } from './fontService.node.js';
import { migrateLegacyMindStyles } from './styleMigration.node.js';

function readRichTextPlain(richText) {
  if (!richText || typeof richText !== 'object' || !Array.isArray(richText.blocks)) return '';
  return richText.blocks
    .map((block) => (Array.isArray(block?.inlines) ? block.inlines.map((inline) => inline?.text ?? '').join('') : ''))
    .join('\n')
    .trim();
}

function readLexicalPlain(node) {
  if (!node || typeof node !== 'object') return '';
  if (typeof node.text === 'string') return node.text;
  if (!Array.isArray(node.children)) return '';
  const childText = node.children.map((child) => readLexicalPlain(child)).join('');
  return node.type === 'linebreak' ? '\n' : childText;
}

function readMindNodePlainText(node) {
  if (!node || typeof node !== 'object') return '';
  const richText = readRichTextPlain(node.richText);
  if (richText) return richText;
  const lexical = readLexicalPlain(node.textLexical?.root ?? node.textLexical);
  if (lexical.trim()) return lexical.trim();
  if (typeof node.text === 'string' && node.text.trim()) return node.text.trim();
  if (node.text && typeof node.text === 'object' && typeof node.text.plain === 'string' && node.text.plain.trim()) {
    return node.text.plain.trim();
  }
  if (typeof node.textPlain === 'string' && node.textPlain.trim()) return node.textPlain.trim();
  if (typeof node.title === 'string' && node.title.trim()) return node.title.trim();
  return '';
}

function sanitizeExportBaseName(raw) {
  const cleaned = `${raw ?? ''}`
    .replace(/\s+/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .trim();
  return cleaned || '思维导图';
}

function getDocXmindDefaultPath(doc, requestedDefaultPath) {
  const requestedName = typeof requestedDefaultPath === 'string' ? requestedDefaultPath.trim() : '';
  const requestedBaseName = requestedName ? path.basename(requestedName) : '';
  if (requestedBaseName && requestedBaseName !== '思维导图.xmind') {
    return requestedName;
  }

  const activeMindId = typeof doc?.mind?.activeMindId === 'string' ? doc.mind.activeMindId : null;
  const activeMind = activeMindId ? doc?.mind?.minds?.[activeMindId] : null;
  const rootId = typeof activeMind?.roots?.[0]?.rootId === 'string' ? activeMind.roots[0].rootId : null;
  const rootNode = rootId && activeMind?.nodes ? activeMind.nodes[rootId] : null;
  const rootTitle = readMindNodePlainText(rootNode);
  const manifestTitle = typeof doc?.manifest?.title === 'string' ? doc.manifest.title.trim() : '';
  return `${sanitizeExportBaseName(rootTitle || manifestTitle)}.xmind`;
}

export function initAmindMain({ userDataPath, windowManager }) {
  const recentStore = createRecentStore({ userDataPath });
  const assetCache = createAmindAssetCache();

  const docStore = createDocStore();
  const mindFontService = createMindFontService({
    userDataPath,
    onStatusChange: (catalog) => {
      if (!windowManager) return;
      windowManager.broadcast('amind:mind-fonts-updated', catalog);
    },
  });

  // fileKey -> docId （用于：同文件单窗口）
  const fileIndex = new Map();

  function newDocId() {
    return `doc:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  }

  function addRecentForMac(filePath) {
    if (process.platform !== 'darwin') return;
    try { app.addRecentDocument(filePath); } catch { }
  }

  function notifyRecentEntriesChanged() {
    if (!windowManager) return;
    windowManager.sendTo('main', 'amind:recents-updated', {});
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

  function buildImportWindowTitle(title) {
    return title ? `AsyncTest Mind - ${title}` : 'AsyncTest Mind';
  }

  function normalizeRemoteBindingKey(remoteBinding) {
    if (!remoteBinding || typeof remoteBinding !== 'object') return null;
    const projectId = `${remoteBinding.projectId ?? ''}`.trim();
    const fileId = remoteBinding.fileId === null || remoteBinding.fileId === undefined
      ? ''
      : `${remoteBinding.fileId}`.trim();
    const filePath = `${remoteBinding.filePath ?? remoteBinding.path ?? ''}`.trim();
    if (!projectId) return null;
    if (fileId) return `project:${projectId}:file:${fileId}`;
    if (filePath) return `project:${projectId}:path:${filePath}`;
    return null;
  }

  function findDocIdByRemoteBinding(remoteBinding) {
    const targetKey = normalizeRemoteBindingKey(remoteBinding);
    if (!targetKey) return null;
    for (const [docId, entry] of docStore.entries()) {
      const entryKey = normalizeRemoteBindingKey(entry?.doc?.manifest?.remoteBinding);
      if (entryKey && entryKey === targetKey) {
        return docId;
      }
    }
    return null;
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
    const existedBefore = windowManager.has(windowKey);

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
      managedCloseAction: 'destroy',
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
    if (!existedBefore) {
      windowManager.hide('main');
    }
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
    migrateLegacyMindStyles(doc);
    await mindFontService.normalizeDocFonts(doc);

    const fkReal = normalizeFileKey(realAbs);
    const existingDocId2 = fileIndex.get(fkReal);
    if (existingDocId2) {
      const entry = docStore.mustGet(existingDocId2);
      if (entry.windowKey) windowManager.focus(entry.windowKey);
      return { reused: true, docId: existingDocId2, filePath: entry.filePath };
    }

    await recentStore.add(realAbs, {
      title: doc?.manifest?.title ?? undefined,
      updatedAt: doc?.manifest?.updatedAt ?? undefined,
    });
    addRecentForMac(realAbs);
    notifyRecentEntriesChanged();

    const docId = newDocId();
    docStore.create(docId, { doc, filePath: realAbs, windowKey: null });
    fileIndex.set(fkReal, docId);

    await openMindWindow({ docId, filePath: realAbs, title: buildMindWindowTitle(realAbs) });

    return { reused: false, docId, filePath: realAbs };
  }

  async function importXmindFileInWindow(filePath) {
    const { path: abs, doc } = await readXmindAsAmindDoc(filePath);
    migrateLegacyMindStyles(doc);
    await mindFontService.normalizeDocFonts(doc);
    console.info('[mind-style-debug:main] import xmind doc manifest', {
      sourcePath: abs,
      renderStylePreset: doc?.manifest?.renderStylePreset ?? null,
      title: doc?.manifest?.title ?? null,
    });
    const docId = newDocId();
    docStore.create(docId, { doc, filePath: null, windowKey: null });
    await openMindWindow({
      docId,
      filePath: null,
      title: buildImportWindowTitle(doc?.manifest?.title || path.basename(abs, '.xmind')),
    });
    return {
      reused: false,
      docId,
      filePath: null,
      importedFrom: abs,
    };
  }

  async function importMarkdownFileInWindow(filePath) {
    const { path: abs, content } = await readMarkdownFile(filePath);
    const doc = markdownToDoc(content, path.basename(abs));
    migrateLegacyMindStyles(doc);
    await mindFontService.normalizeDocFonts(doc);
    const docId = newDocId();
    docStore.create(docId, { doc, filePath: null, windowKey: null });
    await openMindWindow({
      docId,
      filePath: null,
      title: buildImportWindowTitle(doc?.manifest?.title || path.basename(abs, '.md')),
    });
    return {
      reused: false,
      docId,
      filePath: null,
      importedFrom: abs,
    };
  }

  async function importJsonFileInWindow(filePath) {
    const { path: abs, content } = await readJsonFile(filePath);
    const doc = jsonToDoc(content, path.basename(abs));
    migrateLegacyMindStyles(doc);
    await mindFontService.normalizeDocFonts(doc);
    const docId = newDocId();
    docStore.create(docId, { doc, filePath: null, windowKey: null });
    await openMindWindow({
      docId,
      filePath: null,
      title: buildImportWindowTitle(doc?.manifest?.title || path.basename(abs, '.json')),
    });
    return {
      reused: false,
      docId,
      filePath: null,
      importedFrom: abs,
    };
  }

  // ===== IPC =====

  ipcMain.handle('amind:new', async (event, payload = {}) => {
    const docId = newDocId();
    const doc = createEmptyDoc(undefined, payload);
    console.info('[mind-style-debug:main] create new doc manifest', {
      renderStylePreset: doc?.manifest?.renderStylePreset ?? null,
      title: doc?.manifest?.title ?? null,
      payload,
    });
    docStore.create(docId, { doc, filePath: null, windowKey: null });
    return { docId, filePath: null };
  });

  ipcMain.handle('amind:newAndOpenWindow', async (event, payload = {}) => {
    const docId = newDocId();
    const doc = createEmptyDoc(undefined, payload);
    console.info('[mind-style-debug:main] create new window doc manifest', {
      renderStylePreset: doc?.manifest?.renderStylePreset ?? null,
      title: doc?.manifest?.title ?? null,
      payload,
    });
    docStore.create(docId, { doc, filePath: null, windowKey: null });

    await openMindWindow({ docId, filePath: null, title: 'AsyncTest Mind' });
    return { docId, filePath: null };
  });

  ipcMain.handle('amind:openFileInWindow', async (event, { filePath }) => {
    return await openFileInWindow(filePath);
  });

  ipcMain.handle('amind:openRemoteBufferInWindow', async (event, { bytes, fileName, remoteBinding } = {}) => {
    const existingDocId = findDocIdByRemoteBinding(remoteBinding);
    if (existingDocId) {
      const entry = docStore.mustGet(existingDocId);
      if (entry.windowKey) windowManager.focus(entry.windowKey);
      return {
        reused: true,
        docId: existingDocId,
        filePath: entry.filePath,
      };
    }

    const fileBuffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
    const sourcePath = fileName || `remote${AMIND_EXT}`;
    const { doc } = await readAmindBuffer(fileBuffer, sourcePath);
    migrateLegacyMindStyles(doc);
    await mindFontService.normalizeDocFonts(doc);
    doc.manifest = doc.manifest || {};
    if (remoteBinding && typeof remoteBinding === 'object') {
      doc.manifest.remoteBinding = { ...remoteBinding };
    }

    const docId = newDocId();
    docStore.create(docId, { doc, filePath: null, windowKey: null });
    await openMindWindow({
      docId,
      filePath: null,
      title: buildImportWindowTitle(doc?.manifest?.title || path.basename(sourcePath, AMIND_EXT)),
    });
    return {
      reused: false,
      docId,
      filePath: null,
    };
  });

  ipcMain.handle('amind:openFolder', async (event, { filePath }) => {
    if (!filePath) return { ok: false, error: '当前文件尚未保存，无法打开文件目录' };
    const absPath = path.resolve(filePath);
    const dirPath = path.dirname(absPath);
    if (!fs.existsSync(dirPath)) return { ok: false, error: '当前文件目录不存在' };
    if (!fs.existsSync(absPath)) return { ok: false, error: '当前文件不存在' };
    shell.showItemInFolder(absPath);
    return { ok: true, dirPath, filePath: absPath };
  });

  ipcMain.handle('amind:fileExists', async (event, { filePath }) => {
    if (!filePath) return { ok: false, exists: false, error: '缺少文件路径' };
    const absPath = path.resolve(filePath);
    return {
      ok: true,
      exists: fs.existsSync(absPath),
      filePath: absPath,
    };
  });

  ipcMain.handle('amind:docGet', async (event, { docId }) => {
    const { doc, filePath } = docStore.mustGet(docId);
    return { docId, filePath, doc };
  });

  ipcMain.handle('amind:docUpdate', async (event, { docId, doc }) => {
    const entry = docStore.setDoc(docId, doc);
    return { docId, filePath: entry.filePath };
  });

  ipcMain.handle('amind:prepareMindFonts', async () => {
    return await mindFontService.prepareFonts();
  });

  ipcMain.handle('amind:retryMindFontDownload', async (event, payload = {}) => {
    return await mindFontService.retryFontDownload(payload);
  });

  ipcMain.handle('amind:readMindFontFace', async (event, payload = {}) => {
    return await mindFontService.readFontFace(payload);
  });

  ipcMain.handle('amind:recents', async () => recentStore.load());

  ipcMain.handle('amind:recentEntries', async () => recentStore.loadRendererEntries());

  ipcMain.handle('amind:removeRecent', async (event, { filePath }) => {
    if (!filePath) return recentStore.load();
    const next = await recentStore.remove(filePath);
    notifyRecentEntriesChanged();
    return next;
  });

  ipcMain.handle('amind:openDialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Mind Files', extensions: [AMIND_EXT.slice(1), 'xmind', 'md', 'json'] },
        { name: 'AsyncTest Mind', extensions: [AMIND_EXT.slice(1)] },
        { name: 'XMind', extensions: ['xmind'] },
        { name: 'Markdown', extensions: ['md'] },
        { name: 'JSON', extensions: ['json'] },
      ],
    });
    if (canceled || !filePaths?.[0]) return null;
    const selectedPath = filePaths[0];
    if (selectedPath.toLowerCase().endsWith('.xmind')) {
      return await importXmindFileInWindow(selectedPath);
    }
    if (selectedPath.toLowerCase().endsWith('.md')) {
      return await importMarkdownFileInWindow(selectedPath);
    }
    if (selectedPath.toLowerCase().endsWith('.json')) {
      return await importJsonFileInWindow(selectedPath);
    }
    return await openFileInWindow(selectedPath);
  });

  ipcMain.handle('amind:exportXmindDialog', async (event, { docId, defaultPath, thumbnailBytes }) => {
    const entry = docStore.mustGet(docId);
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: getDocXmindDefaultPath(entry.doc, defaultPath),
      filters: [{ name: 'XMind', extensions: ['xmind'] }],
    });
    if (canceled || !filePath) return null;
    const thumbnail = thumbnailBytes ? Buffer.from(thumbnailBytes) : null;
    const result = await writeXmindFile(filePath, entry.doc, thumbnail);
    return {
      docId,
      filePath: result.path,
    };
  });

  ipcMain.handle('amind:exportXmindDocDialog', async (event, { doc, defaultPath, thumbnailBytes }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: getDocXmindDefaultPath(doc, defaultPath),
      filters: [{ name: 'XMind', extensions: ['xmind'] }],
    });
    if (canceled || !filePath) return null;
    const thumbnail = thumbnailBytes ? Buffer.from(thumbnailBytes) : null;
    const result = await writeXmindFile(filePath, doc, thumbnail);
    return {
      filePath: result.path,
    };
  });

  ipcMain.handle('amind:exportAmindDialog', async (event, { doc, defaultPath }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultPath || `思维导图${AMIND_EXT}`,
      filters: [{ name: 'AsyncTest Mind', extensions: [AMIND_EXT.slice(1)] }],
    });
    if (canceled || !filePath) return null;
    const result = await writeAmindFile(filePath, doc);
    return {
      filePath: result.path,
    };
  });

  ipcMain.handle('amind:exportMarkdownDialog', async (event, { docId, defaultPath }) => {
    const entry = docStore.mustGet(docId);
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultPath || '思维导图.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (canceled || !filePath) return null;
    const mdContent = docToMarkdown(entry.doc);
    const result = await writeMarkdownFile(filePath, mdContent);
    return { docId, filePath: result.path };
  });

  ipcMain.handle('amind:exportJsonDialog', async (event, { docId, defaultPath }) => {
    const entry = docStore.mustGet(docId);
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultPath || '思维导图.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return null;
    const jsonContent = docToJson(entry.doc);
    const result = await writeJsonFile(filePath, jsonContent);
    return { docId, filePath: result.path };
  });

  ipcMain.handle('amind:buildUploadPayload', async (event, { docId, fallbackFileName } = {}) => {
    const entry = docStore.mustGet(docId);
    const fileKey = getFileKey({ docId, filePath: entry.filePath });
    const dirtyAssets = assetCache.listDirty(fileKey);
    const buildResult = await buildAmindBuffer(entry.filePath || fallbackFileName || `思维导图${AMIND_EXT}`, entry.doc, {
      assetsToWrite: dirtyAssets.map(a => ({ assetId: a.assetId, ext: a.ext, bytes: a.bytes })),
    });
    return {
      docId,
      fileName: path.basename(buildResult.path),
      bytes: Uint8Array.from(buildResult.buffer),
      savedAt: buildResult.doc?.manifest?.updatedAt ?? null,
      title: buildResult.doc?.manifest?.title ?? null,
    };
  });

  ipcMain.handle('amind:save', async (event, { docId, doc }) => {
    const entry = docStore.mustGet(docId);
    if (!entry.filePath) return { needSaveAs: true };
    const docToSave = doc && typeof doc === 'object' ? doc : entry.doc;

    const fileKey = getFileKey({ docId, filePath: entry.filePath });
    const dirtyAssets = assetCache.listDirty(fileKey);

    const { path: abs, doc: saved } = await writeAmindFile(entry.filePath, docToSave, {
      assetsToWrite: dirtyAssets.map(a => ({ assetId: a.assetId, ext: a.ext, bytes: a.bytes })),
    });

    assetCache.markClean(fileKey, dirtyAssets.map(a => ({ assetId: a.assetId, ext: a.ext })));

    docStore.setFilePath(docId, abs);
    docStore.setDoc(docId, saved);
    refreshWindowTitle(docId);

    await recentStore.add(abs, {
      title: saved?.manifest?.title ?? undefined,
      updatedAt: saved?.manifest?.updatedAt ?? undefined,
    });
    addRecentForMac(abs);
    notifyRecentEntriesChanged();

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
  ipcMain.handle('amind:saveAsDialog', async (event, { docId, defaultPath, doc }) => {
    const entry = docStore.mustGet(docId);
    const docToSave = doc && typeof doc === 'object' ? doc : entry.doc;

    const oldFilePath = entry.filePath; // 可能为 null
    const oldFk = oldFilePath ? normalizeFileKey(oldFilePath) : null;

    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultPath || `Untitled${AMIND_EXT}`,
      filters: [{ name: 'AsyncTest Mind', extensions: [AMIND_EXT.slice(1)] }],
    });
    if (canceled || !filePath) return null;

    const fileKeyOldForAssets = getFileKey({ docId, filePath: oldFilePath });
    const dirtyAssets = assetCache.listDirty(fileKeyOldForAssets);

    const { path: abs, doc: saved } = await writeAmindFile(filePath, docToSave, {
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

    await recentStore.add(abs, {
      title: saved?.manifest?.title ?? undefined,
      updatedAt: saved?.manifest?.updatedAt ?? undefined,
    });
    addRecentForMac(abs);
    notifyRecentEntriesChanged();

    return {
      docId,
      filePath: abs,
      savedAt: saved?.manifest?.updatedAt ?? null,
      title: saved?.manifest?.title ?? null,
    };
  });

  ipcMain.handle('amind:saveRecentPreview', async (event, { filePath, bytes, title, updatedAt }) => {
    if (!filePath) throw new Error('saveRecentPreview requires filePath');
    const previewBytes =
      bytes instanceof Uint8Array
        ? bytes
        : Array.isArray(bytes)
          ? Uint8Array.from(bytes)
          : new Uint8Array(bytes ?? []);
    console.info('[mind-preview-debug:main] saveRecentPreview invoked', {
      filePath,
      byteLength: previewBytes.length,
      title: typeof title === 'string' && title ? title : null,
      updatedAt: typeof updatedAt === 'string' && updatedAt ? updatedAt : null,
    });
    const entry = await recentStore.savePreview(filePath, previewBytes, {
      title: typeof title === 'string' && title ? title : undefined,
      updatedAt: typeof updatedAt === 'string' && updatedAt ? updatedAt : undefined,
    });
    console.info('[mind-preview-debug:main] saveRecentPreview stored', {
      filePath,
      previewPath: entry?.previewPath ?? null,
      previewUpdatedAt: entry?.previewUpdatedAt ?? null,
      updatedAt: entry?.updatedAt ?? null,
      title: entry?.title ?? null,
    });
    notifyRecentEntriesChanged();
    return entry;
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
    importXmindFileInWindow,
    importMarkdownFileInWindow,
  };
}
