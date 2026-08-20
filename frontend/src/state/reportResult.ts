import type { CreateReportResponse } from "../types/report";

const REPORT_RESULT_KEY = "onereport:report-result";

interface ReportResultStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReportResult(value: unknown): value is CreateReportResponse {
  if (!isRecord(value) || !isRecord(value.report) || !isRecord(value.incident)) {
    return false;
  }

  return (
    typeof value.report.id === "number" &&
    typeof value.report.description === "string" &&
    typeof value.report.address === "string" &&
    typeof value.report.latitude === "number" &&
    typeof value.report.longitude === "number" &&
    (typeof value.report.imageUrl === "string" || value.report.imageUrl === null) &&
    typeof value.report.createdAt === "string" &&
    typeof value.incident.id === "number" &&
    typeof value.incident.status === "string" &&
    typeof value.incident.severity === "string" &&
    Array.isArray(value.incident.categories) &&
    value.incident.categories.every((category) => typeof category === "string") &&
    typeof value.incident.createdAt === "string" &&
    typeof value.incident.updatedAt === "string" &&
    Array.isArray(value.agencies) &&
    value.agencies.every(
      (agency) =>
        isRecord(agency) &&
        typeof agency.agencyType === "string" &&
        typeof agency.status === "string" &&
        typeof agency.assignedAt === "string" &&
        typeof agency.updatedAt === "string",
    )
  );
}

export function saveReportResult(
  result: CreateReportResponse,
  storage: ReportResultStorage = sessionStorage,
) {
  storage.setItem(REPORT_RESULT_KEY, JSON.stringify(result));
}

export function loadReportResult(
  storage: ReportResultStorage = sessionStorage,
): CreateReportResponse | null {
  const stored = storage.getItem(REPORT_RESULT_KEY);
  if (!stored) return null;

  try {
    const parsed: unknown = JSON.parse(stored);
    if (isReportResult(parsed)) return parsed;
    storage.removeItem(REPORT_RESULT_KEY);
    return null;
  } catch {
    storage.removeItem(REPORT_RESULT_KEY);
    return null;
  }
}

export function loadReportResultForIncident(
  incidentId: number,
  storage: ReportResultStorage = sessionStorage,
): CreateReportResponse | null {
  const result = loadReportResult(storage);
  return result?.incident.id === incidentId ? result : null;
}
