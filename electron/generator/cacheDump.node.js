import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { readAmindFile } from '../amind/amindFileService.node.js';
import { writeXmindFile } from '../amind/xmindFileService.node.js';
import { persistZendaoArtifacts } from './zendaoRun.node.js';

const GENERATOR_TEMP_ROOT = path.join(os.tmpdir(), 'asynctest-generator-cache');

function sanitizeFileNamePart(value) {
  return `${value ?? ''}`.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'file';
}

async function buildUniquePath(dirPath, fileName) {
  const parsed = path.parse(fileName);
  let attempt = 0;
  while (true) {
    const suffix = attempt === 0 ? '' : `_${attempt + 1}`;
    const candidate = path.join(dirPath, `${parsed.name}${suffix}${parsed.ext}`);
    try {
      await fs.access(candidate);
      attempt += 1;
    } catch {
      return candidate;
    }
  }
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function resetTempRoot() {
  await fs.rm(GENERATOR_TEMP_ROOT, { recursive: true, force: true });
  await ensureDirectory(GENERATOR_TEMP_ROOT);
}

async function downloadFileToPath(url, targetPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载文件失败：${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(targetPath, buffer);
  return {
    path: targetPath,
    size: buffer.length,
  };
}

async function persistSourceFileList(files, tempDir, subDirName) {
  const targetDir = path.join(tempDir, subDirName);
  await ensureDirectory(targetDir);

  const persisted = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const ext = path.extname(file?.name || '') || '';
    const baseName = sanitizeFileNamePart(path.basename(file?.name || `file-${index + 1}`, ext));
    const targetPath = path.join(targetDir, `${String(index + 1).padStart(2, '0')}_${baseName}${ext}`);
    const downloadResult = await downloadFileToPath(file.downloadUrl, targetPath);
    persisted.push({
      ...file,
      tempPath: downloadResult.path,
      tempSize: downloadResult.size,
    });
  }

  return persisted;
}

async function persistAmindFileList(files, tempDir) {
  const targetDir = path.join(tempDir, 'amind');
  await ensureDirectory(targetDir);

  const persisted = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const originalBaseName = sanitizeFileNamePart(path.basename(file?.name || `amind-${index + 1}`, '.amind'));
    const originalTempPath = await buildUniquePath(targetDir, `${originalBaseName}.amind`);
    const originalDownload = await downloadFileToPath(file.downloadUrl, originalTempPath);

    const { doc } = await readAmindFile(originalTempPath);
    const xmindTempPath = await buildUniquePath(targetDir, `${originalBaseName}.xmind`);
    const xmindResult = await writeXmindFile(xmindTempPath, doc, null);

    persisted.push({
      ...file,
      originalTempPath,
      originalTempSize: originalDownload.size,
      xmindTempPath: xmindResult.path,
      exportTempPath: file.docxFileType === 'amind' ? originalTempPath : xmindResult.path,
    });
  }

  return persisted;
}

async function persistZendaoCache(zendaoPayload, tempDir) {
  if (!zendaoPayload) {
    return null;
  }

  const targetDir = path.join(tempDir, 'zendao');
  return persistZendaoArtifacts(zendaoPayload, targetDir);
}

export async function prepareGeneratorCacheWorkspace({ targetPath, payload }) {
  await resetTempRoot();

  const tempDir = path.join(GENERATOR_TEMP_ROOT, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const snapshotPath = targetPath || path.join(tempDir, 'file.md');

  await ensureDirectory(tempDir);
  await ensureDirectory(path.dirname(snapshotPath));

  const persistedAmindFiles = await persistAmindFileList(payload?.amindFiles || [], tempDir);
  const persistedExcelFiles = payload?.excelFile ? await persistSourceFileList([payload.excelFile], tempDir, 'excel') : [];
  const persistedZendao = await persistZendaoCache(payload?.zendao, tempDir);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    tempDir,
    tempCleanupPolicy: '每次重新导出缓存前会清空旧的 generator 临时目录；当前这次导出的临时目录会保留到下一次导出或系统清理 temp 目录为止。',
    ...payload,
    amindFiles: persistedAmindFiles,
    excelFile: persistedExcelFiles[0] || null,
    zendao: persistedZendao,
  };

  await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');

  return {
    snapshot,
    filePath: snapshotPath,
    tempDir,
    amindFileCount: persistedAmindFiles.length,
    excelTempPath: persistedExcelFiles[0]?.tempPath || '',
    zendaoJsonTempPath: persistedZendao?.bug_json_file_path || '',
    zendaoExcelTempPaths: persistedZendao?.bug_excel_file_paths || {},
  };
}

export async function dumpGeneratorCacheSnapshot(options) {
  return prepareGeneratorCacheWorkspace(options);
}
