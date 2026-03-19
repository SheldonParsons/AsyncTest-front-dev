import type { Ref } from 'vue';
import { ref } from 'vue';
import { ensureMindRoots, getActiveMind } from './useDocUtils';
import { measureNodeVisualLayout, type NodeTextLayout } from '../textLayout';

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
    ): { w: number; h: number } {
        const override = nodeId ? getNodeMeasureOverride?.(nodeId) : null;
        if (override) return override;
        const layout = measureNodeVisualLayout(ctx, node, measureCache, { doc: props.doc, nodeId });
        return { w: layout.width, h: layout.height };
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
        doc: any,
        nodeId: string,
        ctx: CanvasRenderingContext2D,
        vGap: number
    ): number {
        const cached = subtreeHeightCache.get(nodeId);
        if (cached != null) return cached;

        const activeMind = getActiveMind(doc);
        const n = activeMind?.nodes?.[nodeId];
        if (!n) return 0;

        const { h } = measureNode(ctx, n, nodeId);
        const children: string[] = n.collapsed ? [] : (n.children || []);
        if (!children.length) {
            subtreeHeightCache.set(nodeId, h);
            return h;
        }

        let sum = 0;
        for (const cid of children) sum += subtreeHeight(doc, cid, ctx, vGap);
        sum += vGap * (children.length - 1);
        const height = Math.max(h, sum);
        subtreeHeightCache.set(nodeId, height);
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
        doc: any,
        nodeId: string,
        ctx: CanvasRenderingContext2D,
        nodeX: number,
        topY: number,
        hGap: number,
        vGap: number
    ): void {
        const activeMind = getActiveMind(doc);
        const n = activeMind?.nodes?.[nodeId];
        if (!n) return;

        const m = measureNode(ctx, n, nodeId);
        const sh = subtreeHeight(doc, nodeId, ctx, vGap);

        // 在子树区域内垂直居中
        const y = topY + (sh - m.h) / 2;
        layoutLocal.set(nodeId, { x: nodeX, y, w: m.w, h: m.h });

        const children: string[] = n.collapsed ? [] : (n.children || []);
        if (!children.length) return;

        let childrenTotalHeight = 0;
        for (const cid of children) childrenTotalHeight += subtreeHeight(doc, cid, ctx, vGap);
        childrenTotalHeight += vGap * (children.length - 1);

        // 当父节点自身比 children block 更高时，children block 也要在该子树区域内垂直居中。
        let cursorY = topY + (sh - childrenTotalHeight) / 2;
        for (const cid of children) {
            const ch = subtreeHeight(doc, cid, ctx, vGap);
            place(doc, cid, ctx, nodeX + m.w + hGap, cursorY, hGap, vGap);
            cursorY += ch + vGap;
        }
    }

    /**
     * 重新计算整棵思维导图的布局。
     * 清空 `layoutLocal` 后，从第一个 root 开始递归放置所有节点。
     * 需在每次文档变更或画布尺寸变更后调用。
     */
    function rebuildLayout(): void {
        const d = props.doc;
        const c = canvasRef.value;
        if (!d || !c) return;

        const ctx = c.getContext('2d');
        if (!ctx) return;

        ensureMindRoots(d);
        const activeMind = getActiveMind(d);
        if (!activeMind) return;

        layoutLocal.clear();
        subtreeHeightCache.clear();
        const roots = Array.isArray(activeMind.roots) ? activeMind.roots : [];

        for (const root of roots) {
            const rootId = root?.rootId;
            if (!rootId) continue;
            const rootPos = root.pos || { x: 0, y: 0 };
            const hGap = root.layout?.hGap ?? 60;
            const vGap = root.layout?.vGap ?? 18;
            place(d, rootId, ctx, rootPos.x, rootPos.y, hGap, vGap);
        }

        rebuildBounds();
    }

    return { layoutLocal, layoutBounds, measureCache, rebuildLayout };
}
