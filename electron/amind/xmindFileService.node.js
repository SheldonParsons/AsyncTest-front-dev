import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { AMIND_SCHEMA_VERSION } from './constants.js';
import { guessMimeFromPath } from '../shared/assetService.node.js';

const XMIND_EXT = '.xmind';
const DEFAULT_ROOT_POS = { x: 200, y: 140 };
const DEFAULT_LAYOUT = { direction: 'right', hGap: 60, vGap: 18 };
const EMPTY_THUMBNAIL_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aW1QAAAAASUVORK5CYII=';
const DEFAULT_THEME_COLOR_LIST = '#FF6B6B #FF9F69 #97D3B6 #88E2D7 #6FD0F9 #E18BEE';

function ensureXmindExt(filePath) {
    return filePath.toLowerCase().endsWith(XMIND_EXT) ? filePath : `${filePath}${XMIND_EXT}`;
}

function createBaseManifest(title) {
    const now = new Date().toISOString();
    return {
        schemaVersion: AMIND_SCHEMA_VERSION,
        app: 'AsyncTest Mind',
        createdAt: now,
        updatedAt: now,
        title,
    };
}

function sanitizeTitle(value, fallback = '主题') {
    const title = typeof value === 'string' ? value.trim() : '';
    return title || fallback;
}

function cloneJson(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
}

function createThemeSection(properties) {
    return {
        id: randomUUID(),
        properties,
    };
}

