import type { IncidentDetail } from "../types/incident";
import type {
  AgencyIncidentListResponse,
  AgencyStatus,
  AgencyType,
  IncidentStatus,
  Severity,
} from "../types/report";
import { requestJson } from "./http";

interface AgencyIncidentFilters {
  incidentStatus?: IncidentStatus;
  agencyStatus?: AgencyStatus;
  severity?: Severity;
}

export function getMyAgencyIncidents(
  filters: AgencyIncidentFilters = {},
): Promise<AgencyIncidentListResponse> {
  const params = new URLSearchParams();
  if (filters.incidentStatus) params.set("incidentStatus", filters.incidentStatus);
  if (filters.agencyStatus) params.set("agencyStatus", filters.agencyStatus);
  if (filters.severity) params.set("severity", filters.severity);
  const query = params.toString();

  return requestJson<AgencyIncidentListResponse>(
    `/api/agencies/me/incidents${query ? `?${query}` : ""}`,
  );
}

export function changeMyAgencyStatus(
  incidentId: number,
  agencyType: AgencyType,
  status: AgencyStatus,
): Promise<IncidentDetail> {
  return requestJson<IncidentDetail>(`/api/incidents/${incidentId}/agencies/${agencyType}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function requestIncidentSupport(
  incidentId: number,
  targetAgencyType: AgencyType,
  reason: string,
): Promise<{
  incidentId: number;
  requesterAgencyType: AgencyType;
  targetAgencyType: AgencyType;
  status: AgencyStatus;
}> {
  return requestJson(`/api/incidents/${incidentId}/support`, {
    method: "POST",
    body: JSON.stringify({ targetAgencyType, reason }),
  });
}
