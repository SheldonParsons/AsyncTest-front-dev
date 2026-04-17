import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app, dialog, ipcMain } from 'electron';
import { dumpGeneratorCacheSnapshot, prepareGeneratorCacheWorkspace } from './cacheDump.node.js';
import { buildDefaultReportZipName, exportEnvironmentReportPackage } from './docxExport.node.js';
import { getLatestZendaoRunResult, runZendaoCollection } from './zendaoRun.node.js';

const GENERATOR_RECENT_EXPORT_LIMIT = 10;

function getGeneratorDataDir() {
  return path.join(app.getPath('userData'), 'generator');
}

function getRecentExportsDir() {
  return path.join(getGeneratorDataDir(), 'recent-exports');
}

function getRecentExportsJsonPath() {
  return path.join(getGeneratorDataDir(), 'recent-exports.json');
}

async function ensureGeneratorDataDir() {
  await fs.mkdir(getRecentExportsDir(), { recursive: true });
}

async function readRecentExports() {
  await ensureGeneratorDataDir();
  try {
    const raw = await fs.readFile(getRecentExportsJsonPath(), 'utf8');
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeRecentExports(records) {
  await ensureGeneratorDataDir();
  await fs.writeFile(getRecentExportsJsonPath(), JSON.stringify(records, null, 2), 'utf8');
}

async function normalizeRecentExports(records) {
  const validRecords = [];
  for (const record of Array.isArray(records) ? records : []) {
    if (!record?.id || !record?.cachedFilePath) continue;
    try {
      const stat = await fs.stat(record.cachedFilePath);
      validRecords.push({
        ...record,
        size: stat.size,
      });
    } catch {
      continue;
    }
  }
  return validRecords
    .sort((left, right) => `${right.createdAt || ''}`.localeCompare(`${left.createdAt || ''}`))
    .slice(0, GENERATOR_RECENT_EXPORT_LIMIT);
}

function toRecentExportPayload(record) {
  return {
    id: record.id,
    fileName: record.fileName,
    title: record.title,
    createdAt: record.createdAt,
    size: record.size || 0,
    envNames: Array.isArray(record.envNames) ? record.envNames : [],
  };
}

async function persistRecentExport(workspace, packageResult) {
  await ensureGeneratorDataDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = packageResult.zipFileName || buildDefaultReportZipName(workspace.snapshot);
  const cachedFilePath = path.join(getRecentExportsDir(), `${id}-${fileName}`);
  await fs.copyFile(packageResult.zipFilePath, cachedFilePath);

  const currentRecord = {
    id,
    fileName,
    title: workspace.snapshot?.title || fileName,
    createdAt: new Date().toISOString(),
    envNames: (packageResult.docxFiles || []).map((item) => item?.envName || '').filter(Boolean),
    cachedFilePath,
  };

  const previousRecords = await readRecentExports();
  const normalizedPrevious = await normalizeRecentExports(previousRecords);
  const nextRecords = await normalizeRecentExports([currentRecord, ...normalizedPrevious]);
  const keepIdSet = new Set(nextRecords.map((item) => item.id));

  for (const record of normalizedPrevious) {
    if (!keepIdSet.has(record.id)) {
      await fs.rm(record.cachedFilePath, { force: true });
    }
  }

  await writeRecentExports(nextRecords);
  return {
    currentRecord: toRecentExportPayload(nextRecords[0]),
    recentExports: nextRecords.map(toRecentExportPayload),
  };
}

export function initGeneratorMain() {
  ipcMain.handle('generator:runZendao', async (event, payload = {}) => {
    return await runZendaoCollection(payload, ({ level, title, detail, mergeKey }) => {
      event.sender.send('generator:zendao-run-log', {
        level,
        title,
        detail,
        mergeKey,
      });
    });
  });

  ipcMain.handle('generator:getLatestZendaoRun', async () => {
    return getLatestZendaoRunResult();
  });

  ipcMain.handle('generator:dumpCacheSnapshot', async (_event, payload = {}) => {
    return await dumpGeneratorCacheSnapshot(payload);
  });

  ipcMain.handle('generator:getRecentExports', async () => {
    const records = await normalizeRecentExports(await readRecentExports());
    await writeRecentExports(records);
    return {
      recentExports: records.map(toRecentExportPayload),
    };
  });

  ipcMain.handle('generator:saveRecentExport', async (_event, payload = {}) => {
    const records = await normalizeRecentExports(await readRecentExports());
    const targetRecord = records.find((item) => item.id === payload?.id);
    if (!targetRecord) {
      throw new Error('未找到可保存的导出记录');
    }

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '选择保存目录',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (canceled || !filePaths?.[0]) {
      return {
        canceled: true,
        filePath: '',
        recentExports: records.map(toRecentExportPayload),
      };
    }

    const destinationPath = path.join(filePaths[0], targetRecord.fileName);
    await fs.copyFile(targetRecord.cachedFilePath, destinationPath);
    return {
      canceled: false,
      filePath: destinationPath,
      recentExports: records.map(toRecentExportPayload),
    };
  });

  ipcMain.handle('generator:exportDocxPackage', async (_event, payload = {}) => {
    console.log('[DOCX-DEBUG][ipc] auth received:', JSON.stringify(payload?.auth));
    console.log('[DOCX-DEBUG][ipc] payload keys:', Object.keys(payload || {}));
    const workspace = await prepareGeneratorCacheWorkspace({ payload: payload?.payload, targetPath: payload?.targetPath, auth: payload?.auth });
    const packageResult = await exportEnvironmentReportPackage({
      tempDir: workspace.tempDir,
      payload: workspace.snapshot,
    });
    const recentExportResult = await persistRecentExport(workspace, packageResult);

    return {
      canceled: false,
      filePath: '',
      docxFiles: packageResult.docxFiles,
      recentExport: recentExportResult.currentRecord,
      recentExports: recentExportResult.recentExports,
    };
  });

  return {
    getLatestZendaoRunResult,
  };
}
