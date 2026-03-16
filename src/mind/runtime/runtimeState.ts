import type { NodeId } from '../model/amindDoc';

export type NodeMeasure = { w: number; h: number };
export type NodeLayoutLocal = { x: number; y: number; w: number; h: number };

export type RuntimeState = {
    // 每个节点测量尺寸缓存（由文本/图标/图片决定）
    measureById: Map<NodeId, NodeMeasure>;

    // 每个节点相对其 root 的布局结果（local space）
    layoutLocalById: Map<NodeId, NodeLayoutLocal>;

    // 方便命中：节点属于哪个 root（可选但很有用）
    rootOfNode: Map<NodeId, NodeId>;
};