function buildDefaultXmindTheme() {
    return {
        map: createThemeSection({
            'svg:fill': '#ffffff',
            'multi-line-colors': DEFAULT_THEME_COLOR_LIST,
            'color-list': DEFAULT_THEME_COLOR_LIST,
            'line-tapered': 'none',
        }),
        centralTopic: createThemeSection({
            'fo:font-family': 'NeverMind',
            'fo:font-size': '30pt',
            'fo:font-weight': '800',
            'fo:font-style': 'normal',
            'fo:color': 'inherited',
            'fo:text-transform': 'manual',
            'fo:text-decoration': 'none',
            'fo:text-align': 'center',
            'svg:fill': '#000000',
            'fill-pattern': 'none',
            'line-width': '2pt',
            'line-color': '#ADADAD',
            'line-pattern': 'solid',
            'border-line-color': '#000000',
            'border-line-width': '0pt',
            'border-line-pattern': 'inherited',
            'shape-class': 'org.xmind.topicShape.roundedRect',
            'line-class': 'org.xmind.branchConnection.curve',
            'arrow-end-class': 'org.xmind.arrowShape.none',
            'alignment-by-level': 'inherited',
        }),
        mainTopic: createThemeSection({
            'fo:font-family': 'NeverMind',
            'fo:font-size': '18pt',
            'fo:font-weight': '500',
            'fo:font-style': 'normal',
            'fo:color': 'inherited',
            'fo:text-transform': 'manual',
            'fo:text-decoration': 'none',
            'fo:text-align': 'left',
            'svg:fill': 'inherited',
            'fill-pattern': 'solid',
            'line-width': '2pt',
            'line-color': 'inherited',
            'line-pattern': 'inherited',
            'border-line-color': 'inherited',
            'border-line-width': '0pt',
            'border-line-pattern': 'inherited',
            'shape-class': 'org.xmind.topicShape.roundedRect',
            'line-class': 'org.xmind.branchConnection.roundedElbow',
            'arrow-end-class': 'inherited',
            'alignment-by-level': 'inherited',
        }),
        subTopic: createThemeSection({
            'fo:font-family': 'NeverMind',
            'fo:font-size': '14pt',
            'fo:font-weight': '400',
            'fo:font-style': 'normal',
            'fo:color': 'inherited',
            'fo:text-transform': 'manual',
            'fo:text-decoration': 'none',
            'fo:text-align': 'left',
            'svg:fill': 'inherited',
            'fill-pattern': 'none',
            'line-width': '2pt',
            'line-color': 'inherited',
            'line-pattern': 'inherited',
            'border-line-color': 'inherited',
            'border-line-width': '0pt',
            'border-line-pattern': 'inherited',
            'shape-class': 'org.xmind.topicShape.roundedRect',
            'line-class': 'org.xmind.branchConnection.roundedElbow',
            'arrow-end-class': 'inherited',
            'alignment-by-level': 'inherited',
        }),
        floatingTopic: createThemeSection({
            'fo:font-family': 'NeverMind',
            'fo:font-size': '14pt',
            'fo:font-weight': '500',
            'fo:font-style': 'normal',
            'fo:color': 'inherited',
            'fo:text-transform': 'manual',
            'fo:text-decoration': 'none',
            'fo:text-align': 'left',
            'svg:fill': '#EEEBEE',
            'fill-pattern': 'solid',
            'line-width': '2pt',
            'line-color': 'inherited',
            'line-pattern': 'solid',
            'border-line-color': '#EEEBEE',
            'border-line-width': '0pt',
            'border-line-pattern': 'inherited',
            'shape-class': 'org.xmind.topicShape.roundedRect',
            'line-class': 'org.xmind.branchConnection.roundedElbow',
            'arrow-end-class': 'org.xmind.arrowShape.none',
            'alignment-by-level': 'inherited',
        }),
        summaryTopic: createThemeSection({
            'fo:font-family': 'NeverMind',
            'fo:font-size': '14pt',
            'fo:font-weight': '400',
            'fo:font-style': 'normal',
            'fo:color': 'inherited',
            'fo:text-transform': 'manual',
            'fo:text-decoration': 'none',
            'fo:text-align': 'left',
            'svg:fill': '#000000',
            'fill-pattern': 'none',
            'line-width': 'inherited',
            'line-color': 'inherited',
            'line-pattern': 'inherited',
            'border-line-color': '#000000',
            'border-line-width': 'inherited',
            'border-line-pattern': 'inherited',
            'shape-class': 'org.xmind.topicShape.roundedRect',
            'line-class': 'org.xmind.branchConnection.roundedElbow',
            'arrow-end-class': 'inherited',
            'alignment-by-level': 'inherited',
        }),
        calloutTopic: createThemeSection({
            'fo:font-family': 'NeverMind',
            'fo:font-size': '14pt',
            'fo:font-weight': '400',
            'fo:font-style': 'normal',
            'fo:color': 'inherited',
            'fo:text-transform': 'manual',
            'fo:text-decoration': 'none',
            'fo:text-align': 'left',
            'svg:fill': '#000000',
            'fill-pattern': 'solid',
            'line-width': 'inherited',
            'line-color': 'inherited',
            'line-pattern': 'inherited',
            'border-line-color': '#000000',
            'border-line-width': 'inherited',
            'border-line-pattern': 'inherited',
            'shape-class': 'org.xmind.topicShape.roundedRect',
            'line-class': 'org.xmind.branchConnection.roundedElbow',
            'arrow-end-class': 'inherited',
            'alignment-by-level': 'inherited',
        }),
        importantTopic: createThemeSection({
            'fo:font-weight': 'bold',
            'svg:fill': '#7F00AC',
            'fill-pattern': 'solid',
            'border-line-color': '#7F00AC',
            'border-line-width': '0',
        }),
        minorTopic: createThemeSection({
            'fo:font-weight': 'bold',
            'svg:fill': '#82004A',
            'fill-pattern': 'solid',
            'border-line-color': '#82004A',
            'border-line-width': '0',
        }),
        expiredTopic: createThemeSection({
            'fo:text-decoration': 'line-through',
            'fill-pattern': 'none',
        }),
        boundary: createThemeSection({
            'fo:font-family': 'NeverMind',
            'fo:font-size': '14pt',
            'fo:font-weight': '400',
            'fo:font-style': 'normal',
            'fo:color': 'inherited',
            'fo:text-transform': 'manual',
            'fo:text-decoration': 'none',
            'fo:text-align': 'center',
            'svg:fill': '#9B9B9B',
            'fill-pattern': 'solid',
            'line-width': '2',
            'line-color': '#00000066',
            'line-pattern': 'dash',
            'shape-class': 'org.xmind.boundaryShape.roundedRect',
        }),
        summary: createThemeSection({
            'line-width': '2pt',
            'line-color': '#000000',
            'line-pattern': 'solid',
            'shape-class': 'org.xmind.summaryShape.round',
        }),
        relationship: createThemeSection({
            'fo:font-family': 'NeverMind',
            'fo:font-size': '13pt',
            'fo:font-weight': '400',
            'fo:font-style': 'normal',
            'fo:color': 'inherited',
            'fo:text-transform': 'manual',
            'fo:text-decoration': 'none',
            'fo:text-align': 'center',
            'line-width': '2',
            'line-color': '#00000066',
            'line-pattern': 'dash',
            'shape-class': 'org.xmind.relationshipShape.curved',
            'arrow-begin-class': 'org.xmind.arrowShape.none',
            'arrow-end-class': 'org.xmind.arrowShape.triangle',
        }),
        level3: createThemeSection({
            'fo:font-family': 'NeverMind',
            'fo:font-size': '14pt',
            'fo:font-weight': '400',
            'fo:font-style': 'normal',
            'fo:text-transform': 'manual',
            'fo:text-decoration': 'none',
            'fo:text-align': 'left',
            'fill-pattern': 'solid',
            'line-width': '2pt',
            'line-pattern': 'inherited',
            'border-line-width': '0pt',
            'border-line-pattern': 'inherited',
            'shape-class': 'org.xmind.topicShape.roundedRect',
            'line-class': 'org.xmind.branchConnection.roundedElbow',
            'arrow-end-class': 'inherited',
            'alignment-by-level': 'inherited',
        }),
        skeletonThemeId: randomUUID(),
        colorThemeId: 'Dawn-#ffffff-MULTI_LINE_COLORS',
    };
}

