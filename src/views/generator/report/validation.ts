import type { ReportDraftState } from "./types";

export type ReportPage =
  | "basic"
  | "environments"
  | "sources"
  | "review"
  | "history";
export type ReportIssue = {
  key: string;
  page: ReportPage;
  message: string;
  environmentId?: string;
  source?: "amind" | "excel";
};

export { collectReportIssues, validReportDate } from "../../../../electron/generator/core/validation.js";
