import { ensureNodeContent, getNodePlainText } from '@/mind/core/nodeContent';
import { toRaw } from 'vue';

export const DEFAULT_ROOT_H_GAP = 44;
const LEGACY_DEFAULT_ROOT_H_GAPS = new Set([60, 52]);
export const DEFAULT_ROOT_V_GAP = 16;
export const LEGACY_DEFAULT_ROOT_V_GAP = 18;
type MindRootKind = 'main' | 'free';

export function resolveRootHorizontalGap(hGap: unknown) {
    if (typeof hGap === 'number' && Number.isFinite(hGap)) {
        return LEGACY_DEFAULT_ROOT_H_GAPS.has(hGap) ? DEFAULT_ROOT_H_GAP : hGap;
    }
    return DEFAULT_ROOT_H_GAP;
}

export function resolveRootVerticalGap(vGap: unknown) {
    if (typeof vGap === 'number' && Number.isFinite(vGap)) {
        return vGap === LEGACY_DEFAULT_ROOT_V_GAP ? DEFAULT_ROOT_V_GAP : vGap;
    }
    return DEFAULT_ROOT_V_GAP;
}

const DEFAULT_ROOT_LAYOUT = { direction: 'right', hGap: DEFAULT_ROOT_H_GAP, vGap: DEFAULT_ROOT_V_GAP } as const;
const DEFAULT_BOARD_ORDER = ['mind-1', 'mind-2', 'mind-3'] as const;
const BOARD_NODE_CONTENT_NORMALIZED = Symbol('board-node-content-normalized');

function createBoardRootNode(title: string, rootId = 'root') {
    return {
        id: rootId,
        text: { plain: title },
        children: [],
        images: [],
        image: null,
    };
}

export function createEmptyMindBoard(title = '中心主题', options: {
    id?: string;
    rootId?: string;
    pos?: { x: number; y: number };
} = {}) {
    const rootId = options.rootId || 'root';
    const board = {
        id: options.id || 'mind-1',
        title,
        roots: [
            {
                rootId,
                pos: options.pos || { x: 200, y: 140 },
                layout: { ...DEFAULT_ROOT_LAYOUT },
                rootKind: 'main' as MindRootKind,
            },
        ],
        nodes: {
            [rootId]: createBoardRootNode(title, rootId),
        },
        relations: [],
        view: {
            viewport: {},
        },
    };

    ensureNodeContent(board.nodes[rootId], title);
    return board;
}

function normalizeBoardRoots(board: any) {
    const roots = Array.isArray(board?.roots) ? board.roots : [];
    for (let index = 0; index < roots.length; index += 1) {
        const root = roots[index];
        if (!root || typeof root !== 'object') continue;

        if (typeof root.rootId !== 'string' || !root.rootId) {
            root.rootId = `root-${index + 1}`;
        }

        const hasValidPos =
            root.pos &&
            typeof root.pos === 'object' &&
            Number.isFinite(root.pos.x) &&
            Number.isFinite(root.pos.y);
        if (!hasValidPos) {
            root.pos = { x: 200, y: 140 };
        }

        if (!root.layout || typeof root.layout !== 'object') {
            root.layout = { ...DEFAULT_ROOT_LAYOUT };
        } else {
            if (root.layout.direction !== 'right') root.layout.direction = 'right';
            if (!Number.isFinite(root.layout.hGap)) root.layout.hGap = DEFAULT_ROOT_H_GAP;
            if (!Number.isFinite(root.layout.vGap)) root.layout.vGap = DEFAULT_ROOT_V_GAP;
        }

        const expectedRootKind: MindRootKind = index === 0 ? 'main' : 'free';
        if (root.rootKind !== expectedRootKind) {
            root.rootKind = expectedRootKind;
        }
    }
}

