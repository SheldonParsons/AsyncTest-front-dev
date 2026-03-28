import fs from 'node:fs/promises';
import path from 'node:path';
import { dialog, ipcMain } from 'electron';
import JSZip from 'jszip';

import { readAmindBuffer } from './amind/amindFileService.node.js';
import { buildXmindBuffer } from './amind/xmindFileService.node.js';

function ensureZipExt(fileName) {
  const normalized = `${fileName || ''}`.trim() || '当前目录文件';
  return normalized.toLowerCase().endsWith('.zip') ? normalized : `${normalized}.zip`;
}

function getUniqueZipPath(initialPath, usedPaths) {
  if (!usedPaths.has(initialPath)) return initialPath;

  const extension = path.extname(initialPath);
  const baseName = initialPath.slice(0, initialPath.length - extension.length);
  let index = 1;
  let nextPath = `${baseName}_converted${extension}`;
  while (usedPaths.has(nextPath)) {
    index += 1;
    nextPath = `${baseName}_converted_${index}${extension}`;
  }
  return nextPath;
}

function detectCompression(name) {
  const normalized = `${name || ''}`.toLowerCase();
  return normalized.endsWith('.amind') || normalized.endsWith('.xmind') || normalized.endsWith('.png') || normalized.endsWith('.jpg') || normalized.endsWith('.jpeg') || normalized.endsWith('.gif') || normalized.endsWith('.webp')
    ? 'STORE'
    : 'DEFLATE';
}

export function initProjectFilesMain() {
  ipcMain.handle(
    'projectFiles:saveCurrentFolderZip',
    async (
      event,
      {
        zipBytes,
        defaultFileName,
        convertAmindToXmind = false,
      } = {}
    ) => {
      if (!zipBytes) {
        throw new Error('缺少 zip 内容');
      }

      const sourceZipBuffer = Buffer.isBuffer(zipBytes) ? zipBytes : Buffer.from(zipBytes);
      let outputBuffer = sourceZipBuffer;
      let convertedCount = 0;
      const failedAmindFiles = [];

      if (convertAmindToXmind) {
        const sourceZip = await JSZip.loadAsync(sourceZipBuffer);
        const outputZip = new JSZip();
        const usedPaths = new Set();

        for (const [entryName, entry] of Object.entries(sourceZip.files)) {
          if (entry.dir) {
            outputZip.folder(entryName);
            usedPaths.add(entryName);
            continue;
          }

          if (entryName.toLowerCase().endsWith('.amind')) {
            try {
              const amindBytes = await entry.async('nodebuffer');
              const { doc } = await readAmindBuffer(amindBytes, entryName);
              const targetXmindPath = getUniqueZipPath(entryName.replace(/\.amind$/i, '.xmind'), usedPaths);
              const xmindBytes = await buildXmindBuffer(doc);
              outputZip.file(targetXmindPath, xmindBytes, { compression: 'STORE' });
              usedPaths.add(targetXmindPath);
              convertedCount += 1;
              continue;
            } catch (error) {
              failedAmindFiles.push({
                path: entryName,
                message: error instanceof Error ? error.message : `${error || '转换失败'}`,
              });
            }
          }

          const fileBytes = await entry.async('uint8array');
          outputZip.file(entryName, fileBytes, {
            compression: detectCompression(entryName),
          });
          usedPaths.add(entryName);
        }

        outputBuffer = await outputZip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
        });
      }

      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: ensureZipExt(defaultFileName),
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      });

      if (canceled || !filePath) {
        return {
          canceled: true,
        };
      }

      await fs.writeFile(filePath, outputBuffer);
      return {
        canceled: false,
        filePath,
        convertedCount,
        failedAmindFiles,
      };
    }
  );
}
