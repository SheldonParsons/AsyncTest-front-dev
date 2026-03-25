import JSZip from "jszip";
import type { ReportAmindParseResult, ReportAmindSourceFile } from "./types";

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

function resolveBoard(doc: AmindDoc) {
  const boardId = doc?.mind?.order?.[0];
  if (!boardId) {
    throw new Error("amind 中不存在可解析的画板");
  }

  const board = doc?.mind?.minds?.[boardId];
  if (!board || !board.nodes) {
    throw new Error("amind 第一个画板结构无效");
  }

  return {
    boardId,
    board,
  };
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

  const { boardId, board } = resolveBoard(doc);
  const nodes = board.nodes as Record<string, any>;
  const rootIds = resolveRootIds(board);
  const boardTitle = resolveBoardTitle(board, nodes, rootIds);

  let totalCaseCount = 0;
  let passedCaseCount = 0;
  let failedCaseCount = 0;
  let pendingCaseCount = 0;
  let reusedCaseCount = 0;

  const walk = (nodeId: string, inheritedError: boolean, inheritedReuse: boolean) => {
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
      walk(childId, currentError, currentReuse);
    });
  };

  rootIds.forEach((rootId) => {
    walk(rootId, false, false);
  });

  const passRate = totalCaseCount > 0 ? `${((passedCaseCount / totalCaseCount) * 100).toFixed(2)}%` : "0.00%";

  return {
    fileId: sourceFile.id,
    fileName: sourceFile.name,
    projectId: sourceFile.projectId,
    projectName: sourceFile.projectName,
    boardId,
    boardTitle,
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
