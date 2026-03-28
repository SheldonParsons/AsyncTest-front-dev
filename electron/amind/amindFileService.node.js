import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import JSZip from 'jszip';
import { AMIND_EXT, AMIND_SCHEMA_VERSION } from './constants.js';

export function ensureAmindExt(p) {
    return p.toLowerCase().endsWith(AMIND_EXT) ? p : `${p}${AMIND_EXT}`;
}

const DEV_SEED_ENABLED = process.env.AMIND_DEV_SEED_NODES === '1';
const SEED_WORDS = [
    'alpha',
    'beta',
    'gamma',
    'delta',
    'matrix',
    'signal',
    'orbit',
    'vector',
    'canvas',
    'branch',
    'focus',
    'cluster',
];
const SEED_IMAGE_COLORS = [
    '#2563eb',
    '#7c3aed',
    '#db2777',
    '#ea580c',
    '#ca8a04',
    '#16a34a',
    '#0891b2',
    '#dc2626',
];

function readPositiveIntEnv(name, fallbackValue) {
    const raw = process.env[name];
    if (!raw) return fallbackValue;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function normalizePositiveInt(value, fallbackValue = 0) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function resolveSeedCount(seedCountOverride) {
    if (seedCountOverride !== undefined) {
        const parsed = Number.parseInt(String(seedCountOverride), 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    return DEV_SEED_ENABLED ? readPositiveIntEnv('AMIND_DEV_SEED_NODE_COUNT', 300) : 0;
}

function normalizeSeedConfig(seedConfig) {
    if (!seedConfig || typeof seedConfig !== 'object') return null;
    const totalNodeCount = normalizePositiveInt(
        seedConfig.totalNodeCount ?? seedConfig.nodeCount,
        0
    );
    const totalImageCount = normalizePositiveInt(
        seedConfig.totalImageCount ?? seedConfig.imageCount,
        0
    );
    if (totalNodeCount <= 0 && totalImageCount <= 0) return null;
    return {
        totalNodeCount,
        totalImageCount,
    };
}

function resolveSeedConfig(options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, 'seedConfig')) {
        return normalizeSeedConfig(options.seedConfig);
    }

    if (Object.prototype.hasOwnProperty.call(options, 'seedNodeCount')) {
        const legacySeedCount = resolveSeedCount(options.seedNodeCount);
        if (legacySeedCount > 0) {
            return {
                totalNodeCount: legacySeedCount + 1,
                totalImageCount: 0,
            };
        }
        return null;
    }

    if (!DEV_SEED_ENABLED) return null;
    const envTotalNodeCount =
        normalizePositiveInt(process.env.AMIND_DEV_SEED_TOTAL_NODE_COUNT, 0) ||
        (readPositiveIntEnv('AMIND_DEV_SEED_NODE_COUNT', 0)
            ? readPositiveIntEnv('AMIND_DEV_SEED_NODE_COUNT', 0) + 1
            : 0);
    const envTotalImageCount = normalizePositiveInt(process.env.AMIND_DEV_SEED_IMAGE_COUNT, 0);
    if (envTotalNodeCount <= 0 && envTotalImageCount <= 0) return null;
    return {
        totalNodeCount: envTotalNodeCount,
        totalImageCount: envTotalImageCount,
    };
}

function createSeedNodeText(index) {
    const a = SEED_WORDS[index % SEED_WORDS.length];
    const b = SEED_WORDS[(index * 5 + 3) % SEED_WORDS.length];
    const c = SEED_WORDS[(index * 7 + 1) % SEED_WORDS.length];
    const d = SEED_WORDS[(index * 11 + 2) % SEED_WORDS.length];
    const repeatCount = 3 + (index % 6);
    const repeated = Array.from({ length: repeatCount }, (_, offset) => {
        return SEED_WORDS[(index + offset * 2) % SEED_WORDS.length];
    }).join(' ');

    switch (index % 8) {
        case 0:
            return '';
        case 1:
            return a.slice(0, 1).toUpperCase();
        case 2:
            return `Seed ${index + 1} ${a}`;
        case 3:
            return `Seed ${index + 1} ${a} ${b} ${repeated}`;
        case 4:
            return `Seed ${index + 1}\n${a} ${b}\n${c}`;
        case 5:
            return `${a} ${b}\n${repeated}\n${c} ${d}\n${repeated}`;
        case 6:
            return `Seed ${index + 1} ${a} ${b} ${c} ${d} ${repeated} ${repeated}`;
        default:
            return `${a}\n${b}\n${c}\n${d}\n${repeated}\n${repeated}`;
    }
}

function getSeedBranchCount(levelIndex) {
    return 2 + (levelIndex % 4);
}

function countTreeEdges(nodes) {
    let totalEdges = 0;
    for (const node of Object.values(nodes)) {
        totalEdges += Array.isArray(node.children) ? node.children.length : 0;
    }
    return totalEdges;
}

function countNodesWithImages(nodes) {
    let totalImages = 0;
    for (const node of Object.values(nodes)) {
        if (node?.image?.src) totalImages += 1;
    }
    return totalImages;
}

function createSeededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state += 0x6D2B79F5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffleInPlace(list, nextRandom) {
    for (let index = list.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(nextRandom() * (index + 1));
        [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
    }
    return list;
}

function createSeedImage(index) {
    const naturalWidth = 480;
    const naturalHeight = 320;
    const width = 320;
    const height = Math.round(naturalHeight * (width / naturalWidth));
    const bg = SEED_IMAGE_COLORS[index % SEED_IMAGE_COLORS.length];
    const accent = SEED_IMAGE_COLORS[(index * 3 + 2) % SEED_IMAGE_COLORS.length];
    const accentAlt = SEED_IMAGE_COLORS[(index * 5 + 5) % SEED_IMAGE_COLORS.length];
    const shapeX = 36 + (index * 29) % 220;
    const shapeY = 34 + (index * 17) % 130;
    const shapeR = 46 + (index * 7) % 40;
    const stripeWidth = 140 + (index * 19) % 170;
    const label = `IMG ${String(index + 1).padStart(3, '0')}`;
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${naturalWidth}" height="${naturalHeight}" viewBox="0 0 ${naturalWidth} ${naturalHeight}">
  <rect width="${naturalWidth}" height="${naturalHeight}" rx="28" fill="${bg}"/>
  <circle cx="${shapeX}" cy="${shapeY}" r="${shapeR}" fill="${accent}" opacity="0.86"/>
  <circle cx="${naturalWidth - 88}" cy="${naturalHeight - 72}" r="${26 + (index % 24)}" fill="${accentAlt}" opacity="0.72"/>
  <rect x="38" y="42" width="${stripeWidth}" height="62" rx="18" fill="rgba(255,255,255,0.22)"/>
  <rect x="38" y="138" width="${naturalWidth - 76}" height="26" rx="13" fill="rgba(255,255,255,0.82)"/>
  <rect x="38" y="180" width="${naturalWidth - 132}" height="20" rx="10" fill="rgba(255,255,255,0.56)"/>
  <rect x="38" y="214" width="${naturalWidth - 178}" height="20" rx="10" fill="rgba(255,255,255,0.42)"/>
  <text x="38" y="98" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${label}</text>
</svg>`.trim();
    return {
        src: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        mime: 'image/svg+xml',
        width,
        height,
        naturalWidth,
        naturalHeight,
    };
}

function appendDevSeedImages(board, rootId, totalImageCount) {
    const imageCount = normalizePositiveInt(totalImageCount, 0);
    if (imageCount <= 0) return;
    const candidateNodeIds = Object.keys(board.nodes).filter((nodeId) => nodeId !== rootId);
    if (!candidateNodeIds.length) return;

    const nextRandom = createSeededRandom(candidateNodeIds.length * 17 + imageCount * 31);
    shuffleInPlace(candidateNodeIds, nextRandom);
    const appliedCount = Math.min(imageCount, candidateNodeIds.length);
    for (let index = 0; index < appliedCount; index += 1) {
        const nodeId = candidateNodeIds[index];
        const node = board.nodes[nodeId];
        if (!node) continue;
        node.image = createSeedImage(index);
    }
}

function appendDevSeedNodes(board, rootId, seedOptions = {}) {
    const seedConfig = resolveSeedConfig(seedOptions);
    const totalNodeCount = Math.max(1, seedConfig?.totalNodeCount ?? 0);
    const seedCount = Math.max(0, totalNodeCount - 1);
    if (seedCount <= 0) {
        if (seedConfig?.totalImageCount) appendDevSeedImages(board, rootId, seedConfig.totalImageCount);
        return;
    }

    const queue = [rootId];
    let parentCursor = 0;
    let created = 0;

    while (created < seedCount && parentCursor < queue.length) {
        const parentId = queue[parentCursor];
        parentCursor += 1;

        const parentNode = board.nodes[parentId];
        if (!parentNode) continue;
        parentNode.children = Array.isArray(parentNode.children) ? parentNode.children : [];

        const branchCount = Math.min(getSeedBranchCount(parentCursor - 1), seedCount - created);
        for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
            const childId = `seed-${created + 1}-${randomUUID().slice(0, 8)}`;
            board.nodes[childId] = {
                id: childId,
                text: createSeedNodeText(created),
                children: [],
                images: [],
            };
            parentNode.children.push(childId);
            queue.push(childId);
            created += 1;
        }
    }

    if (seedConfig?.totalImageCount) {
        appendDevSeedImages(board, rootId, seedConfig.totalImageCount);
    }
}

function createEmptyMindBoard(title, { id, seedConfig, seedNodeCount } = {}) {
    const rootId = 'root';
    const board = {
        id,
        title,
        roots: [
            {
                rootId,
                pos: { x: 200, y: 140 },
                layout: {
                    direction: 'right',
                    hGap: 60,
                    vGap: 18,
                },
            },
        ],
        nodes: {
            [rootId]: { id: rootId, text: title, children: [], images: [] },
        },
        view: {
            viewport: {},
        },
    };

    appendDevSeedNodes(board, rootId, { seedConfig, seedNodeCount });
    return board;
}

export function createEmptyDoc(title = '思维导图', options = {}) {
    const now = new Date().toISOString();
    const resolvedSeedConfig = resolveSeedConfig(options);
    const boardDefinitions = [
        { id: 'mind-1', title, seedConfig: resolvedSeedConfig },
        { id: 'mind-2', title: '画板 2', seedNodeCount: 0 },
        { id: 'mind-3', title: '画板 3', seedNodeCount: 0 },
    ];
    const minds = Object.fromEntries(
        boardDefinitions.map((definition) => [
            definition.id,
            createEmptyMindBoard(definition.title, definition),
        ])
    );
    const doc = {
        manifest: {
            schemaVersion: AMIND_SCHEMA_VERSION,
            app: 'AsyncTest Mind',
            createdAt: now,
            updatedAt: now,
            title,
        },

        mind: {
            version: 1,
            activeMindId: 'mind-1',
            order: boardDefinitions.map((definition) => definition.id),
            minds,
        },
    };
    const firstBoard = minds['mind-1'];

    if (resolvedSeedConfig) {
        console.info('[amind-seed]', {
            enabled: true,
            requestedTotalNodeCount: resolvedSeedConfig.totalNodeCount,
            requestedTotalImageCount: resolvedSeedConfig.totalImageCount,
            seededNodeCount: Object.keys(firstBoard.nodes).length,
            seededImageCount: countNodesWithImages(firstBoard.nodes),
            rootChildrenCount: firstBoard.nodes.root?.children?.length ?? 0,
            totalEdges: countTreeEdges(firstBoard.nodes),
        });
    }

    return doc;
}

function validateMindBoard(board, boardId) {
    if (!board || typeof board !== 'object') {
        throw new Error(`Invalid .amind doc: missing board ${boardId}`);
    }
    if (!board.nodes || typeof board.nodes !== 'object') {
        throw new Error(`Invalid .amind doc: missing board nodes for ${boardId}`);
    }
    if (!Array.isArray(board.roots) || !board.roots.length) {
        throw new Error(`Invalid .amind doc: missing board roots for ${boardId}`);
    }
    board.view = board.view || {};
    board.view.viewport = board.view.viewport || {};
}

export function validateDoc(doc) {
    if (!doc?.manifest) throw new Error('Invalid .amind doc: missing manifest');
    if (doc.manifest.schemaVersion !== AMIND_SCHEMA_VERSION) {
        throw new Error(`Unsupported schemaVersion: ${doc.manifest.schemaVersion}`);
    }
    if (!doc?.mind || typeof doc.mind !== 'object') throw new Error('Invalid .amind doc: missing mind');
    if (!doc.mind.minds || typeof doc.mind.minds !== 'object') throw new Error('Invalid .amind doc: missing mind.minds');
    if (!Array.isArray(doc.mind.order) || !doc.mind.order.length) throw new Error('Invalid .amind doc: missing mind.order');
    if (typeof doc.mind.activeMindId !== 'string' || !doc.mind.activeMindId) {
        throw new Error('Invalid .amind doc: missing mind.activeMindId');
    }
    if (!doc.mind.minds[doc.mind.activeMindId]) {
        throw new Error(`Invalid .amind doc: active mind not found: ${doc.mind.activeMindId}`);
    }
    for (const boardId of doc.mind.order) {
        validateMindBoard(doc.mind.minds[boardId], boardId);
    }
}

async function buildAssetIndexFromZip(zip) {
    // 只做“文件名索引”，不读取 bytes
    const set = new Set();
    for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        if (!name.startsWith('assets/')) continue;
        // name like assets/<assetId>.<ext>
        const base = name.slice('assets/'.length);
        set.add(base);
    }
    return set;
}

export async function readAmindFile(filePath) {
    const abs = path.resolve(filePath);
    const buf = await fs.readFile(abs);
    return await readAmindBuffer(buf, abs);
}

export async function readAmindBuffer(buffer, sourcePath = AMIND_EXT) {
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const zip = await JSZip.loadAsync(buf);

    const manifestRaw = await zip.file('manifest.json')?.async('string');
    const mindRaw = await zip.file('mind.json')?.async('string');
    if (!manifestRaw || !mindRaw) throw new Error('Invalid .amind: missing manifest.json or mind.json');

    const doc = { manifest: JSON.parse(manifestRaw), mind: JSON.parse(mindRaw) };
    validateDoc(doc);

    const assetIndex = await buildAssetIndexFromZip(zip);

    return { path: path.resolve(sourcePath), doc, assetIndex };
}

export async function readAmindAsset(filePath, { assetId, ext }) {
    const abs = path.resolve(filePath);
    const buf = await fs.readFile(abs);
    const zip = await JSZip.loadAsync(buf);
    const entry = zip.file(`assets/${assetId}.${ext}`);
    if (!entry) throw new Error(`Asset not found: assets/${assetId}.${ext}`);
    return await entry.async('uint8array');
}

/**
 * Patched 写入（不会丢旧 assets）：
 * - 如果文件已存在：把旧 zip 里的条目复制到新 zip
 * - 再覆盖写入 manifest.json、mind.json、以及 assetsToWrite（同名会覆盖旧的）
 *
 * @param filePath 目标���径
 * @param doc {manifest, mind}
 * @param assetsToWrite [{assetId, ext, bytes}]
 */
export async function buildAmindBuffer(filePath, doc, { assetsToWrite = [] } = {}) {
    validateDoc(doc);

    const abs = path.resolve(ensureAmindExt(filePath));
    const now = new Date().toISOString();
    const manifest = { ...doc.manifest, updatedAt: now };

    const zip = new JSZip();

    // 1) 复制旧 zip 的所有条目（保留旧 assets、以及未来可能有的其它文件）
    let oldZip = null;
    try {
        const oldBuf = await fs.readFile(abs);
        oldZip = await JSZip.loadAsync(oldBuf);
    } catch {
        // 新文件，忽略
    }

    if (oldZip) {
        for (const [name, entry] of Object.entries(oldZip.files)) {
            if (entry.dir) continue;

            // 这两个文件我们会覆盖写入新的
            if (name === 'manifest.json' || name === 'mind.json') continue;

            // 原样复制（STORE）
            const bytes = await entry.async('uint8array');
            zip.file(name, bytes, { compression: 'STORE' });
        }
    }

    // 2) 覆盖写入新的 manifest/mind（DEFLATE）
    zip.file('manifest.json', JSON.stringify(manifest, null, 2), { compression: 'DEFLATE' });
    zip.file('mind.json', JSON.stringify(doc.mind, null, 2), { compression: 'DEFLATE' });

    // 3) 覆盖写入 dirty assets（STORE）
    for (const a of assetsToWrite) {
        zip.file(`assets/${a.assetId}.${a.ext}`, a.bytes, { compression: 'STORE' });
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { path: abs, buffer, doc: { ...doc, manifest } };
}

export async function writeAmindFile(filePath, doc, { assetsToWrite = [] } = {}) {
    const result = await buildAmindBuffer(filePath, doc, { assetsToWrite });
    await fs.writeFile(result.path, result.buffer);
    return { path: result.path, doc: result.doc };
}
