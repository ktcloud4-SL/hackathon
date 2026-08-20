import type { CreateReportResponse } from "../types/report";

const REPORT_RESULT_KEY = "onereport:report-result";

export function saveReportResult(result: CreateReportResponse) {
  sessionStorage.setItem(REPORT_RESULT_KEY, JSON.stringify(result));
}

export function loadReportResult(): CreateReportResponse | null {
  const stored = sessionStorage.getItem(REPORT_RESULT_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as CreateReportResponse;
  } catch {
    sessionStorage.removeItem(REPORT_RESULT_KEY);
    return null;
  }
}