function createNodeFromTopic(topic, fallbackTitle = '主题') {
    const title = sanitizeTitle(topic?.title, fallbackTitle);
    const richText = createRichTextFromXmindTopic(topic, title);
    return {
        id: typeof topic?.id === 'string' && topic.id ? topic.id : `topic-${randomUUID()}`,
        text: { plain: title },
        richText,
        children: [],
        images: [],
        image: null,
    };
}

function mapXmindMarkerIdToAmind(markerId) {
    if (typeof markerId !== 'string') return null;
    const priorityMatch = markerId.match(/^priority-(\d+)$/);
    if (priorityMatch) {
        const level = Number(priorityMatch[1]);
        if (level >= 1 && level <= 7) return `level:level${level}`;
    }
    if (markerId === 'task-done') return 'task:100';
    if (markerId === 'symbol-idea') return 'other:lightbulb';
    if (markerId === 'symbol-exclam') return 'other:error';
    return null;
}

function mapAmindMarkerKeyToXmind(markerKey) {
    if (typeof markerKey !== 'string') return null;
    const levelMatch = markerKey.match(/^level:level(\d)$/);
    if (levelMatch) {
        const level = Number(levelMatch[1]);
        if (level >= 1 && level <= 7) return `priority-${level}`;
    }
    if (markerKey === 'task:100') return 'task-done';
    if (markerKey === 'other:lightbulb') return 'symbol-idea';
    if (markerKey === 'other:error') return 'symbol-exclam';
    return null;
}

function applyXmindMarkersToNode(topic, node) {
    const markerRefs = Array.isArray(topic?.markers) ? topic.markers : Array.isArray(topic?.markerRefs) ? topic.markerRefs : [];
    const markers = markerRefs
        .map((item) => mapXmindMarkerIdToAmind(item?.markerId))
        .filter(Boolean);
    if (markers.length) {
        node.markers = Array.from(new Set(markers));
    }
}

function getTopicChildren(topic) {
    const attached = topic?.children?.attached;
    return Array.isArray(attached) ? attached : [];
}

function createMarksFromXmindStyle(styleProperties = {}, inline = {}) {
    const textDecoration = [
        styleProperties['fo:text-decoration'],
        inline['fo:text-decoration'],
    ]
        .filter((value) => typeof value === 'string' && value)
        .join(' ');
    const fontWeight = inline['fo:font-weight'] ?? styleProperties['fo:font-weight'];
    const fontStyle = inline['fo:font-style'] ?? styleProperties['fo:font-style'];
    const marks = {};
    if (Number.parseInt(String(fontWeight ?? ''), 10) >= 700 || String(fontWeight).toLowerCase() === 'bold') {
        marks.bold = true;
    }
    if (String(fontStyle ?? '').toLowerCase() === 'italic') {
        marks.italic = true;
    }
    if (textDecoration.includes('underline')) {
        marks.underline = true;
    }
    if (textDecoration.includes('line-through')) {
        marks.strike = true;
    }
    return Object.keys(marks).length ? marks : undefined;
}

