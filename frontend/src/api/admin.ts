import type { AgencyType, IncidentStatus, Severity } from "../types/report";
import type { IncidentListResponse } from "../types/admin";

interface IncidentListFilters {
  incidentStatus?: IncidentStatus;
  severity?: Severity;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? "요청을 처리하지 못했습니다.");
  }

  return data as T;
}

export function getAdminIncidents(filters: IncidentListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.incidentStatus) params.set("incidentStatus", filters.incidentStatus);
  if (filters.severity) params.set("severity", filters.severity);
  const query = params.toString();

  return request<IncidentListResponse>(`/api/incidents${query ? `?${query}` : ""}`);
}

export function changeIncidentSeverity(incidentId: number, severity: Severity) {
  return request(`/api/incidents/${incidentId}/severity`, {
    method: "PATCH",
    body: JSON.stringify({ severity }),
  });
}

export function addIncidentAgency(incidentId: number, agencyType: AgencyType) {
  return request(`/api/incidents/${incidentId}/agencies`, {
    method: "POST",
    body: JSON.stringify({ agencyType }),
  });
}

export function closeIncident(incidentId: number) {
  return request(`/api/incidents/${incidentId}/close`, {
    method: "PATCH",
  });
}
