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

export type NodeShapeStyle = {
    fill?: string;
    stroke?: string;
    fillPreset?: 'rough-hachure' | 'rough-cross' | 'rough-dots' | 'solid' | 'none';
    borderPreset?: 'clean' | 'rough-solid' | 'rough-dashed' | 'none';
    strokeWidthPx?: number;
};

export type NodeTextStyleOverrides = {
    fontFamily?: string;
    fontSizePx?: number;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
};

export type NodeStyle = {
    shape?: NodeShapeStyle | null;
    text?: NodeTextStyleOverrides | null;
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
    style?: NodeStyle | null;
};

export type AmindDoc = {
    version: number;

    roots: Root[];
    nodesById: Record<NodeId, Node>;

    view: {
        viewport: ViewportState;
    };
};
