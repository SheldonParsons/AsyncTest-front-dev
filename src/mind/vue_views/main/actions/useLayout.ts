import type { Ref } from 'vue';
import { ref } from 'vue';
import {
    DEFAULT_ROOT_H_GAP,
    resolveRootHorizontalGap,
    resolveRootVerticalGap,
    ensureMindRoots,
    getActiveMind
} from './useDocUtils';
import { collectSubtreeNodeIds } from '@/mind/core/commands/subtreeSnapshot';
import { doSummaryRangesOverlap, getNodeSummaries, getRegularChildIds, getNodeSummaryLaneMap } from '@/mind/core/summaryMeta';
import { measureNodeVisualLayout, type NodeTextLayout } from '../textLayout';
import { DEBUG_MIND_PERF_PROBE } from '../constants';

/** 节点在 world 坐标系中的包围盒 */
export type Box = { x: number; y: number; w: number; h: number };
export type LayoutBounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
};

export type LayoutPerfMetrics = {
    totalMs: number;
    measureNodeMs: number;
    measureNodeCalls: number;
    measureNodeCacheHits: number;
    subtreeHeightMs: number;
    subtreeHeightCalls: number;
    subtreeHeightCacheHits: number;
    placeMs: number;
    placeCalls: number;
};

export type LayoutTranslationOp = {
    rootId: string;
    dx: number;
    dy: number;
    translatedParentIds: string[];
};

/**
 * 布局 Composable
 *
 * 负责测量节点尺寸、递归计算子树高度并将每个节点放置到布局坐标中。
 * 计算结果存储在 `layoutLocal` Map 中，供绘制模块消费。
 *
 * @param props      Vue 组件 props（需包含 doc）
 * @param canvasRef  canvas 元素引用（用于获取 CanvasRenderingContext2D 测量文字宽度）
 */
