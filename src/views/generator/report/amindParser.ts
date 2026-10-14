import { readReportSourceBuffer } from "./sourceContent";
import { parseAmindBytes } from "../../../../electron/generator/core/amindParser.js";
import type { ReportAmindSourceFile } from "./types";
export async function parseAmindFile(source: ReportAmindSourceFile) {
  return parseAmindBytes(source, await readReportSourceBuffer(source));
}
