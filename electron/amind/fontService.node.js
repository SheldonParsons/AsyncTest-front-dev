import fs from 'node:fs';
import path from 'node:path';
import { getMindFontDefinitions, normalizeMindFontFamily, MIND_PLATFORM_DEFAULT_FONT_KEY } from '../../src/mind/fontRegistry.js';

const MANIFEST_VERSION = 1;

function normalizeErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error ?? 'Unknown error');
}

async function readJsonFile(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function writeJsonFileAtomic(filePath, value) {
  const directoryPath = path.dirname(filePath);
  await fs.promises.mkdir(directoryPath, { recursive: true });
  const tempPath = `${filePath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await fs.promises.writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
  await fs.promises.rename(tempPath, filePath);
}

async function writeBufferAtomic(filePath, bytes) {
  const directoryPath = path.dirname(filePath);
  await fs.promises.mkdir(directoryPath, { recursive: true });
  const tempPath = `${filePath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await fs.promises.writeFile(tempPath, bytes);
  await fs.promises.rename(tempPath, filePath);
}

function parseStyleString(style) {
  if (!style) return [];
  return String(style)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split(':').map((part) => part.trim()))
    .filter((entry) => entry.length === 2);
}

function updateStyleStringFontFamily(style, nextFontFamily) {
  const pairs = parseStyleString(style);
  if (!pairs.length) return style;
  let changed = false;
  const nextPairs = [];
  for (const [key, value] of pairs) {
    if (key !== 'font-family') {
      nextPairs.push([key, value]);
      continue;
    }
    if (value === nextFontFamily) {
      nextPairs.push([key, value]);
      continue;
    }
    changed = true;
    nextPairs.push([key, nextFontFamily]);
  }
  return changed ? nextPairs.map(([key, value]) => `${key}: ${value}`).join('; ') : style;
}

function visitLexicalNodes(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => visitLexicalNodes(child, visitor));
  }
}

function visitNodeRichText(richText, visitor) {
  if (!richText || !Array.isArray(richText.blocks)) return;
  richText.blocks.forEach((block) => {
    if (!Array.isArray(block?.inlines)) return;
    block.inlines.forEach((inline) => visitor(inline));
  });
}

function isMindBoard(board) {
  return !!board && typeof board === 'object' && !!board.nodes && typeof board.nodes === 'object';
}

function collectMindBoards(doc) {
  const multiMindBoards = doc?.mind?.minds;
  if (multiMindBoards && typeof multiMindBoards === 'object') {
    return Object.values(multiMindBoards).filter((board) => isMindBoard(board));
  }
  if (Array.isArray(doc?.minds)) {
    return doc.minds.filter((board) => isMindBoard(board));
  }
  if (isMindBoard(doc?.mind)) return [doc.mind];
  return [];
}

function collectMindNodes(doc) {
  const boards = collectMindBoards(doc);
  const result = [];
  for (const board of boards) {
    const nodes = board?.nodes;
    if (!nodes || typeof nodes !== 'object') continue;
    for (const node of Object.values(nodes)) {
      if (node && typeof node === 'object') result.push(node);
    }
  }
  return result;
}

