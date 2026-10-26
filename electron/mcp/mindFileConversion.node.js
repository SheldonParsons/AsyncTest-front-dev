import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { readAmindBuffer, buildAmindBuffer } from '../amind/amindFileService.node.js';
import { readXmindWorkbookBuffer, convertXmindWorkbookToAmindDoc, buildXmindBuffer } from '../amind/xmindFileService.node.js';
import { guessMimeFromPath } from '../shared/assetService.node.js';
import { assertMindAgentControlEnabled, subscribeMindAgentControl } from './mindAgentControlManager.node.js';
import { createMindMcpError } from './mindMcpProtocol.node.js';
import { beginMindOperation, startMindOperation, updateMindOperationProgress, assertMindOperationActive, completeMindOperation, failMindOperation } from './mindOperationManager.node.js';

function conversionError(code, message, details) {
  return createMindMcpError(code, message, { details });
}

function absoluteFile(value, extension) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')) {
    throw conversionError('INVALID_ARGUMENT', '源文件和输出文件必须提供完整的绝对路径。');
  }
  const resolved = path.resolve(value);
  if (extension && path.extname(resolved).toLowerCase() !== extension) {
    throw conversionError('INVALID_ARGUMENT', `文件扩展名必须为 ${extension}。`, { filePath: resolved });
  }
  return resolved;
}

