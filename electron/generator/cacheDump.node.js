import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { readAmindFile } from '../amind/amindFileService.node.js';
import { writeXmindFile } from '../amind/xmindFileService.node.js';
import { persistLocalReportSource, withoutLocalFileContent } from './localSource.node.js';
import { persistZendaoArtifacts } from './zendaoRun.node.js';
import { ReportError } from './core/schema.js';

const GENERATOR_TEMP_ROOT = path.join(process.env.ASYNCTEST_RUNTIME_DATA_ROOT || os.tmpdir(), 'asynctest-generator-cache');

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



async function downloadFileFromBackend(backendFileId, auth, targetPath) {
  const url = `${auth.baseURL}/project/file/download?id=${backendFileId}`;
  const response = await fetch(url, {
    headers: { Authorization: `token=${auth.token}` },
  });
  if (!response.ok) {
    throw new Error(`下载文件失败：${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(targetPath, buffer);
  return { path: targetPath, size: buffer.length };
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

async function persistSourceFileList(files, tempDir, subDirName, auth) {
  const targetDir = path.join(tempDir, subDirName);
  await ensureDirectory(targetDir);

  const persisted = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const ext = path.extname(file?.name || '') || '';
    const baseName = sanitizeFileNamePart(path.basename(file?.name || `file-${index + 1}`, ext));
    const targetPath = path.join(targetDir, `${String(index + 1).padStart(2, '0')}_${baseName}${ext}`);
    const downloadResult = file.assetPath
      ? await fs.copyFile(file.assetPath, targetPath).then(() => ({path: targetPath, size: file.size}))
      : file.source === 'local'
      ? await persistLocalReportSource(file, targetPath)
      : file.backendFileId && auth
      ? await downloadFileFromBackend(file.backendFileId, auth, targetPath)
      : await downloadFileToPath(file.downloadUrl, targetPath);
    persisted.push({
      ...withoutLocalFileContent(file),
      tempPath: downloadResult.path,
      tempSize: downloadResult.size,
    });
  }

  return persisted;
}

async function persistAmindFileList(files, tempDir, auth, onWarning) {
  const targetDir = path.join(tempDir, 'amind');
  await ensureDirectory(targetDir);

  const persisted = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const originalBaseName = sanitizeFileNamePart(path.basename(file?.name || `amind-${index + 1}`, '.amind'));
    const originalTempPath = await buildUniquePath(targetDir, `${originalBaseName}.amind`);
    const originalDownload = file.assetPath
      ? await fs.copyFile(file.assetPath, originalTempPath).then(() => ({path: originalTempPath, size: file.size}))
      : file.source === 'local'
      ? await persistLocalReportSource(file, originalTempPath)
      : file.backendFileId && auth
      ? await downloadFileFromBackend(file.backendFileId, auth, originalTempPath)
      : await downloadFileToPath(file.downloadUrl, originalTempPath);

    const { doc } = await readAmindFile(originalTempPath);
    let xmindTempPath = null;
    let attachmentWarning = null;
    // 原始 amind 附件不需要转换；转换不应成为保留原件的前置条件。
    if (file.docxFileType !== 'amind') {
      const destination = await buildUniquePath(targetDir, `${originalBaseName}.xmind`);
      try {
        const result = await writeXmindFile(destination, doc, null);
        xmindTempPath = result.path;
      } catch (error) {
        if (error.details?.reason !== 'UNREACHABLE_NODES') {
          throw new ReportError('ATTACHMENT_CONVERSION_FAILED', `用例文件「${file.name}」转为 XMind 失败：${error.message}`, { sourceId: file.id, fileName: file.name });
        }
        // 无法判断未关联节点的原有位置，完整保留原文件，既不丢内容也不猜测层级。
        attachmentWarning = {
          code: 'XMIND_ORIGINAL_PRESERVED', sourceId: file.id, fileName: file.name,
          requestedFormat: 'xmind', actualFormat: 'amind', ...error.details,
          message: `用例文件「${file.name}」的画板 ${error.details.boardId} 有 ${error.details.unreachableNodeCount} 个未关联节点，无法完整转为 XMind；附件已保留原始 .amind 文件，所有内容均保留，请使用 AsyncTest Mind 打开。`,
        };
        onWarning?.(attachmentWarning);
      }
    }

    persisted.push({
      ...withoutLocalFileContent(file),
      originalTempPath,
      originalTempSize: originalDownload.size,
      xmindTempPath,
      exportTempPath: xmindTempPath || originalTempPath,
      ...(attachmentWarning ? { attachmentWarning } : {}),
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

export async function prepareGeneratorCacheWorkspace({ targetPath, payload, auth, jobDir, onWarning }) {
  const tempDir = jobDir || path.join(GENERATOR_TEMP_ROOT, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const snapshotPath = targetPath || path.join(tempDir, 'file.md');

  await ensureDirectory(tempDir);
  await ensureDirectory(path.dirname(snapshotPath));

  const attachmentWarnings = [];
  const persistedAmindFiles = await persistAmindFileList(payload?.amindFiles || [], tempDir, auth, warning => {
    attachmentWarnings.push(warning);
    onWarning?.(warning);
  });
  const persistedExcelFiles = payload?.excelFile ? await persistSourceFileList([payload.excelFile], tempDir, 'excel', auth) : [];
  const persistedZendao = await persistZendaoCache(payload?.zendao, tempDir);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    tempDir,
    tempCleanupPolicy: '每个作业独立目录；仅显式清理当前作业，历史产物按引用保留。',
    ...payload,
    attachmentWarnings,
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
