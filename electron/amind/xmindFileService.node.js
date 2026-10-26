import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { AMIND_SCHEMA_VERSION } from './constants.js';
import { guessMimeFromPath } from '../shared/assetService.node.js';

const XMIND_EXT = '.xmind';
const AMIND_NODE_EXTENSION = 'org.asynctest.mind.node';
const DEFAULT_ROOT_POS = { x: 200, y: 140 };
const DEFAULT_LAYOUT = { direction: 'right', hGap: 60, vGap: 18 };
const EMPTY_THUMBNAIL_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aW1QAAAAASUVORK5CYII=';
const DEFAULT_THEME_COLOR_LIST = '#FF6B6B #FF9F69 #97D3B6 #88E2D7 #6FD0F9 #E18BEE';
const XMIND_MARKER_COLOR_ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
const XMIND_TASK_TO_AMIND_MARKER = {
    'task-start': 'task:15',
    'task-oct': 'task:15',
    'task-3oct': 'task:40',
    'task-half': 'task:50',
    'task-5oct': 'task:65',
    'task-7oct': 'task:90',
    'task-done': 'task:100',
};
const AMIND_TASK_TO_XMIND_MARKER = {
    'task:15': 'task-oct',
    'task:40': 'task-3oct',
    'task:50': 'task-half',
    'task:65': 'task-5oct',
    'task:90': 'task-7oct',
    'task:100': 'task-done',
};
const XMIND_OTHER_TO_AMIND_MARKER = {
    'symbol-idea': 'other:lightbulb',
    'symbol-exclam': 'other:error',
    'symbol-lightning': 'other:zap',
    'symbol-question': 'other:question',
    'symbol-run': 'other:exit',
    'symbol-pin': 'other:tag',
    'symbol-entertainment': 'other:game',
    c_symbol_like: 'other:thumbs-up',
    c_symbol_dislike: 'other:thumbs-down',
    c_symbol_hourglass: 'other:time',
    c_symbol_heart: 'other:heart',
    c_symbol_flight: 'other:plane',
    c_symbol_music: 'other:music',
    c_symbol_pen: 'other:pen',
    c_symbol_telephone: 'other:call',
};
const AMIND_OTHER_TO_XMIND_MARKER = Object.fromEntries(
    Object.entries(XMIND_OTHER_TO_AMIND_MARKER).map(([xmindMarkerId, amindMarkerKey]) => [amindMarkerKey, xmindMarkerId])
);

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
        renderStylePreset: 'clean',
    };
}

function sanitizeTitle(value, fallback = '主题') {
    return typeof value === 'string' ? value : fallback;
}

function warn(warnings, code, message, details = {}) {
    warnings.push({ code, message, ...details });
}

function plainNotes(notes) {
    if (typeof notes?.plain?.content === 'string') return notes.plain.content;
    const paragraphs = notes?.html?.content?.paragraphs;
    if (Array.isArray(paragraphs)) {
        return paragraphs.map((paragraph) => (paragraph.spans || []).map((span) => span.text || '').join('')).join('\n');
    }
    return '';
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
        ...(topic.notes ? { note: plainNotes(topic.notes) } : {}),
        ...(topic.branch === 'folded' ? { collapsed: true } : {}),
    };
}

function mapXmindColorMarkerIdToAmind(markerId, xmindPrefix, amindGroup, amindItemPrefix) {
    if (typeof markerId !== 'string') return null;
    const match = markerId.match(new RegExp(`^${xmindPrefix}-(red|orange|yellow|green|blue|purple|gray)$`));
    if (!match) return null;
    const colorIndex = XMIND_MARKER_COLOR_ORDER.indexOf(match[1]);
    if (colorIndex < 0) return null;
    return `${amindGroup}:${amindItemPrefix}${colorIndex + 1}`;
}

function mapAmindColorMarkerKeyToXmind(markerKey, amindGroup, amindItemPrefix, xmindPrefix) {
    if (typeof markerKey !== 'string') return null;
    const match = markerKey.match(new RegExp(`^${amindGroup}:${amindItemPrefix}(\\d+)$`));
    if (!match) return null;
    const colorIndex = Number(match[1]) - 1;
    if (colorIndex < 0 || colorIndex >= XMIND_MARKER_COLOR_ORDER.length) return null;
    return `${xmindPrefix}-${XMIND_MARKER_COLOR_ORDER[colorIndex]}`;
}

function mapXmindMarkerIdToAmind(markerId) {
    if (typeof markerId !== 'string') return null;
    const priorityMatch = markerId.match(/^priority-(\d+)$/);
    if (priorityMatch) {
        const level = Number(priorityMatch[1]);
        if (level >= 1 && level <= 7) return `level:level${level}`;
    }
    const taskMarker = XMIND_TASK_TO_AMIND_MARKER[markerId];
    if (taskMarker) return taskMarker;
    const flagMarker = mapXmindColorMarkerIdToAmind(markerId, 'flag', 'flag', 'flag');
    if (flagMarker) return flagMarker;
    const starMarker = mapXmindColorMarkerIdToAmind(markerId, 'star', 'star', 'star');
    if (starMarker) return starMarker;
    const userMarker = mapXmindColorMarkerIdToAmind(markerId, 'people', 'user', 'user');
    if (userMarker) return userMarker;
    const otherMarker = XMIND_OTHER_TO_AMIND_MARKER[markerId];
    if (otherMarker) return otherMarker;
    return null;
}

function mapAmindMarkerKeyToXmind(markerKey) {
    if (typeof markerKey !== 'string') return null;
    const levelMatch = markerKey.match(/^level:level(\d)$/);
    if (levelMatch) {
        const level = Number(levelMatch[1]);
        if (level >= 1 && level <= 7) return `priority-${level}`;
    }
    const taskMarker = AMIND_TASK_TO_XMIND_MARKER[markerKey];
    if (taskMarker) return taskMarker;
    const flagMarker = mapAmindColorMarkerKeyToXmind(markerKey, 'flag', 'flag', 'flag');
    if (flagMarker) return flagMarker;
    const starMarker = mapAmindColorMarkerKeyToXmind(markerKey, 'star', 'star', 'star');
    if (starMarker) return starMarker;
    const userMarker = mapAmindColorMarkerKeyToXmind(markerKey, 'user', 'user', 'people');
    if (userMarker) return userMarker;
    const otherMarker = AMIND_OTHER_TO_XMIND_MARKER[markerKey];
    if (otherMarker) return otherMarker;
    return null;
}

function applyXmindMarkersToNode(topic, node) {
    const markerRefs = Array.isArray(topic?.markers) ? topic.markers : Array.isArray(topic?.markerRefs) ? topic.markerRefs : [];
    const markerPairs = markerRefs
        .map((item) => {
            const markerId = typeof item?.markerId === 'string' ? item.markerId : null;
            const markerKey = mapXmindMarkerIdToAmind(markerId);
            return markerId && markerKey ? { markerId, markerKey } : null;
        })
        .filter(Boolean);
    if (markerPairs.length) {
        node.markers = Array.from(new Set(markerPairs.map((item) => item.markerKey)));
        const markerIdsByKey = {};
        markerPairs.forEach(({ markerId, markerKey }) => {
            if (!markerIdsByKey[markerKey]) markerIdsByKey[markerKey] = markerId;
        });
        node.xmindMeta = {
            ...(node?.xmindMeta && typeof node.xmindMeta === 'object' ? node.xmindMeta : {}),
            markerIdsByKey,
        };
    }
}