function fileState(filePath) {
  try { return fs.statSync(filePath); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function sameIdentity(a, b) {
  return !!(a && b && a.ino && b.ino && a.dev === b.dev && a.ino === b.ino);
}

function sameState(a, b) {
  return a == null && b == null || sameIdentity(a, b) && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;
}

function canonicalOutput(filePath) {
  const input = absoluteFile(filePath);
  // 不跟随目标文件的符号链接：明确拒绝，避免覆盖链接指向的其它文档。
  const parent = fs.realpathSync(path.dirname(input));
  return path.join(parent, path.basename(input));
}

export function mindFileConversionKey(outputFilePath) {
  return `file-conversion:${canonicalOutput(outputFilePath)}`;
}

function findOpenFiles(filePath, documents) {
  const state = fileState(filePath);
  return documents.filter((item) => [item.filePath, item.importedFrom].some((openPath) => {
    if (!openPath) return false;
    return path.resolve(openPath) === filePath || sameIdentity(state, fileState(openPath));
  }));
}

function assertOutputAvailable(sourceFilePath, outputFilePath, overwrite, getOpenDocuments) {
  const target = fileState(outputFilePath);
  const source = fileState(sourceFilePath);
  if (sourceFilePath === outputFilePath || sameIdentity(source, target)) {
    throw conversionError('SAME_FILE', '源文件和输出文件不能指向同一文件。');
  }
  let link;
  try { link = fs.lstatSync(outputFilePath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (link?.isSymbolicLink()) throw conversionError('INVALID_ARGUMENT', '输出路径不能是符号链接，请指定新的文件路径。');
  if (target && !target.isFile()) throw conversionError('INVALID_ARGUMENT', '输出路径必须是普通文件。');
  const open = findOpenFiles(outputFilePath, getOpenDocuments());
  if (open.length) throw conversionError('FILE_IN_USE', '输出文件正在 AsyncTest 中打开。请换一个输出路径，或保存并关闭该文档后再转换。', { documents: open.map(({ docId }) => ({ docId })) });
  if (target && !overwrite) throw conversionError('FILE_ALREADY_EXISTS', '输出文件已经存在；请指定新路径，或明确允许覆盖。');
  return target;
}

async function embedAmindImages(doc, sourceBytes) {
  const zip = await JSZip.loadAsync(sourceBytes);
  for (const board of Object.values(doc.mind.minds)) {
    for (const node of Object.values(board.nodes)) {
      const image = node.image;
      if (!image || image.src?.startsWith('data:')) continue;
      const resource = image.assetId && image.ext ? `assets/${image.assetId}.${image.ext}` : null;
      const entry = resource && zip.file(resource);
      if (!entry) throw conversionError('INVALID_FILE', '图片资源不存在或未嵌入文件，已停止转换以免丢图。', { nodeId: node.id, resource });
      const bytes = await entry.async('nodebuffer');
      const mime = guessMimeFromPath(resource);
      if (!mime) throw conversionError('UNSUPPORTED_CONTENT', '该图片格式暂不能转换。', { resource });
      node.image = { ...image, src: `data:${mime};base64,${bytes.toString('base64')}`, mime };
    }
  }
}

function statistics(doc) {
  const result = { boardCount: doc.mind.order.length, nodeCount: 0, noteCount: 0, imageCount: 0, collapsedNodeCount: 0, priorityCounts: {}, taskMarkerCount: 0 };
  for (const boardId of doc.mind.order) {
    for (const node of Object.values(doc.mind.minds[boardId].nodes)) {
      result.nodeCount += 1;
      const note = node.note ?? node.notes ?? node.remark;
      if (typeof note === 'string' && note.length) result.noteCount += 1;
      if (node.image) result.imageCount += 1;
      if (node.collapsed) result.collapsedNodeCount += 1;
      for (const marker of node.markers || []) {
        const level = /^level:level([1-7])$/.exec(marker)?.[1];
        if (level) result.priorityCounts[level] = (result.priorityCounts[level] || 0) + 1;
        if (marker.startsWith('task:')) result.taskMarkerCount += 1;
      }
    }
  }
  return result;
}

function summarizeWarnings(warnings) {
  const groups = new Map();
  for (const warning of warnings) {
    const key = `${warning.code}:${warning.message}`;
    if (!groups.has(key)) groups.set(key, { code: warning.code, message: warning.message, count: 0, examples: [] });
    const group = groups.get(key);
    group.count += 1;
    if (group.examples.length < 5 && (warning.nodeId || warning.boardId)) group.examples.push({ nodeId: warning.nodeId, boardId: warning.boardId });
  }
  return [...groups.values()];
}

// 复用业务桥和操作管理器；全局退出控制在写入前中止转换，恢复控制不会重放旧任务。
export async function convertMindFile({ sourceFilePath, outputFilePath, overwrite = false, mcpClientId }, direction, { getOpenDocuments = () => [] } = {}) {
  if (typeof overwrite !== 'boolean') throw conversionError('INVALID_ARGUMENT', 'overwrite 必须是布尔值。');
  const from = direction === 'xmind-to-amind' ? 'xmind' : direction === 'amind-to-xmind' ? 'amind' : null;
  if (!from) throw conversionError('INVALID_ARGUMENT', '不支持的文件转换方向。');
  const to = from === 'xmind' ? 'amind' : 'xmind';
  const input = absoluteFile(sourceFilePath, `.${from}`);
  const output = absoluteFile(outputFilePath, `.${to}`);
  let operation;
  let temporaryPath;
  let unsubscribe;
  let committed = false;
  try {
    assertMindAgentControlEnabled();
    sourceFilePath = fs.realpathSync(input);
    outputFilePath = canonicalOutput(output);
    const sourceState = fileState(sourceFilePath);
    if (!sourceState?.isFile()) throw conversionError('INVALID_ARGUMENT', '源路径必须是普通文件。');
    const targetState = assertOutputAvailable(sourceFilePath, outputFilePath, overwrite, getOpenDocuments);
    operation = beginMindOperation({ windowKey: mindFileConversionKey(outputFilePath), transactionId: randomUUID(), clientId: mcpClientId, status: 'preparing', kind: 'file-conversion', filePaths: { sourceFilePath, outputFilePath }, totalCount: 4 });
    unsubscribe = subscribeMindAgentControl((state) => {
      if (!state.controlEnabled && !committed) {
        operation.cancelRequested = true;
        operation.status = 'stopping';
        operation.stop = { reason: 'control-exited', stoppedAt: new Date().toISOString() };
      }
    });
    const checkpoint = (phase, completedCount) => {
      assertMindAgentControlEnabled();
      assertMindOperationActive(operation);
      updateMindOperationProgress(operation, { phase, completedCount });
    };
    const warnings = [];
    if (findOpenFiles(sourceFilePath, getOpenDocuments()).length) warnings.push({ code: 'SOURCE_DISK_VERSION', message: '源文档已在 AsyncTest 打开；本次只读取磁盘上已保存的版本，未保存修改不参与转换，也不会自动保存或关闭文档。' });
    const sourceBytes = await fsp.readFile(sourceFilePath);
    checkpoint('parsing', 1);
    let doc;
    let buffer;
    try {
      if (from === 'xmind') {
        const workbook = await readXmindWorkbookBuffer(sourceBytes, sourceFilePath);
        warnings.push(...workbook.warnings);
        doc = convertXmindWorkbookToAmindDoc(workbook.workbook, { resourceBytesMap: workbook.resourceBytesMap, warnings, sourcePath: sourceFilePath, activeSheetId: workbook.activeSheetId });
        checkpoint('building', 2);
        startMindOperation(operation);
        ({ buffer } = await buildAmindBuffer(outputFilePath, doc, { preserveExisting: false }));
      } else {
        ({ doc } = await readAmindBuffer(sourceBytes, sourceFilePath));
        await embedAmindImages(doc, sourceBytes);
        checkpoint('building', 2);
        startMindOperation(operation);
        buffer = await buildXmindBuffer(doc, null, { warnings });
        warnings.push({ code: 'LEGACY_XML_PRESENTATION', message: '旧版 XMind 兼容内容包含真实主题树、备注、标记和图片；部分富文本及样式在旧版软件中可能不同。' });
      }
    } catch (error) {
      if (error.code) throw error;
      throw conversionError('INVALID_FILE', `无法转换此文件：${error.message}`);
    }
    checkpoint('writing', 3);
    const summary = statistics(doc);
    temporaryPath = path.join(path.dirname(outputFilePath), `.asynctest-convert-${randomUUID()}.tmp`);
    const handle = await fsp.open(temporaryPath, 'wx', 0o600);
    try { await handle.writeFile(buffer); await handle.sync(); } finally { await handle.close(); }
    checkpoint('committing', 3);
    if (!sameState(sourceState, fileState(sourceFilePath))) throw conversionError('FILE_CHANGED', '转换期间源文件发生变化，请核对磁盘版本后重试。');
    const currentTarget = assertOutputAvailable(sourceFilePath, outputFilePath, overwrite, getOpenDocuments);
    if (!sameState(targetState, currentTarget)) throw conversionError('FILE_CHANGED', '转换期间输出文件发生变化，已停止覆盖。');
    // 最终检查和文件替换在同一主线程任务内完成；不留下半写入的最终文件。
    if (overwrite) fs.renameSync(temporaryPath, outputFilePath);
    else fs.linkSync(temporaryPath, outputFilePath); // 原子 no-clobber，避免其它进程抢先创建时被覆盖。
    committed = true;
    if (overwrite) temporaryPath = null;
    else {
      // 输出提交成功后，临时链接清理失败不能把一次成功转换误报成可重试的失败。
      try { fs.unlinkSync(temporaryPath); temporaryPath = null; } catch { /* finally 再尝试清理。 */ }
    }
    const result = {
      ok: true, operationId: operation.transactionId, sourceFilePath, outputFilePath,
      sourceFormat: from, outputFormat: to, sourceVersion: 'disk', sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
      ...summary, warnings: summarizeWarnings(warnings), saved: true,
      countMeaning: 'nodeCount 是所有主题节点数；noteCount、priorityCounts 和 taskMarkerCount 单独统计，不推断业务用例数量。',
    };
    completeMindOperation(operation, result);
    return result;
  } catch (cause) {
    const code = { ENOENT: 'FILE_NOT_FOUND', EEXIST: 'FILE_ALREADY_EXISTS', EACCES: 'FILE_PERMISSION_DENIED', EPERM: 'FILE_PERMISSION_DENIED' }[cause.code];
    const error = code ? conversionError(code, cause.message) : cause;
    if (operation) {
      error.details = { ...error.details, operationId: operation.transactionId, sourceFilePath, outputFilePath, outputCommitted: committed };
      failMindOperation(operation, error);
    }
    throw error;
  } finally {
    unsubscribe?.();
    if (temporaryPath) await fsp.rm(temporaryPath, { force: true }).catch(() => {});
  }
}
