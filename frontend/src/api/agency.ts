import type { AgencyStatus, AgencyType, IncidentStatus, Severity } from "../types/report";

interface AgencyIncidentFilters {
  incidentStatus?: IncidentStatus;
  agencyStatus?: AgencyStatus;
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

export function getMyAgencyIncidents(filters: AgencyIncidentFilters = {}) {
  const params = new URLSearchParams();
  if (filters.incidentStatus) params.set("incidentStatus", filters.incidentStatus);
  if (filters.agencyStatus) params.set("agencyStatus", filters.agencyStatus);
  if (filters.severity) params.set("severity", filters.severity);
  const query = params.toString();

  return request(`/api/agencies/me/incidents${query ? `?${query}` : ""}`);
}

export function changeMyAgencyStatus(
  incidentId: number,
  agencyType: AgencyType,
  status: AgencyStatus,
) {
  return request(`/api/incidents/${incidentId}/agencies/${agencyType}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function requestIncidentSupport(
  incidentId: number,
  targetAgencyType: AgencyType,
  reason: string,
) {
  return request(`/api/incidents/${incidentId}/support`, {
    method: "POST",
    body: JSON.stringify({ targetAgencyType, reason }),
  });
}
