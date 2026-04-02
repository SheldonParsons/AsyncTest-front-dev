export type DropTargetType = 'child' | 'sibling-before' | 'sibling-after';

export type DragDropTarget = {
  type: DropTargetType;
  targetNodeId: string;
  toParentId: string;
  toIndex: number;
};

export type DragDropState = {
  isDragging: boolean;
  dragKind: 'subtree' | 'free-root';
  dragRoots: string[];
  dragRootTexts: string[];
  dragRootTextLayouts: Array<{ nodeId: string; text: string; lines: string[]; lineHeightPx: number }>;
  primaryDragRootId: string | null;
  rootId: string | null;
  draggedSubtreeNodeIds: Set<string>;
  previewWorldOffsetX: number;
  previewWorldOffsetY: number;
  freeRootBasePosX: number | null;
  freeRootBasePosY: number | null;
  cursorScreenX: number;
  cursorScreenY: number;
  dropTarget: DragDropTarget | null;
  lastValidDropTarget: DragDropTarget | null;
  invalidReason: string | null;
  filteredOutDescendantsCount: number;
  autoPanActive: boolean;
  autoPanVelocityX: number;
  autoPanVelocityY: number;
};