export function useLayout(
    props: { doc?: any },
    canvasRef: Ref<HTMLCanvasElement | null>,
    getNodeMeasureOverride?: (nodeId: string) => { w: number; h: number } | null
) {
    /** 当前布局结果：nodeId -> Box（坐标相对于 root.pos 的偏移） */
    const layoutLocal = new Map<string, Box>();
    const layoutBounds = ref<LayoutBounds | null>(null);

    /** 文字宽度测量缓存，避免同一文本重复测量 */
    const measureCache = new Map<string, NodeTextLayout>();
    const subtreeHeightCache = new Map<string, number>();
    const summaryBoundaryPaddingCache = new Map<string, { before: number[]; after: number[] }>();
    let lastLayoutPerfMetrics: LayoutPerfMetrics | null = null;
    let currentLayoutPerfMetrics: LayoutPerfMetrics | null = null;
    let trustExistingNodeMeasureCache = false;
    let previousLayoutSnapshot: Map<string, Box> | null = null;
    let translationBlockedNodeIds: Set<string> | null = null;
    let lastLayoutTranslationOps: LayoutTranslationOp[] = [];
    let currentLayoutTranslationOps: LayoutTranslationOp[] = [];
    let lastLayoutChangedNodeIds: string[] = [];
    let currentLayoutChangedNodeIds = new Set<string>();
    const nodeGapById = new Map<string, { hGap: number; vGap: number }>();
    type CachedNodeMeasure = {
        nodeId: string | null;
        richTextRef: unknown;
        textLexicalRef: unknown;
        textValue: string;
        shapeStyleRef: unknown;
        textStyleRef: unknown;
        imageRef: unknown;
        markersRef: unknown;
        result: { w: number; h: number; bodyH: number; markerBandH: number; subtreeH: number };
    };
    let nodeMeasureCache = new WeakMap<object, CachedNodeMeasure>();

    function createLayoutPerfMetrics(): LayoutPerfMetrics {
        return {
            totalMs: 0,
            measureNodeMs: 0,
            measureNodeCalls: 0,
            measureNodeCacheHits: 0,
            subtreeHeightMs: 0,
            subtreeHeightCalls: 0,
            subtreeHeightCacheHits: 0,
            placeMs: 0,
            placeCalls: 0,
        };
    }

    /**
     * 测量文字对应节点的包围盒尺寸。
     * 使用 canvas `measureText` 获取精确文字宽度，结果写入缓存。
     *
     * @param ctx  canvas 2D 上下文
     * @param text 节点文字
     * @returns    节点包围盒尺寸 { w, h }
     */
    function measureNode(
        ctx: CanvasRenderingContext2D,
        node: any,
        nodeId?: string
    ): { w: number; h: number; bodyH: number; markerBandH: number; subtreeH: number } {
        const perfMetrics = currentLayoutPerfMetrics;
        const startedAt = perfMetrics ? performance.now() : 0;
        if (perfMetrics) perfMetrics.measureNodeCalls += 1;
        const override = nodeId ? getNodeMeasureOverride?.(nodeId) : null;
        if (override) {
            const result = { ...override, bodyH: override.h, markerBandH: 0, subtreeH: override.h };
            if (perfMetrics) perfMetrics.measureNodeMs += performance.now() - startedAt;
            return result;
        }
        if (node && typeof node === 'object') {
            const rawText =
                typeof node.text === 'string'
                    ? node.text
                    : typeof node.text?.plain === 'string'
                        ? node.text.plain
                        : typeof node.textPlain === 'string'
                            ? node.textPlain
                            : typeof node.title === 'string'
                                ? node.title
                                : '';
            const shapeStyleRef = node.style?.shape ?? null;
            const textStyleRef = node.style?.text ?? null;
            const cached = nodeMeasureCache.get(node);
            if (trustExistingNodeMeasureCache && cached && cached.nodeId === (nodeId ?? null)) {
                if (perfMetrics) {
                    perfMetrics.measureNodeCacheHits += 1;
                    perfMetrics.measureNodeMs += performance.now() - startedAt;
                }
                return cached.result;
            }
            if (
                cached &&
                cached.nodeId === (nodeId ?? null) &&
                cached.richTextRef === node.richText &&
                cached.textLexicalRef === node.textLexical &&
                cached.textValue === rawText &&
                cached.shapeStyleRef === shapeStyleRef &&
                cached.textStyleRef === textStyleRef &&
                cached.imageRef === node.image &&
                cached.markersRef === node.markers
            ) {
                if (perfMetrics) {
                    perfMetrics.measureNodeCacheHits += 1;
                    perfMetrics.measureNodeMs += performance.now() - startedAt;
                }
                return cached.result;
            }
            const layout = measureNodeVisualLayout(ctx, node, measureCache, { doc: props.doc, nodeId });
            const markerBandH = Math.max(0, layout.height - layout.bodyHeight);
            const result = {
                w: layout.width,
                h: layout.height,
                bodyH: layout.bodyHeight,
                markerBandH,
                // marker band 只在 body 下方绘制；为了让 body center 继续作为布局与连线锚点，
                // 需要在子树高度里额外给 marker band 预留同等的上侧空间。
                subtreeH: layout.height + markerBandH,
            };
            nodeMeasureCache.set(node, {
                nodeId: nodeId ?? null,
                richTextRef: node.richText,
                textLexicalRef: node.textLexical,
                textValue: rawText,
                shapeStyleRef,
                textStyleRef,
                imageRef: node.image,
                markersRef: node.markers,
                result,
            });
            if (perfMetrics) perfMetrics.measureNodeMs += performance.now() - startedAt;
            return result;
        }
        const layout = measureNodeVisualLayout(ctx, node, measureCache, { doc: props.doc, nodeId });
        const markerBandH = Math.max(0, layout.height - layout.bodyHeight);
        const result = {
            w: layout.width,
            h: layout.height,
            bodyH: layout.bodyHeight,
            markerBandH,
            // marker band 只在 body 下方绘制；为了让 body center 继续作为布局与连线锚点，
            // 需要在子树高度里额外给 marker band 预留同等的上侧空间。
            subtreeH: layout.height + markerBandH,
        };
        if (perfMetrics) perfMetrics.measureNodeMs += performance.now() - startedAt;
        return result;
    }

    /**
     * 递归计算以 nodeId 为根的子树总高度。
     * - 叶节点：高度 = 自身节点高度
     * - 父节点：高度 = max(自身高度, 所有子树高度之和 + 子间距之和)
     *
     * @param doc     文档数据
     * @param nodeId  当前节点 ID
     * @param ctx     canvas 2D 上下文（用于测量文字）
     * @param vGap    子节点之间的垂直间距
     */
    function subtreeHeight(
        nodes: Record<string, any> | null | undefined,
        nodeId: string,
        ctx: CanvasRenderingContext2D,
        vGap: number
    ): number {
        const perfMetrics = currentLayoutPerfMetrics;
        const startedAt = perfMetrics ? performance.now() : 0;
        if (perfMetrics) perfMetrics.subtreeHeightCalls += 1;
        const cached = subtreeHeightCache.get(nodeId);
        if (cached != null) {
            if (perfMetrics) {
                perfMetrics.subtreeHeightCacheHits += 1;
                perfMetrics.subtreeHeightMs += performance.now() - startedAt;
            }
            return cached;
        }

        const n = nodes?.[nodeId];
        if (!n) {
            if (perfMetrics) perfMetrics.subtreeHeightMs += performance.now() - startedAt;
            return 0;
        }

        const { subtreeH } = measureNode(ctx, n, nodeId);
        const children: string[] = n.collapsed ? [] : (n.children || []);
        if (!children.length) {
            subtreeHeightCache.set(nodeId, subtreeH);
            if (perfMetrics) perfMetrics.subtreeHeightMs += performance.now() - startedAt;
            return subtreeH;
        }

        const boundaryPadding = resolveSummaryBoundaryPadding(nodes, nodeId, n, ctx, vGap);
        let sum = 0;
        children.forEach((cid, index) => {
            sum += boundaryPadding.before[index];
            sum += subtreeHeight(nodes, cid, ctx, vGap);
            sum += boundaryPadding.after[index];
            if (index < children.length - 1) sum += vGap;
        });
        const height = Math.max(subtreeH, sum);
        subtreeHeightCache.set(nodeId, height);
        if (perfMetrics) perfMetrics.subtreeHeightMs += performance.now() - startedAt;
        return height;
    }

    function rebuildBounds() {
        if (!layoutLocal.size) {
            layoutBounds.value = null;
            return;
        }

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const box of layoutLocal.values()) {
            minX = Math.min(minX, box.x);
            minY = Math.min(minY, box.y);
            maxX = Math.max(maxX, box.x + box.w);
            maxY = Math.max(maxY, box.y + box.h);
        }

        layoutBounds.value = {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
        };
    }

    function invalidateSubtreeHeightCache(nodeIds?: Iterable<string> | null) {
        summaryBoundaryPaddingCache.clear();
        if (!nodeIds) return;
        for (const nodeId of nodeIds) {
            if (!nodeId) continue;
            subtreeHeightCache.delete(nodeId);
        }
    }

    function resolveSummaryBoundaryPadding(
        nodes: Record<string, any> | null | undefined,
        parentNodeId: string,
        parentNode: any,
        ctx: CanvasRenderingContext2D,
        vGap: number
    ) {
        const childIds = getRegularChildIds(parentNode);
        const cached = summaryBoundaryPaddingCache.get(parentNodeId);
        if (cached && cached.before.length === childIds.length && cached.after.length === childIds.length) {
            return cached;
        }
        const before = new Array<number>(childIds.length).fill(0);
        const after = new Array<number>(childIds.length).fill(0);
        if (!childIds.length) {
            const empty = { before, after };
            summaryBoundaryPaddingCache.set(parentNodeId, empty);
            return empty;
        }
        getNodeSummaries(parentNode).forEach((summary) => {
            if (!nodes?.[summary.summaryNodeId]) return;
            const startIndex = Math.max(0, Math.min(summary.startIndex, childIds.length - 1));
            const endIndex = Math.max(startIndex, Math.min(summary.endIndex, childIds.length - 1));
            let coveredHeight = 0;
            for (let index = startIndex; index <= endIndex; index += 1) {
                coveredHeight += subtreeHeight(nodes, childIds[index], ctx, vGap);
            }
            coveredHeight += Math.max(0, endIndex - startIndex) * vGap;
            const summaryHeight = subtreeHeight(nodes, summary.summaryNodeId, ctx, vGap);
            const overflowHeight = Math.max(0, summaryHeight - coveredHeight);
            if (!overflowHeight) return;
            const topPadding = overflowHeight / 2;
            const bottomPadding = overflowHeight - topPadding;
            before[startIndex] += topPadding;
            after[endIndex] += bottomPadding;
        });
        const result = { before, after };
        summaryBoundaryPaddingCache.set(parentNodeId, result);
        return result;
    }

    function markNodeLayoutChanged(nodeId: string, box: Box) {
        const previousBox = previousLayoutSnapshot?.get(nodeId);
        if (
            !previousBox ||
            previousBox.x !== box.x ||
            previousBox.y !== box.y ||
            previousBox.w !== box.w ||
            previousBox.h !== box.h
        ) {
            currentLayoutChangedNodeIds.add(nodeId);
        }
    }

    function translateSubtreeLayout(
        nodes: Record<string, any> | null | undefined,
        nodeId: string,
        dx: number,
        dy: number
    ) {
        const previousLayout = previousLayoutSnapshot;
        if (!previousLayout) return false;
        const queue = [nodeId];
        const translatedBoxes: Array<{ nodeId: string; box: Box }> = [];
        const translatedParentIds: string[] = [];
        while (queue.length) {
            const currentId = queue.pop()!;
            const node = nodes?.[currentId];
            const previousBox = previousLayout.get(currentId);
            if (!node || !previousBox) return false;
            translatedBoxes.push({
                nodeId: currentId,
                box: {
                    x: previousBox.x + dx,
                    y: previousBox.y + dy,
                    w: previousBox.w,
                    h: previousBox.h,
                },
            });
            const children: string[] = node.collapsed ? [] : (node.children || []);
            if (children.length) translatedParentIds.push(currentId);
            for (const childId of children) queue.push(childId);
        }
        translatedBoxes.forEach(({ nodeId: currentId, box }) => {
            layoutLocal.set(currentId, box);
            if (dx !== 0 || dy !== 0) currentLayoutChangedNodeIds.add(currentId);
        });
        if ((dx !== 0 || dy !== 0) && translatedParentIds.length) {
            currentLayoutTranslationOps.push({
                rootId: nodeId,
                dx,
                dy,
                translatedParentIds,
            });
        }
        return true;
    }

    /**
     * 递归放置节点位置，结果写入 `layoutLocal`。
     * 节点在其子树可用区域内**垂直居中**。
     *
     * @param doc      文档数据
     * @param nodeId   当前节点 ID
     * @param ctx      canvas 2D 上下文
     * @param nodeX    当前节点的 world X 坐标
     * @param topY     当前子树在 world 坐标中的起始 Y 坐标
     * @param hGap     父子节点之间的水平间距（px）
     * @param vGap     子节点之间的垂直间距（px）
     */
    function place(
        nodes: Record<string, any> | null | undefined,
        nodeId: string,
        ctx: CanvasRenderingContext2D,
        nodeX: number,
        topY: number,
        hGap: number,
        vGap: number
    ): void {
        const perfMetrics = currentLayoutPerfMetrics;
        const startedAt = perfMetrics ? performance.now() : 0;
        if (perfMetrics) perfMetrics.placeCalls += 1;
        const n = nodes?.[nodeId];
        if (!n) {
            if (perfMetrics) perfMetrics.placeMs += performance.now() - startedAt;
            return;
        }

        const m = measureNode(ctx, n, nodeId);
        const sh = subtreeHeight(nodes, nodeId, ctx, vGap);

        // 以 body center 作为布局对齐基准，marker band 只向下延伸。
        const y = topY + (sh - m.bodyH) / 2;
        const nextBox = { x: nodeX, y, w: m.w, h: m.h };
        layoutLocal.set(nodeId, nextBox);
        nodeGapById.set(nodeId, { hGap, vGap });
        markNodeLayoutChanged(nodeId, nextBox);

        const children: string[] = n.collapsed ? [] : (n.children || []);
        if (!children.length) {
            if (perfMetrics) perfMetrics.placeMs += performance.now() - startedAt;
            return;
        }

        const childHeights = children.map((cid) => ({
            nodeId: cid,
            height: subtreeHeight(nodes, cid, ctx, vGap),
        }));
        const boundaryPadding = resolveSummaryBoundaryPadding(nodes, nodeId, n, ctx, vGap);
        let childrenTotalHeight = 0;
        childHeights.forEach((child, index) => {
            childrenTotalHeight += boundaryPadding.before[index];
            childrenTotalHeight += child.height;
            childrenTotalHeight += boundaryPadding.after[index];
            if (index < childHeights.length - 1) childrenTotalHeight += vGap;
        });

        // 当父节点自身比 children block 更高时，children block 也要在该子树区域内垂直居中。
        let cursorY = topY + (sh - childrenTotalHeight) / 2;
        childHeights.forEach((child, index) => {
            cursorY += boundaryPadding.before[index];
            const childNode = nodes?.[child.nodeId];
            const childMeasure = childNode ? measureNode(ctx, childNode, child.nodeId) : null;
            const childX = nodeX + m.w + hGap;
            const childY = cursorY + (child.height - (childMeasure?.bodyH ?? 0)) / 2;
            const previousChildBox = previousLayoutSnapshot?.get(child.nodeId);
            const canTranslateSubtree =
                !!childNode &&
                !!childMeasure &&
                trustExistingNodeMeasureCache &&
                !translationBlockedNodeIds?.has(child.nodeId) &&
                !!previousChildBox &&
                previousChildBox.w === childMeasure.w &&
                previousChildBox.h === childMeasure.h;
            if (canTranslateSubtree) {
                const translated = translateSubtreeLayout(
                    nodes,
                    child.nodeId,
                    childX - previousChildBox.x,
                    childY - previousChildBox.y
                );
                if (!translated) {
                    place(nodes, child.nodeId, ctx, childX, cursorY, hGap, vGap);
                }
            } else {
                place(nodes, child.nodeId, ctx, childX, cursorY, hGap, vGap);
            }
            cursorY += child.height + boundaryPadding.after[index];
            if (index < childHeights.length - 1) cursorY += vGap;
        });
        if (perfMetrics) perfMetrics.placeMs += performance.now() - startedAt;
    }

    function layoutSummaryNodes(
        nodes: Record<string, any> | null | undefined,
        ctx: CanvasRenderingContext2D
    ) {
        if (!nodes) return;
        const regularParentIndex = new Map<string, string>();
        for (const [candidateParentId, candidateParentNode] of Object.entries(nodes)) {
            const childIds = getRegularChildIds(candidateParentNode);
            childIds.forEach((childId) => {
                if (!regularParentIndex.has(childId)) regularParentIndex.set(childId, candidateParentId);
            });
        }
        const parentDepthCache = new Map<string, number>();
        const resolveParentDepth = (nodeId: string): number => {
            const cached = parentDepthCache.get(nodeId);
            if (cached != null) return cached;
            const parentId = regularParentIndex.get(nodeId);
            const depth = parentId ? resolveParentDepth(parentId) + 1 : 0;
            parentDepthCache.set(nodeId, depth);
            return depth;
        };
        const summaryParents = Object.entries(nodes)
            .filter(([, parentNode]) => !!parentNode && !parentNode.collapsed && getNodeSummaries(parentNode).length > 0)
            .sort(([aId], [bId]) => resolveParentDepth(bId) - resolveParentDepth(aId));
        for (const [parentId, parentNode] of summaryParents) {
            if (!parentNode || parentNode.collapsed) continue;
            const summaries = getNodeSummaries(parentNode);
            if (!summaries.length) continue;
            const childIds = getRegularChildIds(parentNode);
            const summaryLaneMap = getNodeSummaryLaneMap(parentNode);
            const hostGap = nodeGapById.get(parentId) ?? {
                hGap: DEFAULT_ROOT_H_GAP,
                vGap: resolveRootVerticalGap(undefined),
            };
            const baseSummaryGap = Math.max(36, hostGap.hGap * 0.75);
            const summaryLaneGap = Math.max(28, hostGap.hGap * 0.7);
            const placedSummarySubtreeRightById = new Map<string, number>();
            const orderedSummaries = summaries.slice().sort((a, b) => {
                const laneDiff = (summaryLaneMap.get(a.id) ?? 0) - (summaryLaneMap.get(b.id) ?? 0);
                if (laneDiff !== 0) return laneDiff;
                if (a.startIndex !== b.startIndex) return b.startIndex - a.startIndex;
                if (a.endIndex !== b.endIndex) return a.endIndex - b.endIndex;
                return a.id.localeCompare(b.id);
            });
            const resolveSummaryCoveredBoxes = (summary: typeof orderedSummaries[number]) => {
                const rangeChildIds = childIds.slice(summary.startIndex, summary.endIndex + 1);
                if (!rangeChildIds.length) return null;
                const coveredNodeIds = Array.from(
                    new Set(rangeChildIds.flatMap((childId) => collectSubtreeNodeIds(nodes, childId)))
                );
                let rangeTop = Number.POSITIVE_INFINITY;
                let rangeBottom = Number.NEGATIVE_INFINITY;
                let rangeRight = Number.NEGATIVE_INFINITY;
                coveredNodeIds.forEach((coveredNodeId) => {
                    const rect = layoutLocal.get(coveredNodeId);
                    if (!rect) return;
                    rangeTop = Math.min(rangeTop, rect.y);
                    rangeBottom = Math.max(rangeBottom, rect.y + rect.h);
                    rangeRight = Math.max(rangeRight, rect.x + rect.w);
                });
                if (!Number.isFinite(rangeTop) || !Number.isFinite(rangeBottom) || !Number.isFinite(rangeRight)) {
                    return null;
                }
                return { rangeTop, rangeBottom, rangeRight };
            };
            orderedSummaries.forEach((summary) => {
                const summaryNode = nodes[summary.summaryNodeId];
                if (!summaryNode) return;
                const covered = resolveSummaryCoveredBoxes(summary);
                if (!covered) return;
                const lane = summaryLaneMap.get(summary.id) ?? 0;
                const summarySubtreeHeight = subtreeHeight(nodes, summary.summaryNodeId, ctx, hostGap.vGap);
                const summaryTopY = (covered.rangeTop + covered.rangeBottom) / 2 - summarySubtreeHeight / 2;
                let summaryX = covered.rangeRight + baseSummaryGap;
                if (lane > 0) {
                    for (const candidate of orderedSummaries) {
                        if (candidate.id === summary.id) break;
                        const candidateLane = summaryLaneMap.get(candidate.id) ?? 0;
                        if (candidateLane >= lane) continue;
                        if (!doSummaryRangesOverlap(candidate, summary)) continue;
                        const candidateRight = placedSummarySubtreeRightById.get(candidate.id);
                        if (candidateRight == null) continue;
                        summaryX = Math.max(summaryX, candidateRight + summaryLaneGap);
                    }
                }
                place(
                    nodes,
                    summary.summaryNodeId,
                    ctx,
                    summaryX,
                    summaryTopY,
                    Math.max(32, hostGap.hGap * 0.72),
                    hostGap.vGap
                );
                let subtreeRight = Number.NEGATIVE_INFINITY;
                for (const subtreeNodeId of collectSubtreeNodeIds(nodes, summary.summaryNodeId)) {
                    const rect = layoutLocal.get(subtreeNodeId);
                    if (!rect) continue;
                    subtreeRight = Math.max(subtreeRight, rect.x + rect.w);
                }
                if (Number.isFinite(subtreeRight)) {
                    placedSummarySubtreeRightById.set(summary.id, subtreeRight);
                }
            });
        }
    }

    /**
     * 重新计算整棵思维导图的布局。
     * 清空 `layoutLocal` 后，从第一个 root 开始递归放置所有节点。
     * 需在每次文档变更或画布尺寸变更后调用。
     */
    function rebuildLayout(options?: {
        preserveSubtreeHeightCache?: boolean;
        trustExistingNodeMeasureCache?: boolean;
        translationBlockedNodeIds?: Iterable<string>;
    }): void {
        const perfMetrics = DEBUG_MIND_PERF_PROBE ? createLayoutPerfMetrics() : null;
        currentLayoutPerfMetrics = perfMetrics;
        currentLayoutTranslationOps = [];
        currentLayoutChangedNodeIds = new Set<string>();
        const startedAt = perfMetrics ? performance.now() : 0;
        trustExistingNodeMeasureCache = !!options?.trustExistingNodeMeasureCache;
        previousLayoutSnapshot = new Map(layoutLocal);
        translationBlockedNodeIds = options?.translationBlockedNodeIds ? new Set(options.translationBlockedNodeIds) : null;
        const d = props.doc;
        const c = canvasRef.value;
        if (!d || !c) {
            lastLayoutPerfMetrics = perfMetrics;
            lastLayoutTranslationOps = currentLayoutTranslationOps;
            lastLayoutChangedNodeIds = Array.from(currentLayoutChangedNodeIds);
            currentLayoutPerfMetrics = null;
            trustExistingNodeMeasureCache = false;
            previousLayoutSnapshot = null;
            translationBlockedNodeIds = null;
            return;
        }

        const ctx = c.getContext('2d');
        if (!ctx) {
            lastLayoutPerfMetrics = perfMetrics;
            lastLayoutTranslationOps = currentLayoutTranslationOps;
            lastLayoutChangedNodeIds = Array.from(currentLayoutChangedNodeIds);
            currentLayoutPerfMetrics = null;
            trustExistingNodeMeasureCache = false;
            previousLayoutSnapshot = null;
            translationBlockedNodeIds = null;
            return;
        }

        ensureMindRoots(d);
        const activeMind = getActiveMind(d);
        if (!activeMind) {
            lastLayoutPerfMetrics = perfMetrics;
            lastLayoutTranslationOps = currentLayoutTranslationOps;
            lastLayoutChangedNodeIds = Array.from(currentLayoutChangedNodeIds);
            currentLayoutPerfMetrics = null;
            trustExistingNodeMeasureCache = false;
            previousLayoutSnapshot = null;
            translationBlockedNodeIds = null;
            return;
        }
        const nodes = activeMind.nodes ?? null;

        layoutLocal.clear();
        nodeGapById.clear();
        summaryBoundaryPaddingCache.clear();
        if (!options?.preserveSubtreeHeightCache) {
            subtreeHeightCache.clear();
            nodeMeasureCache = new WeakMap<object, CachedNodeMeasure>();
        }
        const roots = Array.isArray(activeMind.roots) ? activeMind.roots : [];

        for (const root of roots) {
            const rootId = root?.rootId;
            if (!rootId) continue;
            const rootPos = root.pos || { x: 0, y: 0 };
            const hGap = resolveRootHorizontalGap(root.layout?.hGap ?? DEFAULT_ROOT_H_GAP);
            const vGap = resolveRootVerticalGap(root.layout?.vGap);
            if (root?.rootKind === 'free') {
                const rootMeasure = measureNode(ctx, nodes?.[rootId], rootId);
                const rootSubtreeHeight = subtreeHeight(nodes, rootId, ctx, vGap);
                const anchoredTopY = rootPos.y - (rootSubtreeHeight - rootMeasure.bodyH) / 2;
                place(nodes, rootId, ctx, rootPos.x, anchoredTopY, hGap, vGap);
            } else {
                place(nodes, rootId, ctx, rootPos.x, rootPos.y, hGap, vGap);
            }
        }
        layoutSummaryNodes(nodes, ctx);

        rebuildBounds();
        if (perfMetrics) perfMetrics.totalMs = performance.now() - startedAt;
        lastLayoutPerfMetrics = perfMetrics;
        lastLayoutTranslationOps = currentLayoutTranslationOps;
        lastLayoutChangedNodeIds = Array.from(currentLayoutChangedNodeIds);
        currentLayoutPerfMetrics = null;
        trustExistingNodeMeasureCache = false;
        previousLayoutSnapshot = null;
        translationBlockedNodeIds = null;
    }

    return {
        layoutLocal,
        layoutBounds,
        measureCache,
        rebuildLayout,
        invalidateSubtreeHeightCache,
        getLastLayoutPerfMetrics: () => lastLayoutPerfMetrics,
        getLastLayoutTranslationOps: () => lastLayoutTranslationOps,
        getLastLayoutChangedNodeIds: () => lastLayoutChangedNodeIds,
    };
}
