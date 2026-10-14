import type { ReportAmindSourceFile, ReportAmindParseResult } from '../../../src/views/generator/report/types';
export function parseAmindBytes(source: ReportAmindSourceFile, bytes: ArrayBuffer | Uint8Array): Promise<ReportAmindParseResult>;
