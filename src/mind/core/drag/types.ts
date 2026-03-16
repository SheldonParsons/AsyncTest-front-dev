export type DropTargetType = 'child' | 'sibling-before' | 'sibling-after';

export type DragDropTarget = {
  type: DropTargetType;
  targetNodeId: string;
  toParentId: string;
  toIndex: number;
};

export type DragDropState = {
  isDragging: boolean;
  dragRoots: string[];
  dragRootTexts: string[];
  primaryDragRootId: string | null;
  rootId: string | null;
  draggedSubtreeNodeIds: Set<string>;
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