function createRichTextFromXmindTopic(topic, fallbackTitle) {
    const attributedTitle = Array.isArray(topic?.attributedTitle) ? topic.attributedTitle : [];
    const styleProperties = topic?.style?.properties && typeof topic.style.properties === 'object'
        ? topic.style.properties
        : {};
    if (attributedTitle.length) {
        return {
            blocks: [
                {
                    align: 'left',
                    inlines: attributedTitle.map((segment) => ({
                        text: typeof segment?.text === 'string' ? segment.text : '',
                        marks: createMarksFromXmindStyle(styleProperties, segment),
                    })),
                },
            ],
        };
    }
    const marks = createMarksFromXmindStyle(styleProperties);
    return {
        blocks: [
            {
                align: 'left',
                inlines: [
                    {
                        text: sanitizeTitle(topic?.title, fallbackTitle),
                        marks,
                    },
                ],
            },
        ],
    };
}

function parsePngDimensions(bytes) {
    if (bytes.length < 24) return null;
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let index = 0; index < signature.length; index += 1) {
        if (bytes[index] !== signature[index]) return null;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
        width: view.getUint32(16),
        height: view.getUint32(20),
    };
}

function parseGifDimensions(bytes) {
    if (bytes.length < 10) return null;
    const header = String.fromCharCode(...bytes.slice(0, 6));
    if (header !== 'GIF87a' && header !== 'GIF89a') return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
        width: view.getUint16(6, true),
        height: view.getUint16(8, true),
    };
}

function parseJpegDimensions(bytes) {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    let offset = 2;
    while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) {
            offset += 1;
            continue;
        }
        const marker = bytes[offset + 1];
        const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (length < 2) return null;
        const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
        if (isStartOfFrame && offset + 8 < bytes.length) {
            return {
                height: (bytes[offset + 5] << 8) | bytes[offset + 6],
                width: (bytes[offset + 7] << 8) | bytes[offset + 8],
            };
        }
        offset += 2 + length;
    }
    return null;
}

function getImageDimensions(bytes, mime) {
    if (mime === 'image/png') return parsePngDimensions(bytes);
    if (mime === 'image/gif') return parseGifDimensions(bytes);
    if (mime === 'image/jpeg') return parseJpegDimensions(bytes);
    return null;
}