function getTopicChildren(topic) {
    const attached = topic?.children?.attached;
    return Array.isArray(attached) ? attached : [];
}

function getTopicDetachedChildren(topic) {
    const detached = topic?.children?.detached;
    return Array.isArray(detached) ? detached : [];
}

function getTopicSummaryChildren(topic) {
    const summary = topic?.children?.summary ?? topic?.children?.summaries;
    return Array.isArray(summary) ? summary : [];
}

function toFiniteNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function getTopicPosition(topic, fallbackPos = DEFAULT_ROOT_POS) {
    const position = topic?.position && typeof topic.position === 'object' ? topic.position : {};
    const x = toFiniteNumber(position?.x ?? topic?.x);
    const y = toFiniteNumber(position?.y ?? topic?.y);
    return {
        x: x ?? fallbackPos.x,
        y: y ?? fallbackPos.y,
    };
}

function parseSummaryRangeTokenList(value) {
    if (typeof value === 'string') {
        const numericMatch = value.trim().match(/^\((\d+),\s*(\d+)\)$/);
        if (numericMatch) {
            return {
                startIndex: Number(numericMatch[1]),
                endIndex: Number(numericMatch[2]),
            };
        }
    }
    if (Array.isArray(value) && value.length >= 2) {
        const [startId, endId] = value;
        return typeof startId === 'string' && typeof endId === 'string'
            ? { startId, endId }
            : null;
    }
    if (value && typeof value === 'object') {
        const startId = typeof value.startId === 'string'
            ? value.startId
            : typeof value.beginId === 'string'
                ? value.beginId
                : null;
        const endId = typeof value.endId === 'string'
            ? value.endId
            : typeof value.finishId === 'string'
                ? value.finishId
                : null;
        return startId && endId ? { startId, endId } : null;
    }
    if (typeof value !== 'string') return null;
    const tokens = value
        .replace(/^[[(\s]+|[\])\s]+$/g, '')
        .split(/[\s,]+/)
        .map((token) => token.trim())
        .filter(Boolean);
    if (tokens.length === 2 && tokens.every((token) => /^\d+$/.test(token))) {
        return {
            startIndex: Number(tokens[0]),
            endIndex: Number(tokens[1]),
        };
    }
    return tokens.length >= 2 ? { startId: tokens[0], endId: tokens[tokens.length - 1] } : null;
}

function resolveSummaryRange(summaryEntry, attachedTopics) {
    if (!summaryEntry || !attachedTopics.length) return null;
    const numericStartIndex = Number(summaryEntry?.startIndex);
    const numericEndIndex = Number(summaryEntry?.endIndex);
    if (Number.isInteger(numericStartIndex) && Number.isInteger(numericEndIndex)) {
        const maxIndex = attachedTopics.length - 1;
        return {
            startIndex: Math.max(0, Math.min(maxIndex, Math.min(numericStartIndex, numericEndIndex))),
            endIndex: Math.max(0, Math.min(maxIndex, Math.max(numericStartIndex, numericEndIndex))),
        };
    }
    const parsedRange = parseSummaryRangeTokenList(
        summaryEntry?.range ?? summaryEntry?.topicRange ?? summaryEntry?.childrenRange ?? summaryEntry
    );
    if (!parsedRange) return null;
    if (Number.isInteger(parsedRange.startIndex) && Number.isInteger(parsedRange.endIndex)) {
        const maxIndex = attachedTopics.length - 1;
        return {
            startIndex: Math.max(0, Math.min(maxIndex, Math.min(parsedRange.startIndex, parsedRange.endIndex))),
            endIndex: Math.max(0, Math.min(maxIndex, Math.max(parsedRange.startIndex, parsedRange.endIndex))),
        };
    }
    const attachedTopicIds = attachedTopics.map((topic) => (typeof topic?.id === 'string' ? topic.id : null));
    const startIndex = attachedTopicIds.indexOf(parsedRange.startId);
    const endIndex = attachedTopicIds.indexOf(parsedRange.endId);
    if (startIndex < 0 || endIndex < 0) return null;
    return {
        startIndex: Math.min(startIndex, endIndex),
        endIndex: Math.max(startIndex, endIndex),
    };
}

function buildRelationStyleFromXmind(relationship) {
    const properties = relationship?.style?.properties && typeof relationship.style.properties === 'object'
        ? relationship.style.properties
        : relationship?.style && typeof relationship.style === 'object'
            ? relationship.style
            : {};
    const style = {};
    if (typeof properties['line-color'] === 'string' && properties['line-color']) {
        style.stroke = properties['line-color'];
    }
    const lineWidth = Number.parseFloat(String(properties['line-width'] ?? ''));
    if (Number.isFinite(lineWidth) && lineWidth > 0) {
        style.strokeWidthPx = lineWidth;
    }
    const linePattern = typeof properties['line-pattern'] === 'string' ? properties['line-pattern'].toLowerCase() : '';
    if (linePattern) {
        style.dash = linePattern.includes('dash') ? 'dashed' : 'solid';
    }
    const arrowEndClass = typeof properties['arrow-end-class'] === 'string' ? properties['arrow-end-class'].toLowerCase() : '';
    if (arrowEndClass) {
        style.arrow = arrowEndClass.includes('triangle') || arrowEndClass.includes('arrow') ? 'end' : 'none';
    }
    return Object.keys(style).length ? style : null;
}

function extractRelationsFromSheet(sheet, topicIdToNodeId) {
    const relationships = Array.isArray(sheet?.relationships) ? sheet.relationships : [];
    const relationIds = new Set();
    return relationships
        .map((relationship) => {
            const fromTopicId = typeof relationship?.end1Id === 'string'
                ? relationship.end1Id
                : typeof relationship?.sourceId === 'string'
                    ? relationship.sourceId
                    : null;
            const toTopicId = typeof relationship?.end2Id === 'string'
                ? relationship.end2Id
                : typeof relationship?.targetId === 'string'
                    ? relationship.targetId
                    : null;
            const fromNodeId = fromTopicId ? topicIdToNodeId.get(fromTopicId) : null;
            const toNodeId = toTopicId ? topicIdToNodeId.get(toTopicId) : null;
            if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return null;
            const relationId = typeof relationship?.id === 'string' && relationship.id ? relationship.id : randomUUID();
            if (relationIds.has(relationId)) return null;
            relationIds.add(relationId);
            return {
                id: relationId,
                fromNodeId,
                toNodeId,
                label: typeof relationship?.title === 'string' && relationship.title.trim() ? relationship.title.trim() : null,
                style: buildRelationStyleFromXmind(relationship),
            };
        })
        .filter(Boolean);
}

function formatSecrecyLabel(secrecy) {
    if (!secrecy || typeof secrecy !== 'object') return '';
    if (secrecy.level === 'secret') {
        const durationMap = {
            1: '一年',
            2: '二年',
            3: '三年',
            4: '四年',
            5: '五年',
            6: '六年',
            7: '七年',
            8: '八年',
            9: '九年',
            10: '十年',
        };
        return secrecy.durationYears == null
            ? '秘密▲'
            : `秘密▲${durationMap[Number(secrecy.durationYears)] ?? '一年'}`;
    }
    if (secrecy.level === 'confidential') {
        return '机密▲长期';
    }
    if (secrecy.level === 'top-secret') {
        return `绝密▲${typeof secrecy.markedAt === 'string' ? secrecy.markedAt : ''}`.replace(/▲$/, '');
    }
    return '';
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
    const value = src.startsWith('xap:') ? src.slice('xap:'.length) : src;
    try { return decodeURIComponent(value).replace(/^\/+/, ''); } catch { return value.replace(/^\/+/, ''); }
}