function normalizeBoardRelations(board: any) {
    const nodes = board?.nodes && typeof board.nodes === 'object' ? board.nodes : {};
    const rawRelations = Array.isArray(board?.relations) ? board.relations : [];
    const normalizedRelations: any[] = [];
    const seenPairKeys = new Set<string>();
    rawRelations.forEach((relation: any, index: number) => {
        if (!relation || typeof relation !== 'object') return;
        const fromNodeId =
            typeof relation.fromNodeId === 'string' && relation.fromNodeId.trim() ? relation.fromNodeId.trim() : null;
        const toNodeId =
            typeof relation.toNodeId === 'string' && relation.toNodeId.trim() ? relation.toNodeId.trim() : null;
        if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
        if (!nodes[fromNodeId] || !nodes[toNodeId]) return;
        const pairKey = [fromNodeId, toNodeId].sort().join('::');
        if (seenPairKeys.has(pairKey)) return;
        seenPairKeys.add(pairKey);
        normalizedRelations.push({
            id:
                typeof relation.id === 'string' && relation.id.trim()
                    ? relation.id.trim()
                    : `relation-${index + 1}`,
            fromNodeId,
            toNodeId,
            style: relation.style && typeof relation.style === 'object' ? relation.style : null,
            label: typeof relation.label === 'string' ? relation.label : null,
        });
    });
    const relationsUnchanged =
        Array.isArray(board?.relations) &&
        board.relations.length === normalizedRelations.length &&
        board.relations.every((relation: any, index: number) => {
            const normalized = normalizedRelations[index];
            return !!normalized &&
                relation?.id === normalized.id &&
                relation?.fromNodeId === normalized.fromNodeId &&
                relation?.toNodeId === normalized.toNodeId &&
                (relation?.style ?? null) === normalized.style &&
                (relation?.label ?? null) === normalized.label;
        });
    if (!relationsUnchanged) {
        board.relations = normalizedRelations;
    }
}

function ensureMindBoardShape(board: any, fallbackTitle: string, boardId: string) {
    if (!board || typeof board !== 'object') return createEmptyMindBoard(fallbackTitle, { id: boardId });
    board.id = typeof board.id === 'string' && board.id ? board.id : boardId;
    board.title = typeof board.title === 'string' && board.title.trim() ? board.title : fallbackTitle;
    if (!board.nodes || typeof board.nodes !== 'object') board.nodes = {};
    if (!Array.isArray(board.relations)) board.relations = [];
    board.view = board.view || {};
    board.view.viewport = board.view.viewport || {};

    if (!Array.isArray(board.roots) || !board.roots.length) {
        const rootId = board.rootId || 'root';
        if (!board.nodes[rootId]) {
            board.nodes[rootId] = createBoardRootNode(board.title, rootId);
        }
        board.roots = [
            {
                rootId,
                pos: { x: 200, y: 140 },
                layout: { ...DEFAULT_ROOT_LAYOUT },
                rootKind: 'main' as MindRootKind,
            },
        ];
    }

    normalizeBoardRoots(board);
    normalizeBoardRelations(board);

    const rootId = board.roots[0]?.rootId || 'root';
    if (!board.nodes[rootId]) {
        board.nodes[rootId] = createBoardRootNode(board.title, rootId);
    }

    if (board[BOARD_NODE_CONTENT_NORMALIZED] !== true) {
        for (const node of Object.values(board.nodes)) {
            if (shouldNormalizeNodeContent(node)) {
                ensureNodeContent(node as any);
            }
        }
        board[BOARD_NODE_CONTENT_NORMALIZED] = true;
    }

    if (shouldNormalizeNodeContent(board.nodes[rootId], board.title)) {
        ensureNodeContent(board.nodes[rootId], board.title);
    }
    return board;
}

function shouldNormalizeNodeContent(node: any, fallbackText = '') {
    if (!node) return true;
    if (!('image' in node)) return true;
    if (!node.textLexical || !node.richText) return true;
    if (typeof node.text === 'string' || typeof node.textPlain === 'string' || typeof node.title === 'string') return true;
    if (!node.text || typeof node.text !== 'object' || typeof node.text.plain !== 'string') return true;
    if (fallbackText && !getNodePlainText(node).trim()) return true;
    return false;
}

/**
 * 将响应式 doc 对象序列化为普通 JS 对象。
 * 在通过 electronAPI 传输数据时，必须先转换，否则结构化克隆会抛出
 * "An object could not be cloned" 错误。
 */
export function toPlainDoc(doc: any): any {
    return JSON.parse(JSON.stringify(toRaw(doc)));
}

