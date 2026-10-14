import { readReportSourceBuffer } from "./sourceContent";
import { loadExcelWorkbookBytes } from "../../../../electron/generator/core/excelParser.js";
import type { ReportExcelSourceFile } from "./types";
export { buildExcelParseResult } from "../../../../electron/generator/core/excelParser.js";
export type { ExcelWorkbookSnapshot } from "../../../../electron/generator/core/excelParser.js";
export async function loadExcelWorkbook(source: ReportExcelSourceFile) {
  return loadExcelWorkbookBytes(await readReportSourceBuffer(source));
}
