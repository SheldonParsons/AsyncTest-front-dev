import JSZip from "jszip";
import type { ReportAmindParseResult, ReportAmindSourceFile, ReportSelectOption } from "./types";

type AmindDoc = {
  mind?: {
    order?: string[];
    minds?: Record<string, any>;
  };
};

const PASS_MARKER = "task:100";
const ERROR_MARKER = "other:error";
const REUSE_MARKER = "other:lightbulb";

function toMarkerSet(node: any) {
  return new Set<string>(Array.isArray(node?.markers) ? node.markers.filter((item: unknown): item is string => typeof item === "string") : []);
}

function resolveRootIds(board: any) {
  const rootIds = Array.isArray(board?.roots)
    ? board.roots
        .map((item: any) => `${item?.rootId ?? ""}`.trim())
        .filter((item: string) => !!item)
    : [];

  if (!rootIds.length) {
    throw new Error("amind 第一个画板未找到根节点");
  }

  return rootIds;
}

function resolveBoardTitle(board: any, nodes: Record<string, any>, rootIds: string[]) {
  const boardTitle = `${board?.title ?? ""}`.trim();
  if (boardTitle) return boardTitle;

  const rootTitle = `${nodes[rootIds[0]]?.text?.plain ?? nodes[rootIds[0]]?.text ?? nodes[rootIds[0]]?.title ?? ""}`.trim();
  return rootTitle || "第一个画板";
}

function resolveBoards(doc: AmindDoc) {
  const order = Array.isArray(doc?.mind?.order) ? doc.mind.order : [];
  if (!order.length) {
    throw new Error("amind 中不存在可解析的画板");
  }

  const boards = order
    .map((boardId) => {
      const board = doc?.mind?.minds?.[boardId];
      if (!board || !board.nodes) return null;
      const nodes = board.nodes as Record<string, any>;
      const rootIds = resolveRootIds(board);
      return {
        boardId,
        board,
        nodes,
        rootIds,
        boardTitle: resolveBoardTitle(board, nodes, rootIds),
      };
    })
    .filter(
      (
        item
      ): item is {
        boardId: string;
        board: any;
        nodes: Record<string, any>;
        rootIds: string[];
        boardTitle: string;
      } => !!item
    );

  if (!boards.length) {
    throw new Error("amind 画板结构无效");
  }

  return boards;
}

function resolveSelectedBoardIds(boardOptions: ReportSelectOption[], selectedBoardIds: string[]) {
  const selectedSet = new Set(selectedBoardIds);
  const normalized = boardOptions.filter((item) => selectedSet.has(item.value)).map((item) => item.value);
  if (normalized.length) return normalized;
  return boardOptions[0] ? [boardOptions[0].value] : [];
}

export async function parseAmindFile(sourceFile: ReportAmindSourceFile): Promise<ReportAmindParseResult> {
  const response = await fetch(sourceFile.downloadUrl);
  if (!response.ok) {
    throw new Error(`下载 amind 失败：${response.status}`);
  }

  const fileBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(fileBuffer);
  const manifestRaw = await zip.file("manifest.json")?.async("string");
  const mindRaw = await zip.file("mind.json")?.async("string");
  if (!manifestRaw || !mindRaw) {
    throw new Error("无效的 amind 文件，缺少 manifest.json 或 mind.json");
  }

  const doc = {
    manifest: JSON.parse(manifestRaw),
    mind: JSON.parse(mindRaw),
  } as AmindDoc;

  const boards = resolveBoards(doc);
  const boardOptions = boards.map((item) => ({
    value: item.boardId,
    label: item.boardTitle,
  }));
  const selectedBoardIds = resolveSelectedBoardIds(boardOptions, sourceFile.selectedBoardIds ?? []);
  const selectedBoardIdSet = new Set(selectedBoardIds);
  const selectedBoards = boards.filter((item) => selectedBoardIdSet.has(item.boardId));
  const boardTitle = selectedBoards.length === 1
    ? selectedBoards[0].boardTitle
    : selectedBoards.length > 1
      ? `${selectedBoards[0].boardTitle} 等 ${selectedBoards.length} 个 Tab`
      : "第一个画板";
  const boardId = selectedBoards[0]?.boardId ?? boards[0]?.boardId ?? "";
  const includeFreeNodes = sourceFile.includeFreeNodes === true;

  let totalCaseCount = 0;
  let passedCaseCount = 0;
  let failedCaseCount = 0;
  let pendingCaseCount = 0;
  let reusedCaseCount = 0;

  const walk = (nodes: Record<string, any>, nodeId: string, inheritedError: boolean, inheritedReuse: boolean) => {
    const node = nodes[nodeId];
    if (!node) return;

    const markerSet = toMarkerSet(node);
    const currentError = inheritedError || markerSet.has(ERROR_MARKER);
    const currentReuse = inheritedReuse || markerSet.has(REUSE_MARKER);
    const children = Array.isArray(node.children)
      ? node.children
          .map((item: any) => `${item ?? ""}`.trim())
          .filter((item: string) => !!item && !!nodes[item])
      : [];

    if (!children.length) {
      totalCaseCount += 1;

      if (currentReuse) {
        reusedCaseCount += 1;
      }

      if (currentError) {
        failedCaseCount += 1;
        return;
      }

      if (markerSet.has(PASS_MARKER)) {
        passedCaseCount += 1;
        return;
      }

      pendingCaseCount += 1;
      return;
    }

    children.forEach((childId) => {
      walk(nodes, childId, currentError, currentReuse);
    });
  };

  selectedBoards.forEach(({ board, nodes }) => {
    const rootIds = Array.isArray(board?.roots)
      ? board.roots
          .filter((root: any, index: number) => {
            if (typeof root?.rootId !== "string" || !nodes[root.rootId]) return false;
            if (includeFreeNodes) return true;
            if (root?.rootKind === "free") return false;
            if (root?.rootKind === "main") return true;
            return index === 0;
          })
          .map((root: any) => root.rootId)
      : [];

    rootIds.forEach((rootId) => {
      walk(nodes, rootId, false, false);
    });
  });

  const passRate = totalCaseCount > 0 ? `${((passedCaseCount / totalCaseCount) * 100).toFixed(2)}%` : "0.00%";

  return {
    fileId: sourceFile.id,
    fileName: sourceFile.name,
    projectId: sourceFile.projectId,
    projectName: sourceFile.projectName,
    boardId,
    boardTitle,
    boardOptions,
    selectedBoardIds,
    includeFreeNodes,
    totalCaseCount,
    passedCaseCount,
    failedCaseCount,
    pendingCaseCount,
    reusedCaseCount,
    passRate,
    status: "success",
    errorMessage: "",
  };
}
