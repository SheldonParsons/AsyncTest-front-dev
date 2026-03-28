export type MindRemoteBinding = {
  projectId: string;
  projectName: string;
  folder: string;
  fileId: string | number | null;
  fileName: string;
  filePath: string;
  boundAt: string;
};

type ProjectOption = {
  value: string;
  label: string;
};

function normalizeString(value: unknown) {
  return `${value ?? ""}`.trim();
}

export function ensureAmindFileName(rawName: unknown, fallbackTitle = "思维导图") {
  const baseName = normalizeString(rawName) || normalizeString(fallbackTitle) || "思维导图";
  const sanitized = baseName
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const withFallback = sanitized || "思维导图";
  return withFallback.toLowerCase().endsWith(".amind") ? withFallback : `${withFallback}.amind`;
}

export function buildRemoteBindingFilePath(folder: unknown, fileName: unknown) {
  const normalizedFolder = normalizeString(folder).replace(/^\/+|\/+$/g, "");
  const normalizedName = ensureAmindFileName(fileName);
  return normalizedFolder ? `${normalizedFolder}/${normalizedName}` : normalizedName;
}

export function normalizeRemoteBinding(rawBinding: any): MindRemoteBinding | null {
  if (!rawBinding || typeof rawBinding !== "object") return null;
  const projectId = normalizeString(rawBinding.projectId ?? rawBinding.project_id);
  const fileName = ensureAmindFileName(rawBinding.fileName ?? rawBinding.file_name ?? rawBinding.name);
  const folder = normalizeString(rawBinding.folder);
  const filePath = normalizeString(rawBinding.filePath ?? rawBinding.file_path ?? rawBinding.path) || buildRemoteBindingFilePath(folder, fileName);
  if (!projectId || !fileName || !filePath) return null;
  return {
    projectId,
    projectName: normalizeString(rawBinding.projectName ?? rawBinding.project_name),
    folder,
    fileId: rawBinding.fileId ?? rawBinding.file_id ?? rawBinding.id ?? null,
    fileName,
    filePath,
    boundAt: normalizeString(rawBinding.boundAt ?? rawBinding.bound_at) || new Date().toISOString(),
  };
}

export function getRemoteBinding(doc: any): MindRemoteBinding | null {
  return normalizeRemoteBinding(doc?.manifest?.remoteBinding);
}

export function setRemoteBinding(doc: any, binding: MindRemoteBinding | null) {
  if (!doc) return;
  doc.manifest = doc.manifest || {};
  if (!binding) {
    delete doc.manifest.remoteBinding;
    return;
  }
  doc.manifest.remoteBinding = { ...binding };
}

export function formatRemoteBindingPath(binding: MindRemoteBinding | null) {
  if (!binding) return "未绑定";
  const pathText = normalizeString(binding.filePath) || buildRemoteBindingFilePath(binding.folder, binding.fileName);
  return pathText ? `/${pathText}` : `/${binding.fileName}`;
}

export function isSameRemoteBinding(left: MindRemoteBinding | null, right: MindRemoteBinding | null) {
  if (!left || !right) return false;
  const leftFileId = left.fileId === null || left.fileId === undefined ? "" : `${left.fileId}`;
  const rightFileId = right.fileId === null || right.fileId === undefined ? "" : `${right.fileId}`;
  if (left.projectId === right.projectId && leftFileId && rightFileId) {
    return leftFileId === rightFileId;
  }
  return left.projectId === right.projectId && left.filePath === right.filePath;
}

export function buildRemoteBindingFromTarget(target: {
  projectId: string | number;
  projectName?: string;
  folder?: string;
  fileId?: string | number | null;
  fileName: string;
  filePath?: string;
  boundAt?: string;
}) {
  return normalizeRemoteBinding({
    projectId: `${target.projectId ?? ""}`,
    projectName: target.projectName ?? "",
    folder: target.folder ?? "",
    fileId: target.fileId ?? null,
    fileName: target.fileName,
    filePath: target.filePath ?? buildRemoteBindingFilePath(target.folder ?? "", target.fileName),
    boundAt: target.boundAt ?? new Date().toISOString(),
  });
}

export function buildRemoteBindingFromSelectedFile(file: any, project: ProjectOption | null) {
  if (!file || !project?.value) return null;
  return buildRemoteBindingFromTarget({
    projectId: project.value,
    projectName: project.label,
    folder: normalizeString(file.folder),
    fileId: file.id ?? null,
    fileName: ensureAmindFileName(file.name),
    filePath: normalizeString(file.path) || buildRemoteBindingFilePath(file.folder, file.name),
  });
}
