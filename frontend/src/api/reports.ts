import type {
  CreateReportInput,
  CreateReportResponse,
  MyReportsResponse,
  ReportAnalysisInput,
  ReportAnalysisResponse,
} from "../types/report";
import { requestJson } from "./http";

export function analyzeReport(
  input: ReportAnalysisInput,
): Promise<ReportAnalysisResponse> {
  return requestJson<ReportAnalysisResponse>("/api/analyze-report", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createReport(
  input: CreateReportInput,
): Promise<CreateReportResponse> {
  const body = new FormData();
  body.append("description", input.description);
  body.append("address", input.address);
  body.append("latitude", String(input.latitude));
  body.append("longitude", String(input.longitude));

  if (input.image) body.append("image", input.image);
  input.categories.forEach((category) => body.append("categories", category));
  body.append("severity", input.severity);

  return requestJson<CreateReportResponse>("/api/reports", {
    method: "POST",
    body,
  });
}

export function getMyReports(): Promise<MyReportsResponse> {
  return requestJson<MyReportsResponse>("/api/reports/me");
}
