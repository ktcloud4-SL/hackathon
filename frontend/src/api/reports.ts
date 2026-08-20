import type {
  CreateReportInput,
  CreateReportResponse,
  MyReportsResponse,
} from "../types/report";
import { requestJson } from "./http";

export async function createReport(
  input: CreateReportInput,
): Promise<CreateReportResponse> {
  const body = new FormData();
  body.append("description", input.description);
  body.append("address", input.address);
  body.append("latitude", String(input.latitude));
  body.append("longitude", String(input.longitude));

  if (input.image) body.append("image", input.image);
  if (input.categoryHint) body.append("categoryHint", input.categoryHint);

  const response = await fetch("/api/reports", {
    method: "POST",
    credentials: "include",
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "신고를 접수하지 못했습니다.");
  }

  return data as CreateReportResponse;
}

export function getMyReports(): Promise<MyReportsResponse> {
  return requestJson<MyReportsResponse>("/api/reports/me");
}
