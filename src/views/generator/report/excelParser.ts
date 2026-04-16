import * as XLSX from "xlsx";
import { ApiDownloadProjectFile } from "@/api/project/index";
import { EMPTY_MODULE_LABEL } from "./types";
import type {
  ReportExcelColumnMapping,
  ReportExcelParseResult,
  ReportExcelPreviewRow,
  ReportExcelSourceFile,
  ReportSelectOption,
} from "./types";

type ExcelColumnMeta = {
  value: string;
  header: string;
  label: string;
};

type ExcelSheetSnapshot = {
  name: string;
  headers: string[];
  rows: string[][];
  columns: ExcelColumnMeta[];
};

export type ExcelWorkbookSnapshot = {
  sheetOptions: ReportSelectOption[];
  sheets: Record<string, ExcelSheetSnapshot>;
};

function normalizeCellValue(value: unknown) {
  return `${value ?? ""}`.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeMatchValue(value: string) {
  return normalizeCellValue(value).replace(/\s+/g, "").toLowerCase();
}

function toColumnLabel(index: number) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const rest = (value - 1) % 26;
    result = String.fromCharCode(65 + rest) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function buildColumns(headers: string[]) {
  return headers.map((header, index) => ({
    value: `${index}`,
    header,
    label: `${header || "未命名列"}（${toColumnLabel(index)}列）`,
  }));
}

function sortColumnOptions(columns: ExcelColumnMeta[], keyword: string) {
  const exact: ExcelColumnMeta[] = [];
  const includes: ExcelColumnMeta[] = [];
  const others: ExcelColumnMeta[] = [];
  const normalizedKeyword = normalizeMatchValue(keyword);

  columns.forEach((column) => {
    const normalizedHeader = normalizeMatchValue(column.header);
    if (!normalizedHeader) {
      others.push(column);
      return;
    }
    if (normalizedHeader === normalizedKeyword) {
      exact.push(column);
      return;
    }
    if (normalizedHeader.includes(normalizedKeyword)) {
      includes.push(column);
      return;
    }
    others.push(column);
  });

  return [...exact, ...includes, ...others].map((column) => ({
    value: column.value,
    label: column.label,
  }));
}

function pickDefaultColumn(columns: ExcelColumnMeta[], keyword: string) {
  const normalizedKeyword = normalizeMatchValue(keyword);
  const exactMatched = columns.find((column) => normalizeMatchValue(column.header) === normalizedKeyword);
  if (exactMatched) return exactMatched.value;

  const includesMatched = columns.find((column) => normalizeMatchValue(column.header).includes(normalizedKeyword));
  return includesMatched?.value ?? "";
}

function buildPreviewRows(rows: Array<{ module: string; requirement: string; owner: string }>): ReportExcelPreviewRow[] {
  const groupedRows = Array.from(
    rows.reduce<Map<string, Array<{ module: string; requirement: string; owner: string }>>>((accumulator, row) => {
      const groupKey = row.module || "__EMPTY_MODULE__";
      const currentGroup = accumulator.get(groupKey) || [];
      currentGroup.push(row);
      accumulator.set(groupKey, currentGroup);
      return accumulator;
    }, new Map()).values()
  ).flat();

  const previewRows = groupedRows.map((row, index) => ({
    id: `${index}`,
    ...row,
    showModule: true,
    showRequirement: true,
    showOwner: true,
    moduleRowSpan: 1,
    requirementRowSpan: 1,
    ownerRowSpan: 1,
  }));

  const mergeByKey = (key: "module" | "requirement" | "owner", spanKey: "moduleRowSpan" | "requirementRowSpan" | "ownerRowSpan", showKey: "showModule" | "showRequirement" | "showOwner") => {
    let startIndex = 0;
    while (startIndex < previewRows.length) {
      const currentValue = previewRows[startIndex][key];
      let endIndex = startIndex + 1;
      while (endIndex < previewRows.length && previewRows[endIndex][key] === currentValue) {
        endIndex += 1;
      }

      previewRows[startIndex][spanKey] = endIndex - startIndex;
      for (let index = startIndex + 1; index < endIndex; index += 1) {
        previewRows[index][showKey] = false;
        previewRows[index][spanKey] = 0;
      }
      startIndex = endIndex;
    }
  };

  mergeByKey("module", "moduleRowSpan", "showModule");
  mergeByKey("requirement", "requirementRowSpan", "showRequirement");
  mergeByKey("owner", "ownerRowSpan", "showOwner");
  return previewRows;
}

function resolveSheet(workbook: ExcelWorkbookSnapshot, sheetName?: string) {
  const selectedSheet = sheetName && workbook.sheets[sheetName] ? sheetName : workbook.sheetOptions[0]?.value ?? "";
  const sheet = workbook.sheets[selectedSheet];
  if (!sheet) {
    throw new Error("Excel 中不存在可解析的 Sheet");
  }
  return {
    selectedSheet,
    sheet,
  };
}

export async function loadExcelWorkbook(sourceFile: ReportExcelSourceFile): Promise<ExcelWorkbookSnapshot> {
  let fileBuffer: ArrayBuffer;

  if (sourceFile.backendFileId) {
    const response = await ApiDownloadProjectFile({ id: sourceFile.backendFileId });
    const blob: Blob = response.data;
    fileBuffer = await blob.arrayBuffer();
  } else {
    const response = await fetch(sourceFile.downloadUrl);
    if (!response.ok) {
      throw new Error(`下载 Excel 失败：${response.status}`);
    }
    fileBuffer = await response.arrayBuffer();
  }
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetNames = Array.isArray(workbook.SheetNames) ? workbook.SheetNames.filter((item) => !!item) : [];
  if (!sheetNames.length) {
    throw new Error("Excel 中不存在可解析的 Sheet");
  }

  const sheets = sheetNames.reduce<Record<string, ExcelSheetSnapshot>>((result, sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const sourceRows = (XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    }) || []) as unknown[][];

    const headerRowIndex = sourceRows.findIndex((row) =>
      Array.isArray(row) && row.some((cell) => !!normalizeCellValue(cell))
    );
    if (headerRowIndex === -1) {
      result[sheetName] = {
        name: sheetName,
        headers: [],
        rows: [],
        columns: [],
      };
      return result;
    }

    const headerRow = sourceRows[headerRowIndex] ?? [];
    const headers = headerRow.map((cell) => normalizeCellValue(cell));
    const columns = buildColumns(headers);
    const rows = sourceRows.slice(headerRowIndex + 1).map((row) =>
      columns.map((column) => {
        const index = Number(column.value);
        return normalizeCellValue(Array.isArray(row) ? row[index] : "");
      })
    );

    result[sheetName] = {
      name: sheetName,
      headers,
      rows,
      columns,
    };
    return result;
  }, {});

  return {
    sheetOptions: sheetNames.map((sheetName) => ({
      value: sheetName,
      label: sheetName,
    })),
    sheets,
  };
}