function createNodeImageFromXmindTopic(topic, resourceBytesMap) {
    const resourcePath = normalizeResourcePath(topic?.image?.src);
    if (!resourcePath) return null;
    const bytes = resourceBytesMap.get(resourcePath);
    if (!bytes?.length) throw new Error(`Invalid XMind: missing image resource ${resourcePath}`);
    const mime = guessMimeFromPath(resourcePath) || 'application/octet-stream';
    const dimensions = getImageDimensions(bytes, mime);
    const naturalWidth = Math.max(1, dimensions?.width ?? 320);
    const naturalHeight = Math.max(1, dimensions?.height ?? 180);
    const initialWidth = Number(topic.image.width) > 0 ? Number(topic.image.width) : Math.min(naturalWidth, 320);
    const initialHeight = Number(topic.image.height) > 0 ? Number(topic.image.height) : Math.max(1, Math.round(naturalHeight * (initialWidth / naturalWidth)));
    return {
        src: toDataUrl(bytes, mime),
        mime,
        width: initialWidth,
        height: initialHeight,
        naturalWidth,
        naturalHeight,
    };
}

function buildBoardFromSheet(sheet, boardIndex, resourceBytesMap, warnings) {
    const rootTopic = sheet?.rootTopic;
    if (!rootTopic || typeof rootTopic !== 'object') {
        throw new Error(`Invalid XMind sheet at index ${boardIndex}: missing rootTopic`);
    }
    const boardId = `mind-${boardIndex + 1}`;
    const nodes = {};
    const topicIdToNodeId = new Map();

    const visitTopic = (topic, options = {}) => {
        const node = createNodeFromTopic(topic, options.fallbackTitle ?? '主题');
        if (nodes[node.id]) throw new Error(`Invalid XMind: duplicate topic id ${node.id}`);
        if (options.isSummary || topic?.class === 'summary') {
            node.nodeKind = 'summary';
        }
        applyXmindMarkersToNode(topic, node);
        node.image = createNodeImageFromXmindTopic(topic, resourceBytesMap);
        const retained = {};
        const mappedKeys = new Set(['id', 'title', 'class', 'children', 'summaries', 'markers', 'markerRefs', 'image', 'branch', 'attributedTitle']);
        for (const [key, value] of Object.entries(topic)) {
            if (!mappedKeys.has(key) && value != null) retained[key] = cloneJson(value);
            if (!mappedKeys.has(key) && !['style', 'labels', 'href', 'numbering', 'boundaries', 'structureClass', 'extensions', 'customWidth', 'notes', 'position'].includes(key)) {
                warn(warnings, 'XMIND_FIELD_RETAINED', `XMind 的 ${key} 已保留在文件中，AsyncTest 暂不提供等价编辑。`, { nodeId: node.id, field: key });
            }
        }
        if (typeof topic.href === 'string' && /^(xap:|attachments\/|resources\/)/.test(topic.href)) throw new Error(`Unsupported XMind attachment on node ${node.id}; conversion stopped to avoid losing its resource`);
        const extension = topic.extensions?.find((item) => item.provider === AMIND_NODE_EXTENSION)?.content;
        if (extension?.secrecy && formatSecrecyLabel(extension.secrecy)) node.secrecy = cloneJson(extension.secrecy);
        if (extension?.metadata) node.metadata = cloneJson(extension.metadata);
        if (extension?.style) node.style = cloneJson(extension.style);
        if (Array.isArray(extension?.markers)) node.markers = [...new Set([...(node.markers || []), ...extension.markers])];
        if (extension?.secrecyLabel && Array.isArray(retained.labels)) retained.labels = retained.labels.filter((label) => label !== extension.secrecyLabel);
        const unknownMarkers = (topic.markers || topic.markerRefs || []).filter((item) => item.markerId && !mapXmindMarkerIdToAmind(item.markerId));
        node.xmindMeta = { ...node.xmindMeta, retained, unknownMarkers };
        for (const key of ['labels', 'href', 'numbering', 'boundaries']) {
            if (retained[key]?.length || retained[key] && !Array.isArray(retained[key])) warn(warnings, 'XMIND_METADATA_RETAINED', `XMind 的 ${key} 已保留在文件中，AsyncTest 暂不提供等价显示或编辑。`, { nodeId: node.id, field: key });
        }
        if (topic.style || topic.structureClass || topic.customWidth) warn(warnings, 'XMIND_LAYOUT_ADAPTED', '样式和布局使用 AsyncTest 的显示方式，原 XMind 设置保留供再次导出。', { nodeId: node.id });
        if (topic.notes?.html) warn(warnings, 'NOTE_FORMAT_ADAPTED', '备注正文已保留；富文本备注在 AsyncTest 中显示为纯文本。', { nodeId: node.id });
        if (topic.notes && !topic.notes.plain && !Array.isArray(topic.notes.html?.content?.paragraphs)) throw new Error(`Unsupported notes on node ${node.id}; conversion stopped to avoid losing note text`);
        if (topic.extensions?.some((item) => item.provider !== AMIND_NODE_EXTENSION)) warn(warnings, 'XMIND_EXTENSION_RETAINED', 'XMind 自定义扩展已保留，AsyncTest 不执行其中的行为。', { nodeId: node.id });
        if (unknownMarkers.length) warn(warnings, 'XMIND_MARKER_RETAINED', '部分 XMind 标记没有对应图标，原标记已保留供再次导出。', { nodeId: node.id, markers: unknownMarkers.map((item) => item.markerId) });
        nodes[node.id] = node;
        if (typeof topic?.id === 'string' && topic.id) {
            topicIdToNodeId.set(topic.id, node.id);
        }

        const attachedTopics = [...getTopicChildren(topic)];
        for (const [kind, children] of Object.entries(topic.children || {})) {
            if (['attached', 'summary', 'summaries'].includes(kind) || kind === 'detached' && topic === rootTopic) continue;
            if (Array.isArray(children) && children.length) {
                attachedTopics.push(...children);
                warn(warnings, 'TOPIC_STRUCTURE_ADAPTED', `${kind} 主题已作为普通子主题保留，内容和顺序保留，布局可能不同。`, { nodeId: node.id });
            }
        }
        node.children = attachedTopics.map((childTopic) => visitTopic(childTopic).id);

        const summaryTopics = getTopicSummaryChildren(topic);
        const summaryEntries = Array.isArray(topic?.summaries) ? topic.summaries : [];
        const summaryMetas = [];
        summaryTopics.forEach((summaryTopic, index) => {
            const summaryNode = visitTopic(summaryTopic, { isSummary: true });
            const matchedEntry = summaryEntries.find((entry) => {
                const topicId = typeof entry?.topicId === 'string'
                    ? entry.topicId
                    : typeof entry?.summaryTopicId === 'string'
                        ? entry.summaryTopicId
                        : null;
                return topicId === summaryTopic?.id;
            }) ?? summaryEntries[index] ?? null;
            const range = resolveSummaryRange(matchedEntry, attachedTopics);
            if (!range) {
                node.children.push(summaryNode.id);
                warn(warnings, 'SUMMARY_RANGE_INVALID', '概要范围无法对应，已作为普通子主题保留。', { nodeId: summaryNode.id });
                return;
            }
            summaryMetas.push({
                id: typeof matchedEntry?.id === 'string' && matchedEntry.id ? matchedEntry.id : randomUUID(),
                summaryNodeId: summaryNode.id,
                startIndex: range.startIndex,
                endIndex: range.endIndex,
            });
        });
        if (summaryMetas.length) {
            node.summaries = summaryMetas;
        }
        return node;
    };

    const rootNode = visitTopic(rootTopic, { fallbackTitle: `画板 ${boardIndex + 1}` });
    const detachedTopics = [
        ...getTopicDetachedChildren(rootTopic),
        ...(Array.isArray(sheet?.floatingTopics) ? sheet.floatingTopics : []),
    ];
    const roots = [
        {
            rootId: rootNode.id,
            pos: { ...DEFAULT_ROOT_POS },
            layout: { ...DEFAULT_LAYOUT },
            rootKind: 'main',
        },
    ];
    detachedTopics.forEach((detachedTopic, index) => {
        const detachedNode = visitTopic(detachedTopic);
        roots.push({
            rootId: detachedNode.id,
            pos: getTopicPosition(detachedTopic, {
                x: DEFAULT_ROOT_POS.x + 260 + index * 40,
                y: DEFAULT_ROOT_POS.y + index * 120,
            }),
            layout: { ...DEFAULT_LAYOUT },
            rootKind: 'free',
        });
    });
    const relations = extractRelationsFromSheet(sheet, topicIdToNodeId);
    if (relations.length !== (sheet.relationships || []).length) throw new Error(`Invalid XMind relationships in sheet ${boardIndex}: unresolved or duplicate endpoints`);
    for (const key of Object.keys(sheet)) {
        if (!['id', 'title', 'class', 'revisionId', 'rootTopic', 'relationships', 'floatingTopics', 'topicPositioning', 'topicOverlapping', 'zones', 'extensions', 'theme'].includes(key)) warn(warnings, 'XMIND_SHEET_FIELD_UNMAPPED', `画板字段 ${key} 暂不转换。`, { boardId, field: key });
    }

    return {
        id: boardId,
        title: sanitizeTitle(sheet?.title, sanitizeTitle(rootTopic?.title, `画板 ${boardIndex + 1}`)),
        roots,
        nodes,
        relations: relations.length ? relations : [],
        view: {
            viewport: {},
        },
        xmindMeta: {
            sheetId: typeof sheet?.id === 'string' && sheet.id ? sheet.id : null,
            revisionId: typeof sheet?.revisionId === 'string' && sheet.revisionId ? sheet.revisionId : null,
            topicPositioning: typeof sheet?.topicPositioning === 'string' && sheet.topicPositioning
                ? sheet.topicPositioning
                : typeof sheet?.topicOverlapping === 'string' && sheet.topicOverlapping
                    ? sheet.topicOverlapping
                    : null,
            zones: Array.isArray(sheet?.zones) ? cloneJson(sheet.zones) : null,
            extensions: Array.isArray(sheet?.extensions) ? cloneJson(sheet.extensions) : null,
            theme: sheet?.theme && typeof sheet.theme === 'object' ? cloneJson(sheet.theme) : null,
            rootStructureClass: typeof rootTopic?.structureClass === 'string' ? rootTopic.structureClass : null,
            rootPosition: rootTopic?.position && typeof rootTopic.position === 'object'
                ? cloneJson(rootTopic.position)
                : null,
            rootCustomWidth: Number.isFinite(Number(rootTopic?.customWidth))
                ? Number(rootTopic.customWidth)
                : null,
        },
    };
}