function toDataUrl(bytes, mime) {
    return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

function normalizeResourcePath(src) {
    if (typeof src !== 'string' || !src) return null;
    if (src.startsWith('xap:')) return src.slice('xap:'.length);
    return src;
}

function createNodeImageFromXmindTopic(topic, resourceBytesMap) {
    const resourcePath = normalizeResourcePath(topic?.image?.src);
    if (!resourcePath) return null;
    const bytes = resourceBytesMap.get(resourcePath);
    if (!bytes?.length) return null;
    const mime = guessMimeFromPath(resourcePath) || 'application/octet-stream';
    const dimensions = getImageDimensions(bytes, mime);
    const naturalWidth = Math.max(1, dimensions?.width ?? 320);
    const naturalHeight = Math.max(1, dimensions?.height ?? 180);
    const initialWidth = Math.min(naturalWidth, 320);
    const initialHeight = naturalWidth > 0 ? Math.max(1, Math.round(naturalHeight * (initialWidth / naturalWidth))) : naturalHeight;
    return {
        src: toDataUrl(bytes, mime),
        mime,
        width: initialWidth,
        height: initialHeight,
        naturalWidth,
        naturalHeight,
    };
}

function buildBoardFromSheet(sheet, boardIndex, resourceBytesMap) {
    const rootTopic = sheet?.rootTopic;
    if (!rootTopic || typeof rootTopic !== 'object') {
        throw new Error(`Invalid XMind sheet at index ${boardIndex}: missing rootTopic`);
    }
    const boardId = `mind-${boardIndex + 1}-${randomUUID().slice(0, 8)}`;
    const rootNode = createNodeFromTopic(rootTopic, `画板 ${boardIndex + 1}`);
    applyXmindMarkersToNode(rootTopic, rootNode);
    rootNode.image = createNodeImageFromXmindTopic(rootTopic, resourceBytesMap);
    const nodes = { [rootNode.id]: rootNode };
    const queue = [{ topic: rootTopic, nodeId: rootNode.id }];

    while (queue.length) {
        const current = queue.shift();
        const currentNode = nodes[current.nodeId];
        if (!currentNode) continue;
        const children = getTopicChildren(current.topic);
        currentNode.children = [];
        for (const childTopic of children) {
            const childNode = createNodeFromTopic(childTopic);
            applyXmindMarkersToNode(childTopic, childNode);
            childNode.image = createNodeImageFromXmindTopic(childTopic, resourceBytesMap);
            nodes[childNode.id] = childNode;
            currentNode.children.push(childNode.id);
            queue.push({ topic: childTopic, nodeId: childNode.id });
        }
    }

    return {
        id: boardId,
        title: sanitizeTitle(sheet?.title, sanitizeTitle(rootTopic?.title, `画板 ${boardIndex + 1}`)),
        roots: [
            {
                rootId: rootNode.id,
                pos: { ...DEFAULT_ROOT_POS },
                layout: { ...DEFAULT_LAYOUT },
            },
        ],
        nodes,
        view: {
            viewport: {},
        },
        xmindMeta: {
            sheetId: typeof sheet?.id === 'string' && sheet.id ? sheet.id : null,
            revisionId: typeof sheet?.revisionId === 'string' && sheet.revisionId ? sheet.revisionId : null,
            topicOverlapping: sheet?.topicOverlapping,
            arrangeableLayerOrder: Array.isArray(sheet?.arrangeableLayerOrder) ? [...sheet.arrangeableLayerOrder] : null,
            zones: Array.isArray(sheet?.zones) ? cloneJson(sheet.zones) : null,
            extensions: Array.isArray(sheet?.extensions) ? cloneJson(sheet.extensions) : null,
            theme: sheet?.theme && typeof sheet.theme === 'object' ? cloneJson(sheet.theme) : null,
            rootStructureClass: typeof rootTopic?.structureClass === 'string' ? rootTopic.structureClass : null,
        },
    };
}

function extractNodePlainText(node, fallback = '主题') {
    if (!node || typeof node !== 'object') return fallback;
    if (typeof node.title === 'string' && node.title.trim()) return node.title.trim();
    if (typeof node.text === 'string' && node.text.trim()) return node.text.trim();
    if (node.text && typeof node.text === 'object' && typeof node.text.plain === 'string' && node.text.plain.trim()) {
        return node.text.plain.trim();
    }
    if (typeof node.textPlain === 'string' && node.textPlain.trim()) return node.textPlain.trim();
    return fallback;
}

function normalizeNodeRichText(node, fallbackTitle = '主题') {
    const richText = node?.richText;
    if (richText?.blocks?.length) return richText;
    return {
        blocks: [
            {
                align: 'left',
                inlines: [
                    {
                        text: extractNodePlainText(node, fallbackTitle),
                    },
                ],
            },
        ],
    };
}

function marksToXmindInline(inline) {
    const payload = {
        text: inline?.text ?? '',
    };
    const marks = inline?.marks;
    if (marks?.bold) payload['fo:font-weight'] = '700';
    if (marks?.italic) payload['fo:font-style'] = 'italic';
    const decorations = [];
    if (marks?.strike) decorations.push('line-through');
    if (marks?.underline) decorations.push('underline');
    if (decorations.length) payload['fo:text-decoration'] = decorations.join(' ');
    return payload;
}

function buildXmindTextPayload(node, fallbackTitle = '主题') {
    const richText = normalizeNodeRichText(node, fallbackTitle);
    const flattened = [];
    richText.blocks.forEach((block, blockIndex) => {
        const inlines = Array.isArray(block?.inlines) && block.inlines.length ? block.inlines : [{ text: '' }];
        inlines.forEach((inline) => {
            flattened.push(marksToXmindInline(inline));
        });
        if (blockIndex < richText.blocks.length - 1) {
            flattened.push({ text: '\n' });
        }
    });
    const title = flattened.map((segment) => segment.text ?? '').join('');
    const hasMarks = flattened.some((segment) =>
        segment['fo:font-weight'] || segment['fo:font-style'] || segment['fo:text-decoration']
    );
    if (!hasMarks) {
        return { title: title || fallbackTitle };
    }
    const nonEmptySegments = flattened.filter((segment) => segment.text !== '');
    const styleSegments = nonEmptySegments.length ? nonEmptySegments : [{ text: title || fallbackTitle }];
    const uniqueDecoration = new Set(styleSegments.map((segment) => segment['fo:text-decoration'] ?? '').filter(Boolean));
    const uniqueWeight = new Set(styleSegments.map((segment) => segment['fo:font-weight'] ?? '').filter(Boolean));
    const uniqueStyle = new Set(styleSegments.map((segment) => segment['fo:font-style'] ?? '').filter(Boolean));
    const topicStyle = {};
    if (uniqueDecoration.size === 1 && styleSegments.every((segment) => segment['fo:text-decoration'] === [...uniqueDecoration][0])) {
        topicStyle['fo:text-decoration'] = [...uniqueDecoration][0];
    }
    if (uniqueWeight.size === 1 && styleSegments.every((segment) => segment['fo:font-weight'] === [...uniqueWeight][0])) {
        topicStyle['fo:font-weight'] = [...uniqueWeight][0];
    }
    if (uniqueStyle.size === 1 && styleSegments.every((segment) => segment['fo:font-style'] === [...uniqueStyle][0])) {
        topicStyle['fo:font-style'] = [...uniqueStyle][0];
    }
    const hasUniformMarks =
        styleSegments.every((segment) => {
            const decoration = segment['fo:text-decoration'] ?? '';
            const weight = segment['fo:font-weight'] ?? '';
            const style = segment['fo:font-style'] ?? '';
            return (
                decoration === (topicStyle['fo:text-decoration'] ?? '') &&
                weight === (topicStyle['fo:font-weight'] ?? '') &&
                style === (topicStyle['fo:font-style'] ?? '')
            );
        });
    if (hasUniformMarks && Object.keys(topicStyle).length) {
        return {
            title: title || fallbackTitle,
            style: {
                id: randomUUID(),
                properties: topicStyle,
            },
        };
    }
    return {
        title: title || fallbackTitle,
        attributedTitle: flattened,
        style: Object.keys(topicStyle).length
            ? {
                id: randomUUID(),
                properties: topicStyle,
            }
            : undefined,
    };
}

function parseDataUrl(src) {
    if (typeof src !== 'string') return null;
    const match = src.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/);
    if (!match) return null;
    return {
        mime: match[1] || 'application/octet-stream',
        bytes: Buffer.from(match[2], 'base64'),
    };
}