export function buildExcelParseResult(
  sourceFile: ReportExcelSourceFile,
  workbook: ExcelWorkbookSnapshot,
  overrides?: {
    sheetName?: string;
    columnMapping?: Partial<ReportExcelColumnMapping>;
    excludedModules?: string[];
    excludedOwners?: string[];
  }
): ReportExcelParseResult {
  const { selectedSheet, sheet } = resolveSheet(workbook, overrides?.sheetName);
  const requirementColumnOptions = sortColumnOptions(sheet.columns, "需求");
  const moduleColumnOptions = sortColumnOptions(sheet.columns, "模块");
  const ownerColumnOptions = sortColumnOptions(sheet.columns, "负责人");

  const columnMapping: ReportExcelColumnMapping = {
    requirement:
      overrides?.columnMapping?.requirement && sheet.columns.some((column) => column.value === overrides.columnMapping?.requirement)
        ? overrides.columnMapping.requirement
        : pickDefaultColumn(sheet.columns, "需求"),
    module:
      overrides?.columnMapping?.module && sheet.columns.some((column) => column.value === overrides.columnMapping?.module)
        ? overrides.columnMapping.module
        : pickDefaultColumn(sheet.columns, "模块"),
    owner:
      overrides?.columnMapping?.owner && sheet.columns.some((column) => column.value === overrides.columnMapping?.owner)
        ? overrides.columnMapping.owner
        : pickDefaultColumn(sheet.columns, "负责人"),
  };

  const missingFields = [
    !columnMapping.requirement ? "需求列" : "",
    !columnMapping.module ? "模块列" : "",
    !columnMapping.owner ? "负责人列" : "",
  ].filter((item) => !!item);

  if (!sheet.columns.length) {
    return {
      fileId: sourceFile.id,
      fileName: sourceFile.name,
      projectId: sourceFile.projectId,
      projectName: sourceFile.projectName,
      status: "error",
      errorMessage: "当前 Sheet 没有可识别的表头",
      sheetOptions: workbook.sheetOptions,
      selectedSheet,
      requirementColumnOptions,
      moduleColumnOptions,
      ownerColumnOptions,
      columnMapping,
      previewRows: [],
      uniqueOwners: [],
      uniqueModules: [],
      hasEmptyModule: false,
      excludedOwners: [],
      excludedModules: [],
      rowCount: 0,
    };
  }

  if (missingFields.length) {
    return {
      fileId: sourceFile.id,
      fileName: sourceFile.name,
      projectId: sourceFile.projectId,
      projectName: sourceFile.projectName,
      status: "error",
      errorMessage: `未自动识别到${missingFields.join("、")}，请手动指定列名`,
      sheetOptions: workbook.sheetOptions,
      selectedSheet,
      requirementColumnOptions,
      moduleColumnOptions,
      ownerColumnOptions,
      columnMapping,
      previewRows: [],
      uniqueOwners: [],
      uniqueModules: [],
      hasEmptyModule: false,
      excludedOwners: overrides?.excludedOwners ?? [],
      excludedModules: overrides?.excludedModules ?? [],
      rowCount: 0,
    };
  }

  const requirementIndex = Number(columnMapping.requirement);
  const moduleIndex = Number(columnMapping.module);
  const ownerIndex = Number(columnMapping.owner);

  const excludedModules = Array.from(new Set((overrides?.excludedModules ?? []).filter((item) => !!item)));
  const excludedOwners = Array.from(new Set((overrides?.excludedOwners ?? []).filter((item) => !!item)));

  const rawRows = sheet.rows
    .map((row) => ({
      module: normalizeCellValue(row[moduleIndex]),
      requirement: normalizeCellValue(row[requirementIndex]),
      owner: normalizeCellValue(row[ownerIndex]),
    }))
    .filter((row) => row.module || row.requirement || row.owner);

  const hasEmptyModule = rawRows.some((row) => !row.module);
  const rows = rawRows
    .map((row) => ({
      ...row,
      module: row.module || EMPTY_MODULE_LABEL,
    }))
    .filter((row) => !excludedModules.includes(row.module) && !excludedOwners.includes(row.owner));

  return {
    fileId: sourceFile.id,
    fileName: sourceFile.name,
    projectId: sourceFile.projectId,
    projectName: sourceFile.projectName,
    status: "success",
    errorMessage: "",
    sheetOptions: workbook.sheetOptions,
    selectedSheet,
    requirementColumnOptions,
    moduleColumnOptions,
    ownerColumnOptions,
    columnMapping,
    previewRows: buildPreviewRows(rows),
    uniqueOwners: Array.from(new Set(rows.map((row) => row.owner).filter((item) => !!item))),
    uniqueModules: Array.from(new Set(rows.map((row) => row.module).filter((item) => !!item && item !== EMPTY_MODULE_LABEL))),
    hasEmptyModule,
    excludedOwners,
    excludedModules,
    rowCount: rows.length,
  };
}
