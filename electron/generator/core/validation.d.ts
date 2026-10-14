import type { ReportDraftState } from '../../../src/views/generator/report/types';
import type { ReportIssue } from '../../../src/views/generator/report/validation';
export function validReportDate(value: string): boolean;
export function collectReportIssues(state: ReportDraftState): ReportIssue[];
