export type NodeId = string;

export type ViewportState = {
    scale: number;     // 例如 1
    offsetX: number;   // screen = world*scale + offset
    offsetY: number;
};

export type RootLayoutConfig = {
    direction: 'right';
    hGap: number; // 水平间距
    vGap: number; // 垂直间距
};

export type Root = {
    rootId: NodeId;
    pos: { x: number; y: number };     // 根节点锚点（世界坐标）
    layout: RootLayoutConfig;
};

export type TextRun = {
    text: string;
    bold?: boolean;
    color?: string;
    fontSize?: number;
};

export type Node = {
    id: NodeId;
    parentId: NodeId | null;
    childrenIds: NodeId[];

    // 内容（第一期先用纯文本，后续再改成 runs）
    text: string; // 或 runs: TextRun[]

    // 视觉属性（第一期可先不用）
    icon?: string | null;

    // 图片引用（第一期可先留空）
    image?: { assetId: string; ext: string; w?: number; h?: number } | null;

    collapsed?: boolean;
};

export type AmindDoc = {
    version: number;

    roots: Root[];
    nodesById: Record<NodeId, Node>;

    view: {
        viewport: ViewportState;
    };
};