function mimeToExtension(mime) {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/gif') return 'gif';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/svg+xml') return 'svg';
    return 'bin';
}

function attachNodeImageToTopic(topic, node, resourceEntries) {
    const imageSrc = typeof node?.image?.src === 'string' ? node.image.src : '';
    const parsed = parseDataUrl(imageSrc);
    if (!parsed?.bytes?.length) return;
    const extension = mimeToExtension(parsed.mime);
    const fileName = `${randomUUID().replace(/-/g, '')}.${extension}`;
    const resourcePath = `resources/${fileName}`;
    resourceEntries.push({ path: resourcePath, bytes: parsed.bytes });
    topic.image = {
        src: `xap:${resourcePath}`,
    };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
    return typeof value === 'string' && UUID_REGEX.test(value);
}

// Convert an amind node ID (e.g. "root", "node-6a11f28b-...") to a valid XMind UUID.
// Strips the "node-" prefix when the remainder is already a UUID.
// Non-UUID IDs (e.g. "root") are replaced with a freshly generated UUID that is
// stored in nodeIdMap so the same amind ID always maps to the same XMind UUID
// within one export pass.
function toXmindTopicId(amindId, nodeIdMap) {
    if (nodeIdMap?.has(amindId)) return nodeIdMap.get(amindId);
    const stripped = typeof amindId === 'string' && amindId.startsWith('node-')
        ? amindId.slice(5)
        : amindId;
    const xmindId = isValidUuid(stripped) ? stripped : randomUUID();
    nodeIdMap?.set(amindId, xmindId);
    return xmindId;
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildTopicFromNode(nodes, nodeId, fallbackTitle = '主题', resourceEntries = [], nodeIdMap) {
    const node = nodes?.[nodeId];
    const textPayload = buildXmindTextPayload(node, fallbackTitle);
    const topic = {
        id: toXmindTopicId(nodeId, nodeIdMap),
        class: 'topic',
        title: textPayload.title,
    };
    if (textPayload.attributedTitle?.length) topic.attributedTitle = textPayload.attributedTitle;
    if (textPayload.style) topic.style = textPayload.style;
    const markerRefs = Array.isArray(node?.markers)
        ? node.markers
            .map((markerKey) => mapAmindMarkerKeyToXmind(markerKey))
            .filter(Boolean)
            .map((markerId) => ({ markerId }))
        : [];
    if (markerRefs.length) topic.markers = markerRefs;
    attachNodeImageToTopic(topic, node, resourceEntries);

    const childIds = Array.isArray(node?.children) ? node.children.filter((childId) => typeof childId === 'string' && !!nodes?.[childId]) : [];
    if (childIds.length) {
        topic.children = {
            attached: childIds.map((childId) => buildTopicFromNode(nodes, childId, '主题', resourceEntries, nodeIdMap)),
        };
    }
    return topic;
}

function buildSheetFromBoard(board, index, resourceEntries) {
    const sheetMeta = board?.xmindMeta && typeof board.xmindMeta === 'object' ? board.xmindMeta : {};
    const rootId = typeof board?.roots?.[0]?.rootId === 'string' ? board.roots[0].rootId : null;
    if (!rootId || !board?.nodes?.[rootId]) {
        throw new Error(`Cannot export board ${board?.id || index}: missing root node`);
    }
    // Shared map ensures every amind node ID maps to exactly one XMind UUID per export pass.
    const nodeIdMap = new Map();
    const rootTopic = buildTopicFromNode(board.nodes, rootId, sanitizeTitle(board?.title, '主题'), resourceEntries, nodeIdMap);
    rootTopic.structureClass = typeof sheetMeta.rootStructureClass === 'string' && sheetMeta.rootStructureClass
        ? sheetMeta.rootStructureClass
        : 'org.xmind.ui.map.clockwise';
    return {
        id: typeof sheetMeta.sheetId === 'string' && sheetMeta.sheetId ? sheetMeta.sheetId : randomUUID(),
        revisionId: typeof sheetMeta.revisionId === 'string' && sheetMeta.revisionId ? sheetMeta.revisionId : randomUUID(),
        class: 'sheet',
        title: sanitizeTitle(board?.title, `画板 ${index + 1}`),
        rootTopic,
        topicOverlapping: typeof sheetMeta.topicOverlapping === 'string' && sheetMeta.topicOverlapping ? sheetMeta.topicOverlapping : 'overlap',
        arrangeableLayerOrder: Array.isArray(sheetMeta.arrangeableLayerOrder) && sheetMeta.arrangeableLayerOrder.length
            ? cloneJson(sheetMeta.arrangeableLayerOrder)
            : [rootTopic.id],
        extensions: Array.isArray(sheetMeta.extensions) && sheetMeta.extensions.length
            ? cloneJson(sheetMeta.extensions)
            : [
                {
                    provider: 'org.xmind.ui.skeleton.structure.style',
                    content: {
                        centralTopic: 'org.xmind.ui.map.clockwise',
                        mainTopic: 'org.xmind.ui.logic.right',
                    },
                },
            ],
        theme: sheetMeta.theme && typeof sheetMeta.theme === 'object'
            ? cloneJson(sheetMeta.theme)
            : buildDefaultXmindTheme(),
    };
}

function buildCompatibilityContentXml(sheets) {
    const timestamp = Date.now();
    const xmlSheets = sheets.map((sheet, index) => {
        const sheetId = typeof sheet?.id === 'string' && sheet.id ? sheet.id : `sheet-${index + 1}`;
        const themeId = `theme-${randomUUID().replace(/-/g, '')}`;
        const topicId = `compat-${randomUUID().replace(/-/g, '')}`;
        const noticeId = `notice-${randomUUID().replace(/-/g, '')}`;
        const title = escapeXml(sanitizeTitle(sheet?.title, `Sheet ${index + 1}`));
        return `<sheet id="${escapeXml(sheetId)}" modified-by="AsyncTest Mind" theme="${themeId}" timestamp="${timestamp}"><topic id="${topicId}" modified-by="AsyncTest Mind" structure-class="org.xmind.ui.logic.right" timestamp="${timestamp}"><title>Compatibility Notice</title><children><topics type="attached"><topic id="${noticeId}" modified-by="AsyncTest Mind" timestamp="${timestamp}"><title>This workbook is intended for XMind apps that support content.json.</title></topic></topics></children></topic><title>${title}</title></sheet>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?><xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink" modified-by="AsyncTest Mind" timestamp="${timestamp}" version="2.0">${xmlSheets}</xmap-content>`;
}

export async function readXmindWorkbook(filePath) {
    const abs = path.resolve(filePath);
    const buf = await fs.readFile(abs);
    const zip = await JSZip.loadAsync(buf);
    const contentRaw = await zip.file('content.json')?.async('string');
    if (!contentRaw) {
        throw new Error('Invalid .xmind: missing content.json');
    }
    const workbook = JSON.parse(contentRaw);
    if (!Array.isArray(workbook) || !workbook.length) {
        throw new Error('Invalid .xmind: content.json is empty');
    }
    const resourceBytesMap = new Map();
    for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        if (!name.startsWith('resources/')) continue;
        resourceBytesMap.set(name, await entry.async('uint8array'));
    }
    return { path: abs, workbook, resourceBytesMap };
}

export function convertXmindWorkbookToAmindDoc(workbook, options = {}) {
    if (!Array.isArray(workbook) || !workbook.length) {
        throw new Error('Cannot import XMind: workbook is empty');
    }
    const resourceBytesMap = options.resourceBytesMap instanceof Map ? options.resourceBytesMap : new Map();
    const boards = workbook.map((sheet, index) => buildBoardFromSheet(sheet, index, resourceBytesMap));
    const order = boards.map((board) => board.id);
    const manifestTitle = sanitizeTitle(
        options.title,
        sanitizeTitle(boards[0]?.title, path.basename(options.sourcePath || '思维导图', XMIND_EXT))
    );
    return {
        manifest: createBaseManifest(manifestTitle),
        mind: {
            version: 1,
            activeMindId: order[0],
            order,
            minds: Object.fromEntries(boards.map((board) => [board.id, board])),
        },
    };
}

export async function readXmindAsAmindDoc(filePath) {
    const { path: abs, workbook, resourceBytesMap } = await readXmindWorkbook(filePath);
    const titleFromPath = path.basename(abs, XMIND_EXT);
    return {
        path: abs,
        doc: convertXmindWorkbookToAmindDoc(workbook, {
            title: titleFromPath,
            sourcePath: abs,
            resourceBytesMap,
        }),
    };
}

export function convertAmindDocToXmindWorkbook(doc) {
    const order = Array.isArray(doc?.mind?.order) ? doc.mind.order : [];
    const minds = doc?.mind?.minds && typeof doc.mind.minds === 'object' ? doc.mind.minds : {};
    const resourceEntries = [];
    const sheets = order
        .map((boardId) => minds?.[boardId])
        .filter(Boolean)
        .map((board, index) => buildSheetFromBoard(board, index, resourceEntries));
    if (!sheets.length) {
        throw new Error('Cannot export XMind: no boards found');
    }
    return { sheets, resourceEntries };
}

export async function writeXmindFile(filePath, doc, thumbnailBuffer = null) {
    const abs = path.resolve(ensureXmindExt(filePath));
    const { sheets, resourceEntries } = convertAmindDocToXmindWorkbook(doc);
    const zip = new JSZip();
    const thumbnailPath = 'Thumbnails/thumbnail.png';
    zip.file('content.json', JSON.stringify(sheets, null, 2), { compression: 'STORE' });
    zip.file('content.xml', buildCompatibilityContentXml(sheets), { compression: 'STORE' });
    zip.file('metadata.json', JSON.stringify({
        dataStructureVersion: '2',
        creator: {
            name: 'AsyncTest Mind',
            version: '1.0.0',
        },
        layoutEngineVersion: '4',
    }, null, 2), { compression: 'STORE' });
    zip.file('manifest.json', JSON.stringify({
        'file-entries': {
            'content.json': {},
            'metadata.json': {},
            [thumbnailPath]: {},
            ...Object.fromEntries(resourceEntries.map((entry) => [entry.path, {}])),
        },
    }, null, 2), { compression: 'STORE' });
    const thumbBytes = thumbnailBuffer ?? Buffer.from(EMPTY_THUMBNAIL_PNG_BASE64, 'base64');
    zip.file(thumbnailPath, thumbBytes, { compression: 'STORE' });
    for (const entry of resourceEntries) {
        zip.file(entry.path, entry.bytes, { compression: 'STORE' });
    }
    const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
    await fs.writeFile(abs, out);
    return { path: abs };
}
