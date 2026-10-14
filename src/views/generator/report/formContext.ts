import type { InjectionKey } from "vue";
import type { ReportIssue } from "./validation";
export const reportFormContext: InjectionKey<{
  issue: (name: string) => ReportIssue | undefined;
  touch: (name: string) => void;
}> = Symbol("report-form");