function extractNodePlainText(node, fallback = '主题') {
    if (!node || typeof node !== 'object') return fallback;
    if (typeof node.title === 'string') return node.title;
    if (typeof node.text === 'string') return node.text;
    if (node.text && typeof node.text === 'object' && typeof node.text.plain === 'string') {
        return node.text.plain;
    }
    if (typeof node.textPlain === 'string') return node.textPlain;
    return fallback;
}

function normalizeNodeRichText(node, fallbackTitle = '主题') {
    const richText = node?.richText;
    if (richText?.blocks?.length) return richText;
    if (Array.isArray(node?.textLexical?.root?.children)) {
        const visit = (item) => {
            if (item.type === 'linebreak') return [{ text: '\n' }];
            if (typeof item.text === 'string') {
                const format = typeof item.format === 'number' ? item.format : 0;
                return [{ text: item.text, marks: { bold: !!(format & 1), italic: !!(format & 2), strike: !!(format & 4), underline: !!(format & 8) } }];
            }
            return (item.children || []).flatMap(visit);
        };
        return { blocks: node.textLexical.root.children.map((block) => ({ align: block.format || 'left', inlines: visit(block) })) };
    }
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
        return { title };
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
            title,
            style: {
                id: randomUUID(),
                properties: topicStyle,
            },
        };
    }
    return {
        title,
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
    if (!parsed?.bytes?.length) {
        if (node?.image) throw new Error(`Invalid image on node ${node.id}: image must be embedded before XMind export`);
        return;
    }
    const extension = mimeToExtension(parsed.mime);
    const fileName = `${randomUUID().replace(/-/g, '')}.${extension}`;
    const resourcePath = `resources/${fileName}`;
    resourceEntries.push({ path: resourcePath, bytes: parsed.bytes });
    topic.image = {
        src: `xap:${resourcePath}`,
        ...(Number(node.image.width ?? node.image.w) > 0 ? { width: Number(node.image.width ?? node.image.w) } : {}),
        ...(Number(node.image.height ?? node.image.h) > 0 ? { height: Number(node.image.height ?? node.image.h) } : {}),
    };
}

function buildXmindRelationshipStyle(relation) {
    const properties = {
        'shape-class': 'org.xmind.relationshipShape.curved',
        'arrow-begin-class': 'org.xmind.arrowShape.none',
        'arrow-end-class': relation?.style?.arrow === 'none' ? 'org.xmind.arrowShape.none' : 'org.xmind.arrowShape.triangle',
        'line-pattern': relation?.style?.dash === 'dashed' ? 'dash' : 'solid',
    };
    if (typeof relation?.style?.stroke === 'string' && relation.style.stroke) {
        properties['line-color'] = relation.style.stroke;
    }
    if (Number.isFinite(Number(relation?.style?.strokeWidthPx)) && Number(relation.style.strokeWidthPx) > 0) {
        properties['line-width'] = String(Number(relation.style.strokeWidthPx));
    }
    return {
        id: randomUUID(),
        properties,
    };
}

