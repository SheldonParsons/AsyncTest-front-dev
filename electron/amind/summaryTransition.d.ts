export type SummaryReference = {
  id: string;
  summaryNodeId: string;
  startIndex: number;
  endIndex: number;
};

export type SummaryBoard = {
  nodes: Record<string, any>;
  roots?: Array<{ rootId: string }>;
  relations?: Array<{ id: string; fromNodeId: string; toNodeId: string }>;
};

export type SummaryTransition = {
  readonly hasRemovedSummaries: boolean;
  readonly removedNodeIds: string[];
  apply(board: SummaryBoard | null | undefined): void;
  undo(board: SummaryBoard | null | undefined): void;
};

export function structuralChildIds(node: any): string[];
export function remapSummariesByChildren<T extends { startIndex: number; endIndex: number }>(summaries: T[], beforeChildren: string[], afterChildren: string[]): T[];
export function createSummaryTransition(board: SummaryBoard | null | undefined, beforeByParent: Map<string, SummaryReference[]>, afterByParent: Map<string, SummaryReference[]>): SummaryTransition;
export function createMoveSummaryTransition(board: SummaryBoard, beforeChildren: Record<string, string[]>, afterChildren: Record<string, string[]>, movingIds: string[], targetParentId: string): SummaryTransition;
