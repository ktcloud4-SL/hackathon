import type { AgencyType, IncidentStatus, Severity } from "../types/report";
import type { IncidentListResponse } from "../types/admin";
import type { IncidentDetail } from "../types/incident";
import { requestJson } from "./http";

interface IncidentListFilters {
  incidentStatus?: IncidentStatus;
  severity?: Severity;
}

export function getAdminIncidents(filters: IncidentListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.incidentStatus) params.set("incidentStatus", filters.incidentStatus);
  if (filters.severity) params.set("severity", filters.severity);
  const query = params.toString();

  return requestJson<IncidentListResponse>(`/api/incidents${query ? `?${query}` : ""}`);
}

export function changeIncidentSeverity(
  incidentId: number,
  severity: Severity,
): Promise<IncidentDetail> {
  return requestJson<IncidentDetail>(`/api/incidents/${incidentId}/severity`, {
    method: "PATCH",
    body: JSON.stringify({ severity }),
  });
}

export function addIncidentAgency(
  incidentId: number,
  agencyType: AgencyType,
): Promise<IncidentDetail> {
  return requestJson<IncidentDetail>(`/api/incidents/${incidentId}/agencies`, {
    method: "POST",
    body: JSON.stringify({ agencyType }),
  });
}

export function closeIncident(incidentId: number): Promise<IncidentDetail> {
  return requestJson<IncidentDetail>(`/api/incidents/${incidentId}/close`, {
    method: "PATCH",
  });
}