function buildXmindRelationships(board, nodeIdMap) {
    const relationships = Array.isArray(board?.relations) ? board.relations : [];
    return relationships
        .map((relation) => {
            const fromNodeId = typeof relation?.fromNodeId === 'string' ? relation.fromNodeId : null;
            const toNodeId = typeof relation?.toNodeId === 'string' ? relation.toNodeId : null;
            if (!fromNodeId || !toNodeId || !board?.nodes?.[fromNodeId] || !board?.nodes?.[toNodeId]) return null;
            const payload = {
                id: randomUUID(),
                end1Id: toXmindTopicId(fromNodeId, nodeIdMap),
                end2Id: toXmindTopicId(toNodeId, nodeIdMap),
            };
            if (typeof relation?.label === 'string' && relation.label.trim()) {
                payload.title = relation.label.trim();
            }
            const hasVisualStyle =
                typeof relation?.style?.stroke === 'string' && relation.style.stroke
                || Number.isFinite(Number(relation?.style?.strokeWidthPx))
                || relation?.style?.dash === 'dashed'
                || relation?.style?.arrow === 'none';
            if (hasVisualStyle) {
                payload.style = buildXmindRelationshipStyle(relation);
            }
            return payload;
        })
        .filter(Boolean);
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

function buildTopicFromNode(nodes, nodeId, fallbackTitle = '主题', resourceEntries = [], nodeIdMap, options = {}) {
    const node = nodes?.[nodeId];
    const textPayload = buildXmindTextPayload(node, fallbackTitle);
    const topic = {
        ...cloneJson(node?.xmindMeta?.retained || {}),
        id: toXmindTopicId(nodeId, nodeIdMap),
        title: textPayload.title,
    };
    for (const key of ['structureClass', 'customWidth', 'position']) {
        if (topic[key] == null) delete topic[key];
    }
    const note = node?.note ?? node?.notes ?? node?.remark;
    if (typeof note === 'string') {
        // 编辑过纯文本后不能把旧富文本备注重新带回。
        topic.notes = plainNotes(topic.notes) === note && topic.notes ? topic.notes : { plain: { content: note } };
    } else if (note != null) {
        throw new Error(`Invalid note on node ${nodeId}: expected plain text`);
    }
    if (node?.collapsed) topic.branch = 'folded';
    else delete topic.branch;
    const extension = {};
    if (node?.metadata) extension.metadata = cloneJson(node.metadata);
    if (node?.style) extension.style = cloneJson(node.style);
    const secrecyLabel = formatSecrecyLabel(node?.secrecy);
    if (secrecyLabel) {
        extension.secrecy = cloneJson(node.secrecy);
        extension.secrecyLabel = secrecyLabel;
        topic.labels = [...new Set([...(Array.isArray(topic.labels) ? topic.labels : []), secrecyLabel])];
    }
    const unmappedMarkers = (node?.markers || []).filter((key) => !mapAmindMarkerKeyToXmind(key));
    if (unmappedMarkers.length) extension.markers = unmappedMarkers;
    topic.extensions = (topic.extensions || []).filter((item) => item.provider !== AMIND_NODE_EXTENSION);
    if (Object.keys(extension).length) topic.extensions.push({ provider: AMIND_NODE_EXTENSION, content: extension });
    if (!topic.extensions.length) delete topic.extensions;
    if (typeof options.className === 'string' && options.className) {
        topic.class = options.className;
    } else if (options.forceTopicClass === true) {
        topic.class = 'topic';
    }
    if (options.position && Number.isFinite(options.position.x) && Number.isFinite(options.position.y)) {
        topic.position = {
            x: options.position.x,
            y: options.position.y,
        };
    }
    if (textPayload.attributedTitle?.length) topic.attributedTitle = textPayload.attributedTitle;
    if (textPayload.style) topic.style = { ...topic.style, ...textPayload.style, properties: { ...topic.style?.properties, ...textPayload.style.properties } };
    const markerIdsByKey =
        node?.xmindMeta?.markerIdsByKey && typeof node.xmindMeta.markerIdsByKey === 'object'
            ? node.xmindMeta.markerIdsByKey
            : {};
    const markerRefs = Array.isArray(node?.markers)
        ? node.markers
            .map((markerKey) => {
                const xmindMarkerId = markerIdsByKey[markerKey];
                return typeof xmindMarkerId === 'string' && xmindMarkerId
                    ? xmindMarkerId
                    : mapAmindMarkerKeyToXmind(markerKey);
            })
            .filter(Boolean)
            .map((markerId) => ({ markerId }))
        : [];
    markerRefs.push(...(node?.xmindMeta?.unknownMarkers || []));
    if (markerRefs.length) topic.markers = markerRefs;
    attachNodeImageToTopic(topic, node, resourceEntries);

    const childIds = Array.isArray(node?.children) ? node.children.filter((childId) => typeof childId === 'string' && !!nodes?.[childId]) : [];
    if (childIds.length || Array.isArray(node?.summaries) && node.summaries.length) {
        topic.children = {};
    }
    if (childIds.length) {
        topic.children.attached = childIds.map((childId) => buildTopicFromNode(nodes, childId, '主题', resourceEntries, nodeIdMap));
    }
    const summaries = Array.isArray(node?.summaries) ? node.summaries : [];
    if (summaries.length) {
        const summaryTopics = [];
        const summaryEntries = [];
        summaries.forEach((summary) => {
            const summaryNodeId = typeof summary?.summaryNodeId === 'string' ? summary.summaryNodeId : null;
            if (!summaryNodeId || !nodes?.[summaryNodeId]) return;
            const startIndex = Number(summary?.startIndex);
            const endIndex = Number(summary?.endIndex);
            if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex)) return;
            const clampedStartIndex = Math.max(0, Math.min(childIds.length - 1, Math.min(startIndex, endIndex)));
            const clampedEndIndex = Math.max(0, Math.min(childIds.length - 1, Math.max(startIndex, endIndex)));
            if (clampedStartIndex > clampedEndIndex) return;
            const summaryTopic = buildTopicFromNode(
                nodes,
                summaryNodeId,
                '概要',
                resourceEntries,
                nodeIdMap
            );
            summaryTopics.push(summaryTopic);
            summaryEntries.push({
                id: randomUUID(),
                topicId: summaryTopic.id,
                range: `(${clampedStartIndex},${clampedEndIndex})`,
            });
        });
        if (summaryTopics.length) {
            topic.children.summary = summaryTopics;
            topic.summaries = summaryEntries;
        }
    }
    return topic;
}

