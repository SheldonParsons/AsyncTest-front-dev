import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { loadExcelWorkbookBytes, buildExcelParseResult } from './core/excelParser.js';
import { parseAmindBytes } from './core/amindParser.js';
import { assert, PARSER_VERSION } from './core/schema.js';
import { hash } from './reportStore.node.js';
import { prepareGeneratorCacheWorkspace } from './cacheDump.node.js';
import { buildDefaultReportDocument, exportEnvironmentReportPackage, describeDocumentAttachment } from './docxExport.node.js';
import { readAmindFile } from '../amind/amindFileService.node.js';

// A worker has only frozen local paths, never credentials or networking adapters.
globalThis.fetch = async () => { throw Object.assign(new Error('本地报告 Worker 禁止联网'), { code: 'NETWORK_DISABLED' }); };
async function parse(input) {
  const bytes = await fs.readFile(input.path);
  assert(!input.expectedHash || hash(bytes) === input.expectedHash, 'FILE_CHANGED', '持久化来源内容校验失败');
  assert(bytes.length > 0 && bytes.length <= 50 * 1024 ** 2, 'FILE_TOO_LARGE', '来源必须为非空且不超过 50 MB');
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.values(zip.files);
  assert(entries.length <= 10000, 'ARCHIVE_LIMIT', '压缩包条目超过上限');
  const total = entries.reduce((sum, entry) => sum + (entry._data?.uncompressedSize || 0), 0);
  assert(total <= 250 * 1024 ** 2, 'ARCHIVE_LIMIT', '解压后文件超过 250 MB');
  if (input.role === 'amind') { await readAmindFile(input.path); return { result: await parseAmindBytes(input.source, bytes), parserVersion: PARSER_VERSION }; }
  const workbook = loadExcelWorkbookBytes(bytes);
  const config = input.config || {};
  if (config.selectedSheet) assert(workbook.sheets[config.selectedSheet], 'FILE_CHANGED', '所选工作表已不存在；请重新选择文件和工作表');
  if (config.columnMapping) for (const column of Object.values(config.columnMapping)) if (column !== '') assert(workbook.sheets[config.selectedSheet]?.columns.some(item => item.value === column), 'FILE_CHANGED', '映射列已不存在；旧来源保持不变');
  return { workbook, result: buildExcelParseResult(input.source, workbook, { ...config, sheetName: config.selectedSheet }), parserVersion: PARSER_VERSION };
}
async function run() {
  const { task, input } = workerData;
  if (task === 'parse') return parse(input);
  if (task === 'document') return input.payload.environments.map(environment => buildDefaultReportDocument(input.payload, environment));
  if (task === 'pack') {
    const zip = new JSZip(); const names = new Set();
    for (const file of input.files) {
      const parsed = path.parse(file.fileName); let name = file.fileName, number = 2;
      while (names.has(name)) name = `${parsed.name}-${number++}${parsed.ext}`;
      names.add(name); zip.file(name, await fs.readFile(file.path));
    }
    const bytes = await zip.generateAsync({ type: 'nodebuffer' }); await fs.writeFile(input.destination, bytes);
    await JSZip.loadAsync(bytes, { checkCRC32: true }); return { hash: hash(bytes), size: bytes.length };
  }
  if (task === 'export') {
    for (const source of [...(input.payload.amindFiles || []), ...(input.payload.excelFile ? [input.payload.excelFile] : [])]) if (source.assetId) assert(hash(await fs.readFile(source.assetPath)) === source.assetId, 'FILE_CHANGED', '冻结报告来源校验失败');
    parentPort.postMessage({ progress: '准备本地附件' });
    const workspace = await prepareGeneratorCacheWorkspace({ payload: input.payload, jobDir: input.jobDir });
    const documents = input.documents;
    for (const doc of documents) {
      doc.extraAttachments = {};
      const ids = new Set(doc.blocks.filter(b => b.visible !== false && b.type === 'attachment' && b.assetId).map(b => b.assetId));
      for (const block of doc.blocks) for (const row of block.rows || []) for (const cell of row.cells || []) if (cell.attachment && !['testCase', 'bugZip'].includes(cell.attachment)) ids.add(cell.attachment);
      for (const [index, assetId] of [...ids].entries()) {
        const asset = input.assets[assetId]; assert(asset, 'NOT_FOUND', `附件资产不存在：${assetId}`);
        doc.extraAttachments[assetId] = describeDocumentAttachment(assetId, asset.name, await fs.readFile(asset.path), index);
      }
    }
    parentPort.postMessage({ progress: '渲染 DOCX 与嵌入附件' });
    const output = await exportEnvironmentReportPackage({ tempDir: input.jobDir, payload: workspace.snapshot, documents });
    const files = [...output.docxFiles.map(file => ({ ...file, format: 'docx' })), { fileName: output.zipFileName, filePath: output.zipFilePath, format: 'zip' }];
    for (const file of files) {
      const bytes = await fs.readFile(file.filePath); const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
      assert(Object.keys(zip.files).length > 0, 'INVALID_EXPORT', '导出内容为空');
      if (file.format === 'docx') {
        const xml = await zip.file('word/document.xml')?.async('string'); const rels = await zip.file('word/_rels/document.xml.rels')?.async('string');
        assert(xml && rels, 'INVALID_EXPORT', 'DOCX 结构不完整');
        for (const match of rels.matchAll(/Target="(embeddings\/[^"]+|media\/[^"]+)"/g)) assert(zip.file(`word/${match[1]}`), 'INVALID_EXPORT', 'DOCX 嵌入附件缺失');
      }
      file.size = bytes.length; file.hash = hash(bytes);
    }
    return { files, zipFilePath: output.zipFilePath };
  }
  throw new Error(`未知报告 Worker 任务：${task}`);
}
run().then(result => parentPort.postMessage({ result })).catch(error => parentPort.postMessage({ error: { code: error.code || 'WORKER_FAILED', message: error.message, details: error.details } }));