export function createMindFontService({ userDataPath, platform = process.platform, onStatusChange } = {}) {
  const fontsRoot = path.join(userDataPath, 'amind-fonts');
  const manifestPath = path.join(fontsRoot, 'manifest.json');
  let manifest = null;
  const inflightDownloads = new Map();

  async function ensureManifest() {
    await fs.promises.mkdir(fontsRoot, { recursive: true });
    if (manifest) return manifest;
    const loaded = await readJsonFile(manifestPath);
    manifest = loaded && loaded.version === MANIFEST_VERSION
      ? loaded
      : { version: MANIFEST_VERSION, fonts: {} };
    return manifest;
  }

  async function persistManifest() {
    const current = await ensureManifest();
    await writeJsonFileAtomic(manifestPath, current);
  }

  function getDefinitions() {
    return getMindFontDefinitions(platform);
  }

  function getDescriptorDirectory(definition) {
    return path.join(fontsRoot, definition.key);
  }

  function getFaceFilePath(definition, face) {
    return path.join(getDescriptorDirectory(definition), path.basename(face.url));
  }

  function isDefinitionReady(definition) {
    if (!definition.downloadable) return true;
    return definition.faces.every((face) => fs.existsSync(getFaceFilePath(definition, face)));
  }

  async function getFontCatalog() {
    const currentManifest = await ensureManifest();
    const definitions = getDefinitions();
    const fonts = definitions.map((definition) => {
      const manifestEntry = currentManifest.fonts?.[definition.key] ?? {};
      const ready = isDefinitionReady(definition);
      const downloading = inflightDownloads.has(definition.key);
      const status = definition.downloadable
        ? ready
          ? 'ready'
          : downloading
            ? 'downloading'
            : manifestEntry.lastError
              ? 'failed'
              : 'unavailable'
        : 'ready';
      return {
        key: definition.key,
        label: definition.label,
        sample: definition.sample,
        fontFamily: definition.fontFamily,
        familyName: definition.familyName,
        downloadable: !!definition.downloadable,
        status,
        error: manifestEntry.lastError ?? null,
        faces: definition.faces.map((face) => ({
          variant: face.variant,
          weight: face.weight,
          style: 'normal',
          format: face.format,
          filePath: getFaceFilePath(definition, face),
          exists: fs.existsSync(getFaceFilePath(definition, face)),
        })),
      };
    });
    return {
      version: MANIFEST_VERSION,
      platform,
      fonts,
    };
  }

  async function notifyCatalogChanged() {
    const catalog = await getFontCatalog();
    if (typeof onStatusChange === 'function') {
      onStatusChange(catalog);
    }
    return catalog;
  }

  async function downloadDefinition(definition) {
    if (!definition.downloadable) return;
    if (inflightDownloads.has(definition.key)) return inflightDownloads.get(definition.key);
    const task = (async () => {
      const currentManifest = await ensureManifest();
      currentManifest.fonts[definition.key] = {
        ...(currentManifest.fonts[definition.key] ?? {}),
        lastError: null,
        updatedAt: new Date().toISOString(),
      };
      await persistManifest();
      await notifyCatalogChanged();
      try {
        for (const face of definition.faces) {
          const targetPath = getFaceFilePath(definition, face);
          if (fs.existsSync(targetPath)) continue;
          const response = await fetch(face.url);
          if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
          }
          const bytes = Buffer.from(await response.arrayBuffer());
          await writeBufferAtomic(targetPath, bytes);
        }
        currentManifest.fonts[definition.key] = {
          ...(currentManifest.fonts[definition.key] ?? {}),
          lastError: null,
          updatedAt: new Date().toISOString(),
        };
        await persistManifest();
      } catch (error) {
        currentManifest.fonts[definition.key] = {
          ...(currentManifest.fonts[definition.key] ?? {}),
          lastError: normalizeErrorMessage(error),
          updatedAt: new Date().toISOString(),
        };
        await persistManifest();
      } finally {
        inflightDownloads.delete(definition.key);
        await notifyCatalogChanged();
      }
    })();
    inflightDownloads.set(definition.key, task);
    return task;
  }

  async function prepareFonts() {
    await ensureManifest();
    const definitions = getDefinitions().filter((definition) => definition.downloadable);
    definitions.forEach((definition) => {
      if (isDefinitionReady(definition)) return;
      void downloadDefinition(definition);
    });
    return await getFontCatalog();
  }

  async function retryFontDownload({ key } = {}) {
    const definition = getDefinitions().find((item) => item.key === key);
    if (!definition) {
      throw new Error(`Unknown mind font key: ${key ?? ''}`);
    }
    if (!definition.downloadable) {
      return await getFontCatalog();
    }
    await downloadDefinition(definition);
    return await getFontCatalog();
  }

  async function normalizeDocFonts(doc) {
    await ensureManifest();
    const readyRemoteKeys = new Set(
      getDefinitions()
        .filter((definition) => definition.downloadable && isDefinitionReady(definition))
        .map((definition) => definition.key)
    );
    const nodes = collectMindNodes(doc);
    nodes.forEach((node) => {
      const styleFontFamily = node?.style?.text?.fontFamily;
      if (typeof styleFontFamily === 'string' && styleFontFamily.trim()) {
        const normalized = normalizeMindFontFamily(styleFontFamily, platform, readyRemoteKeys).fontFamily;
        if (normalized !== styleFontFamily) {
          node.style = node.style || {};
          node.style.text = node.style.text || {};
          node.style.text.fontFamily = normalized;
        }
      }

      visitNodeRichText(node?.richText, (inline) => {
        const marks = inline?.marks;
        if (!marks?.fontFamily) return;
        const normalized = normalizeMindFontFamily(marks.fontFamily, platform, readyRemoteKeys).fontFamily;
        if (normalized !== marks.fontFamily) {
          marks.fontFamily = normalized;
        }
      });

      const lexicalState = node?.textLexical;
      if (lexicalState?.root?.children) {
        visitLexicalNodes(lexicalState.root, (lexicalNode) => {
          if (typeof lexicalNode.style !== 'string' || !lexicalNode.style.includes('font-family')) return;
          const pairs = parseStyleString(lexicalNode.style);
          const fontFamily = pairs.find(([key]) => key === 'font-family')?.[1];
          if (!fontFamily) return;
          const normalized = normalizeMindFontFamily(fontFamily, platform, readyRemoteKeys).fontFamily;
          if (normalized !== fontFamily) {
            lexicalNode.style = updateStyleStringFontFamily(lexicalNode.style, normalized);
          }
        });
      }
    });
    return doc;
  }

  async function readFontFace({ key, variant } = {}) {
    const definition = getDefinitions().find((item) => item.key === key);
    if (!definition) {
      throw new Error(`Unknown mind font key: ${key ?? ''}`);
    }
    const face = definition.faces.find((item) => item.variant === variant);
    if (!face) {
      throw new Error(`Unknown mind font face variant: ${variant ?? ''}`);
    }
    const filePath = getFaceFilePath(definition, face);
    const bytes = await fs.promises.readFile(filePath);
    return {
      key: definition.key,
      familyName: definition.familyName,
      variant: face.variant,
      weight: face.weight,
      style: 'normal',
      format: face.format,
      bytes: Uint8Array.from(bytes),
    };
  }

  return {
    getFontCatalog,
    prepareFonts,
    retryFontDownload,
    normalizeDocFonts,
    readFontFace,
    notifyCatalogChanged,
    platformDefaultKey: MIND_PLATFORM_DEFAULT_FONT_KEY,
  };
}