function buildSheetFromBoard(board, index, resourceEntries) {
    const sheetMeta = board?.xmindMeta && typeof board.xmindMeta === 'object' ? board.xmindMeta : {};
    const roots = Array.isArray(board?.roots) ? board.roots : [];
    const mainRoot = roots.find((root) => root?.rootKind !== 'free' && typeof root?.rootId === 'string' && board?.nodes?.[root.rootId])
        ?? roots.find((root) => typeof root?.rootId === 'string' && board?.nodes?.[root.rootId]);
    const rootId = typeof mainRoot?.rootId === 'string' ? mainRoot.rootId : null;
    if (!rootId || !board?.nodes?.[rootId]) {
        throw new Error(`Cannot export board ${board?.id || index}: missing root node`);
    }
    // Shared map ensures every amind node ID maps to exactly one XMind UUID per export pass.
    const nodeIdMap = new Map();
    const rootPosition = sheetMeta.rootPosition && typeof sheetMeta.rootPosition === 'object'
        ? getTopicPosition({ position: sheetMeta.rootPosition }, mainRoot?.pos ?? DEFAULT_ROOT_POS)
        : getTopicPosition(mainRoot, mainRoot?.pos ?? DEFAULT_ROOT_POS);
    const rootTopic = buildTopicFromNode(
        board.nodes,
        rootId,
        sanitizeTitle(board?.title, '主题'),
        resourceEntries,
        nodeIdMap,
        {
            forceTopicClass: true,
            position: rootPosition,
        }
    );
    rootTopic.structureClass = typeof sheetMeta.rootStructureClass === 'string' && sheetMeta.rootStructureClass
        ? sheetMeta.rootStructureClass
        : 'org.xmind.ui.map.clockwise';
    if (Number.isFinite(Number(sheetMeta.rootCustomWidth)) && Number(sheetMeta.rootCustomWidth) > 0) {
        rootTopic.customWidth = Number(sheetMeta.rootCustomWidth);
    }
    const detachedTopics = roots
        .filter((root) => root !== mainRoot && typeof root?.rootId === 'string' && board?.nodes?.[root.rootId])
        .map((root) => buildTopicFromNode(
            board.nodes,
            root.rootId,
            '自由主题',
            resourceEntries,
            nodeIdMap,
            { position: getTopicPosition(root, root?.pos ?? DEFAULT_ROOT_POS) }
        ));
    const allDetachedTopics = detachedTopics;
    if (allDetachedTopics.length) {
        rootTopic.children = rootTopic.children && typeof rootTopic.children === 'object' ? rootTopic.children : {};
        rootTopic.children.detached = allDetachedTopics;
    }
    const relationships = buildXmindRelationships(board, nodeIdMap);
    return {
        id: typeof sheetMeta.sheetId === 'string' && sheetMeta.sheetId ? sheetMeta.sheetId : randomUUID(),
        revisionId: typeof sheetMeta.revisionId === 'string' && sheetMeta.revisionId ? sheetMeta.revisionId : randomUUID(),
        class: 'sheet',
        title: sanitizeTitle(board?.title, `画板 ${index + 1}`),
        rootTopic,
        relationships,
        ...(Array.isArray(sheetMeta.zones) ? { zones: cloneJson(sheetMeta.zones) } : {}),
        topicPositioning: typeof sheetMeta.topicPositioning === 'string' && sheetMeta.topicPositioning
            ? sheetMeta.topicPositioning
            : 'fixed',
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
    const attrs = (entries) => Object.entries(entries).filter(([, value]) => value != null)
        .map(([key, value]) => ` ${key}="${escapeXml(value)}"`).join('');
    const topicXml = (topic) => {
        const children = Object.entries(topic.children || {}).map(([kind, topics]) =>
            `<topics type="${escapeXml(kind)}">${topics.map(topicXml).join('')}</topics>`).join('');
        const markers = (topic.markers || []).map((marker) => `<marker-ref marker-id="${escapeXml(marker.markerId)}"/>`).join('');
        const labels = (Array.isArray(topic.labels) ? topic.labels : []).map((label) => `<label>${escapeXml(label)}</label>`).join('');
        const summaries = (topic.summaries || []).map((item) => `<summary${attrs({ id: item.id, 'topic-id': item.topicId, range: item.range })}/>`).join('');
        const extensions = (topic.extensions || []).map((item) => `<extension provider="${escapeXml(item.provider)}"><content>${escapeXml(JSON.stringify(item.content))}</content></extension>`).join('');
        return `<topic${attrs({ id: topic.id, branch: topic.branch, 'structure-class': topic.structureClass, 'xlink:href': topic.href })}>` +
            `<title>${escapeXml(topic.title)}</title>` +
            (topic.position ? `<position svg:x="${escapeXml(topic.position.x)}" svg:y="${escapeXml(topic.position.y)}"/>` : '') +
            (topic.notes ? `<notes><plain>${escapeXml(plainNotes(topic.notes))}</plain></notes>` : '') +
            (markers ? `<marker-refs>${markers}</marker-refs>` : '') +
            (labels ? `<labels>${labels}</labels>` : '') +
            (topic.image ? `<xhtml:img${attrs({ 'xhtml:src': topic.image.src, 'svg:width': topic.image.width, 'svg:height': topic.image.height })}/>` : '') +
            (summaries ? `<summaries>${summaries}</summaries>` : '') +
            (extensions ? `<extensions>${extensions}</extensions>` : '') +
            (children ? `<children>${children}</children>` : '') + '</topic>';
    };
    const xmlSheets = sheets.map((sheet) => {
        const relationships = (sheet.relationships || []).map((item) =>
            `<relationship${attrs({ id: item.id, end1: item.end1Id, end2: item.end2Id })}><title>${escapeXml(item.title || '')}</title></relationship>`).join('');
        return `<sheet id="${escapeXml(sheet.id)}"><title>${escapeXml(sheet.title)}</title>${topicXml(sheet.rootTopic)}` +
            (relationships ? `<relationships>${relationships}</relationships>` : '') + '</sheet>';
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink" version="2.0">${xmlSheets}</xmap-content>`;
}

function decodeXml(value) {
    return value.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (_, token) => {
        if (token[0] === '#') return String.fromCodePoint(parseInt(token.slice(token[1].toLowerCase() === 'x' ? 2 : 1), token[1].toLowerCase() === 'x' ? 16 : 10));
        return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[token];
    });
}

// ── Legacy XMind 8 XML parser ──────────────────────────────────────────────
// Converts content.xml (XMind 8 / Vana / legacy format) into the same JSON
// array-of-sheets structure that the new content.json uses, so the rest of
// the import pipeline works unchanged.

function parseXmindLegacyXml(xmlString) {
    // 只解析文件内 XML；不解析 DTD 或外部实体。保留空白、实体、CDATA，拒绝未闭合内容。
    const tokens = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[\w:-]+(?:\s+[^<>]*?)?\s*\/?>|[^<]+/gy;
    const stack = [];
    let root = null;
    let offset = 0;
    let match;
    while ((match = tokens.exec(xmlString)) !== null) {
        const token = match[0];
        offset = tokens.lastIndex;
        if (token.startsWith('<?') || token.startsWith('<!--')) continue;
        if (token.startsWith('<![CDATA[') || !token.startsWith('<')) {
            const text = token.startsWith('<![CDATA[') ? token.slice(9, -3) : decodeXml(token);
            if (stack.length) stack.at(-1).text += text;
            else if (text.trim()) throw new Error('Invalid XMind XML text outside root');
            continue;
        }
        const tagName = token.match(/^<\/?([\w:-]+)/)?.[1];
        if (token.startsWith('</')) {
            const node = stack.pop();
            if (!node || node.tag !== tagName) throw new Error('Invalid XMind XML closing tag');
            if (stack.length) stack.at(-1).childNodes.push(node);
            else if (root) throw new Error('Invalid XMind XML: multiple roots');
            else root = node;
            continue;
        }
        const attributes = {};
        const attrText = token.slice(tagName.length + 1).replace(/\/?\s*>$/, '');
        const attrRe = /\s+([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gy;
        let end = 0;
        let attr;
        while ((attr = attrRe.exec(attrText))) {
            attributes[attr[1]] = decodeXml(attr[2] ?? attr[3]);
            end = attrRe.lastIndex;
        }
        if (attrText.slice(end).trim()) throw new Error('Invalid XMind XML attributes');
        const node = { tag: tagName, attrs: attributes, childNodes: [], text: '' };
        if (token.endsWith('/>')) {
            if (stack.length) stack.at(-1).childNodes.push(node);
            else if (root) throw new Error('Invalid XMind XML: multiple roots');
            else root = node;
        } else stack.push(node);
    }
    if (offset !== xmlString.length || stack.length || !root || root.tag !== 'xmap-content') {
        throw new Error('Invalid XMind legacy XML: malformed or unsupported XML');
    }

    // Helper to find child elements by tag
    function findChildren(node, tag) {
        return (node?.childNodes || []).filter((c) => c.tag === tag);
    }
    function findChild(node, tag) {
        return findChildren(node, tag)[0] ?? null;
    }
    function getTitle(node) {
        const titleNode = findChild(node, 'title');
        return titleNode?.text || '';
    }

    // Convert an XML <topic> node to the JSON topic structure
    function convertTopic(xmlTopic) {
        const topic = {
            id: xmlTopic.attrs?.id || randomUUID(),
            title: getTitle(xmlTopic),
        };

        // structureClass
        if (xmlTopic.attrs?.['structure-class']) {
            topic.structureClass = xmlTopic.attrs['structure-class'];
        }

        // branch folded
        if (xmlTopic.attrs?.branch === 'folded') {
            topic.branch = 'folded';
        }

        // markers (marker-refs → markers array matching JSON format)
        const markerRefsNode = findChild(xmlTopic, 'marker-refs');
        if (markerRefsNode) {
            const refs = findChildren(markerRefsNode, 'marker-ref');
            if (refs.length) {
                topic.markers = refs
                    .map((r) => ({ markerId: r.attrs?.['marker-id'] || '' }))
                    .filter((r) => r.markerId);
            }
        }

        // image
        const imageNode = findChild(xmlTopic, 'xhtml:img');
        if (imageNode?.attrs?.['xhtml:src']) {
            topic.image = { src: imageNode.attrs['xhtml:src'] };
            if (imageNode.attrs?.['svg:width']) topic.image.width = parseInt(imageNode.attrs['svg:width'], 10) || undefined;
            if (imageNode.attrs?.['svg:height']) topic.image.height = parseInt(imageNode.attrs['svg:height'], 10) || undefined;
        }

        // notes (plain text)
        const notesNode = findChild(xmlTopic, 'notes');
        if (notesNode) {
            const plainNode = findChild(notesNode, 'plain');
            if (plainNode) {
                topic.notes = { plain: { content: plainNode.text } };
            } else if (notesNode.childNodes.length) {
                throw new Error('Unsupported legacy rich-text-only note; conversion stopped to avoid losing note content');
            }
        }

        // labels
        const labelsNode = findChild(xmlTopic, 'labels');
        if (labelsNode) {
            const labelItems = findChildren(labelsNode, 'label');
            if (labelItems.length) {
                topic.labels = labelItems.map((l) => l.text).filter(Boolean);
            }
        }

        // href
        if (xmlTopic.attrs?.['xlink:href']) {
            topic.href = xmlTopic.attrs['xlink:href'];
        }

        // position
        if (xmlTopic.attrs?.['svg:x'] || xmlTopic.attrs?.['svg:y']) {
            topic.position = {};
            if (xmlTopic.attrs['svg:x']) topic.position.x = parseInt(xmlTopic.attrs['svg:x'], 10);
            if (xmlTopic.attrs['svg:y']) topic.position.y = parseInt(xmlTopic.attrs['svg:y'], 10);
        }

        const positionNode = findChild(xmlTopic, 'position');
        if (positionNode) topic.position = { x: Number(positionNode.attrs['svg:x']) || 0, y: Number(positionNode.attrs['svg:y']) || 0 };
        const summaryNode = findChild(xmlTopic, 'summaries');
        if (summaryNode) topic.summaries = findChildren(summaryNode, 'summary').map((item) => ({ id: item.attrs.id, topicId: item.attrs['topic-id'], range: item.attrs.range }));
        const extensionsNode = findChild(xmlTopic, 'extensions');
        if (extensionsNode) topic.extensions = findChildren(extensionsNode, 'extension').map((item) => {
            const raw = findChild(item, 'content')?.text || '';
            let content = raw;
            try { content = JSON.parse(raw); } catch { /* 第三方扩展不一定使用 JSON。 */ }
            return { provider: item.attrs.provider, content };
        });

        // children
        const childrenNode = findChild(xmlTopic, 'children');
        if (childrenNode) {
            const topicsGroups = findChildren(childrenNode, 'topics');
            const children = {};
            for (const group of topicsGroups) {
                const type = group.attrs?.type || 'attached';
                const childTopics = findChildren(group, 'topic').map(convertTopic);
                if (childTopics.length) {
                    children[type] = childTopics;
                }
            }
            if (Object.keys(children).length) {
                topic.children = children;
            }
        }

        return topic;
    }

    // Extract sheets
    const sheetNodes = findChildren(root, 'sheet');
    if (!sheetNodes.length) {
        throw new Error('Invalid XMind legacy XML: no sheets found');
    }

    return sheetNodes.map((sheetNode) => {
        const rootTopicNode = findChild(sheetNode, 'topic');
        if (!rootTopicNode) {
            throw new Error('Invalid XMind legacy XML: sheet missing root topic');
        }
        const sheet = {
            id: sheetNode.attrs?.id || randomUUID(),
            title: getTitle(sheetNode),
            rootTopic: convertTopic(rootTopicNode),
        };

        // relationships
        const relNode = findChild(sheetNode, 'relationships');
        if (relNode) {
            const rels = findChildren(relNode, 'relationship');
            if (rels.length) {
                sheet.relationships = rels.map((r) => ({
                    id: r.attrs?.id || randomUUID(),
                    title: getTitle(r),
                    end1Id: r.attrs?.end1 || '',
                    end2Id: r.attrs?.end2 || '',
                }));
            }
        }

        return sheet;
    });
}

export async function readXmindWorkbook(filePath) {
    const abs = path.resolve(filePath);
    const buf = await fs.readFile(abs);
    return readXmindWorkbookBuffer(buf, abs);
}

export async function readXmindWorkbookBuffer(buf, sourcePath = 'document.xmind') {
    const abs = path.resolve(sourcePath);
    const zip = await JSZip.loadAsync(buf);

    // Try new format first (content.json), then legacy XML (content.xml)
    const contentJsonRaw = await zip.file('content.json')?.async('string');
    let workbook;
    if (contentJsonRaw) {
        workbook = JSON.parse(contentJsonRaw);
    } else {
        const contentXmlRaw = await zip.file('content.xml')?.async('string');
        if (!contentXmlRaw) {
            throw new Error('Invalid .xmind: missing content.json and content.xml');
        }
        workbook = parseXmindLegacyXml(contentXmlRaw);
    }

    if (!Array.isArray(workbook) || !workbook.length) {
        throw new Error('Invalid .xmind: workbook is empty');
    }
    const warnings = [];
    if (!contentJsonRaw) warn(warnings, 'LEGACY_XML_PRESENTATION', '已读取旧版 XMind 的正文、备注、标记、图片和主题关系；旧版样式表及富文本样式暂不还原。');
    const resourceBytesMap = new Map();
    for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        if (!name.startsWith('resources/') && !name.startsWith('attachments/')) continue;
        resourceBytesMap.set(name, await entry.async('uint8array'));
    }
    const metadataRaw = await zip.file('metadata.json')?.async('string');
    const activeSheetId = metadataRaw ? JSON.parse(metadataRaw).activeSheetId : null;
    return { path: abs, workbook, resourceBytesMap, warnings, activeSheetId };
}

export function convertXmindWorkbookToAmindDoc(workbook, options = {}) {
    if (!Array.isArray(workbook) || !workbook.length) {
        throw new Error('Cannot import XMind: workbook is empty');
    }
    const resourceBytesMap = options.resourceBytesMap instanceof Map ? options.resourceBytesMap : new Map();
    const warnings = options.warnings || [];
    const boards = workbook.map((sheet, index) => buildBoardFromSheet(sheet, index, resourceBytesMap, warnings));
    const order = boards.map((board) => board.id);
    const manifestTitle = sanitizeTitle(
        options.title,
        sanitizeTitle(boards[0]?.title, path.basename(options.sourcePath || '思维导图', XMIND_EXT))
    );
    return {
        manifest: createBaseManifest(manifestTitle),
        mind: {
            version: 1,
            activeMindId: order[workbook.findIndex((sheet) => sheet.id === options.activeSheetId)] || order[0],
            order,
            minds: Object.fromEntries(boards.map((board) => [board.id, board])),
        },
    };
}

export async function readXmindAsAmindDoc(filePath) {
    const { path: abs, workbook, resourceBytesMap, warnings = [], activeSheetId } = await readXmindWorkbook(filePath);
    const titleFromPath = path.basename(abs, XMIND_EXT);
    return {
        path: abs,
        warnings,
        doc: convertXmindWorkbookToAmindDoc(workbook, {
            title: titleFromPath,
            sourcePath: abs,
            resourceBytesMap,
            warnings,
            activeSheetId,
        }),
    };
}

export function convertAmindDocToXmindWorkbook(doc, { warnings = [] } = {}) {
    const order = Array.isArray(doc?.mind?.order) ? doc.mind.order : [];
    const minds = doc?.mind?.minds && typeof doc.mind.minds === 'object' ? doc.mind.minds : {};
    const resourceEntries = [];
    if (new Set(order).size !== order.length || Object.keys(minds).some((id) => !order.includes(id))) throw new Error('Invalid board order: duplicate or omitted boards');
    for (const boardId of order) {
        const board = minds[boardId];
        if (!board?.nodes || !board.roots?.length) throw new Error(`Invalid board ${boardId}`);
        const seen = new Set();
        const visit = (id) => {
            if (seen.has(id) || !board.nodes[id]) throw new Error(`Invalid tree reference: ${boardId}/${id}`);
            seen.add(id);
            const node = board.nodes[id];
            for (const child of node.children || []) visit(child);
            for (const summary of node.summaries || []) {
                if (!Number.isInteger(summary.startIndex) || !Number.isInteger(summary.endIndex) || summary.startIndex < 0 || summary.endIndex < summary.startIndex || summary.endIndex >= (node.children || []).length) throw new Error(`Invalid summary range: ${boardId}/${id}`);
                visit(summary.summaryNodeId);
            }
            if (node.secrecy) warn(warnings, 'SECRECY_AS_LABEL', '密级以 XMind 标签显示，同时保留结构信息供回转。', { boardId, nodeId: id });
            if (node.style || node.metadata) warn(warnings, 'AMIND_PRESENTATION_EXTENSION', '节点自定义样式或 metadata 已保存在扩展中，XMind 使用自身的显示方式。', { boardId, nodeId: id });
            if (!node.richText && node.textLexical) warn(warnings, 'LEXICAL_FORMAT_ADAPTED', '已读取节点编辑器正文和常见文字标记，部分编辑器排版可能不同。', { boardId, nodeId: id });
            if (node.richText?.blocks?.some((block) => block.align && block.align !== 'left' || block.inlines?.some((inline) => Object.keys(inline.marks || {}).some((key) => !['bold', 'italic', 'strike', 'underline'].includes(key))))) warn(warnings, 'RICH_TEXT_STYLE_ADAPTED', '正文和粗体、斜体、下划线、删除线保留；段落对齐及部分字体、颜色可能不同。', { boardId, nodeId: id });
            if ((node.markers || []).some((key) => !mapAmindMarkerKeyToXmind(key))) warn(warnings, 'AMIND_MARKER_EXTENSION', '部分标记在 XMind 中没有对应图标，已保存在扩展中供回转。', { boardId, nodeId: id });
            if (node.images?.length) throw new Error(`Unsupported multiple/legacy images on node ${id}; conversion stopped to avoid losing images`);
            for (const key of Object.keys(node)) {
                if (!['id', 'text', 'title', 'textPlain', 'richText', 'textLexical', 'children', 'images', 'image', 'note', 'notes', 'remark', 'markers', 'collapsed', 'secrecy', 'nodeKind', 'summaries', 'style', 'metadata', 'xmindMeta'].includes(key)) warn(warnings, 'AMIND_FIELD_UNMAPPED', `节点字段 ${key} 暂不转换。`, { boardId, nodeId: id, field: key });
            }
        };
        board.roots.forEach((root) => visit(root.rootId));
        const orphanIds = Object.keys(board.nodes).filter((id) => !seen.has(id));
        if (orphanIds.length) throw new Error(`Invalid board ${boardId}: ${orphanIds.length} unreachable nodes; conversion stopped to avoid data loss`);
        if (!board.xmindMeta) warn(warnings, 'LAYOUT_ADAPTED', '画板使用 XMind 布局，字体、主题和自由定位可能与 AsyncTest 不同。', { boardId });
        if ((board.relations || []).some((relation) => !board.nodes[relation.fromNodeId] || !board.nodes[relation.toNodeId] || relation.fromNodeId === relation.toNodeId)) throw new Error(`Invalid relationship in board ${boardId}`);
    }
    const sheets = order
        .map((boardId) => minds?.[boardId])
        .filter(Boolean)
        .map((board, index) => buildSheetFromBoard(board, index, resourceEntries));
    if (!sheets.length) {
        throw new Error('Cannot export XMind: no boards found');
    }
    return { sheets, resourceEntries, warnings };
}

export async function buildXmindBuffer(doc, thumbnailBuffer = null, options = {}) {
    const { sheets, resourceEntries } = convertAmindDocToXmindWorkbook(doc, options);
    const zip = new JSZip();
    const thumbnailPath = 'Thumbnails/thumbnail.png';
    const activeIndex = doc.mind.order.indexOf(doc.mind.activeMindId);
    const activeSheetId = sheets[Math.max(0, activeIndex)].id;
    zip.file('content.json', JSON.stringify(sheets, null, 2), { compression: 'STORE' });
    zip.file('content.xml', buildCompatibilityContentXml(sheets), { compression: 'STORE' });
    zip.file('metadata.json', JSON.stringify({
        dataStructureVersion: '2',
        creator: {
            name: 'AsyncTest Mind',
            version: '1.0.0',
        },
        activeSheetId,
        layoutEngineVersion: '3',
    }, null, 2), { compression: 'STORE' });
    zip.file('manifest.json', JSON.stringify({
        'file-entries': {
            'content.json': {},
            'content.xml': {},
            'metadata.json': {},
            [thumbnailPath]: {},
            ...Object.fromEntries(resourceEntries.map((entry) => [entry.path, {}])),
        },
    }, null, 2), { compression: 'STORE' });
    const xmlEntries = ['content.xml', 'meta.xml', thumbnailPath, ...resourceEntries.map((entry) => entry.path)];
    zip.file('META-INF/manifest.xml', `<?xml version="1.0" encoding="UTF-8"?><manifest xmlns="urn:xmind:xmap:xmlns:manifest:1.0">${xmlEntries.map((name) => `<file-entry full-path="${escapeXml(name)}"/>`).join('')}</manifest>`);
    zip.file('meta.xml', '<?xml version="1.0" encoding="UTF-8"?><meta xmlns="urn:xmind:xmap:xmlns:meta:2.0"><Creator><Name>AsyncTest Mind</Name></Creator></meta>');
    const thumbBytes = thumbnailBuffer ?? Buffer.from(EMPTY_THUMBNAIL_PNG_BASE64, 'base64');
    zip.file(thumbnailPath, thumbBytes, { compression: 'STORE' });
    for (const entry of resourceEntries) {
        zip.file(entry.path, entry.bytes, { compression: 'STORE' });
    }
    return await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
}

export async function writeXmindFile(filePath, doc, thumbnailBuffer = null) {
    const abs = path.resolve(ensureXmindExt(filePath));
    const out = await buildXmindBuffer(doc, thumbnailBuffer);
    await fs.writeFile(abs, out);
    return { path: abs };
}