export function ensureMultiMindDoc(doc: any): void {
    if (!doc) return;
    doc.mind = doc.mind || {};

    // 允许在开发阶段把旧单画板结构自动包装进多画板容器，避免本地测试文件直接崩。
    if (!doc.mind.minds && (doc.mind.nodes || doc.mind.roots || doc.mind.view)) {
        const legacyTitle = doc?.manifest?.title || '思维导图';
        const legacyBoard = {
            id: 'mind-1',
            title: legacyTitle,
            roots: Array.isArray(doc.mind.roots) ? doc.mind.roots : [],
            nodes: doc.mind.nodes || {},
            relations: Array.isArray(doc.mind.relations) ? doc.mind.relations : [],
            view: doc.mind.view || { viewport: {} },
        };
        doc.mind = {
            version: 1,
            activeMindId: 'mind-1',
            order: ['mind-1'],
            minds: {
                'mind-1': legacyBoard,
            },
        };
    }

    if (!doc.mind.minds || typeof doc.mind.minds !== 'object') {
        const fallbackTitle = doc?.manifest?.title || '思维导图';
        doc.mind.minds = Object.fromEntries(
            DEFAULT_BOARD_ORDER.map((boardId, index) => {
                const boardTitle = index === 0 ? fallbackTitle : `画板 ${index + 1}`;
                return [boardId, createEmptyMindBoard(boardTitle, { id: boardId })];
            })
        );
    }

    if (!Array.isArray(doc.mind.order) || !doc.mind.order.length) {
        const fallbackIds = Object.keys(doc.mind.minds);
        doc.mind.order = fallbackIds.length ? fallbackIds : [...DEFAULT_BOARD_ORDER];
    }

    const normalizedOrder: string[] = [];
    for (const boardId of doc.mind.order) {
        if (typeof boardId !== 'string' || !boardId) continue;
        if (normalizedOrder.includes(boardId)) continue;
        normalizedOrder.push(boardId);
    }
    for (const boardId of Object.keys(doc.mind.minds)) {
        if (!normalizedOrder.includes(boardId)) normalizedOrder.push(boardId);
    }
    doc.mind.order = normalizedOrder.length ? normalizedOrder : [...DEFAULT_BOARD_ORDER];

    for (const boardId of doc.mind.order) {
        const fallbackTitle = boardId === 'mind-1' ? (doc?.manifest?.title || '思维导图') : `画板 ${doc.mind.order.indexOf(boardId) + 1}`;
        doc.mind.minds[boardId] = ensureMindBoardShape(doc.mind.minds[boardId], fallbackTitle, boardId);
    }

    const activeMindId = typeof doc.mind.activeMindId === 'string' ? doc.mind.activeMindId : null;
    doc.mind.activeMindId = activeMindId && doc.mind.minds[activeMindId]
        ? activeMindId
        : doc.mind.order[0];
}

export function getActiveMindId(doc: any): string | null {
    if (!doc) return null;
    return typeof doc?.mind?.activeMindId === 'string' ? doc.mind.activeMindId : null;
}

export function getActiveMind(doc: any): any | null {
    if (!doc) return null;
    const activeMindId = getActiveMindId(doc);
    if (!activeMindId) return null;
    return doc?.mind?.minds?.[activeMindId] ?? null;
}

export function setActiveMindId(doc: any, mindId: string): boolean {
    if (!doc) return false;
    ensureMultiMindDoc(doc);
    if (!mindId || !doc?.mind?.minds?.[mindId]) return false;
    doc.mind.activeMindId = mindId;
    return true;
}

export function listMindBoards(doc: any): Array<{ id: string; title: string }> {
    if (!doc) return [];
    if (!Array.isArray(doc?.mind?.order) || !doc?.mind?.minds) return [];
    return doc.mind.order
        .map((boardId: string) => doc.mind.minds?.[boardId])
        .filter((board: any) => !!board)
        .map((board: any) => ({
            id: board.id,
            title: board.title,
        }));
}

/**
 * 保证当前激活画板拥有完整单画板结构。
 */
export function ensureMindRoots(doc: any): void {
    const activeMind = getActiveMind(doc);
    if (!activeMind) return;
    ensureMindBoardShape(activeMind, activeMind.title || doc?.manifest?.title || '思维导图', activeMind.id || 'mind-1');
}
