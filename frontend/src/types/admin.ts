import type { IncidentDetail } from "./incident";

export type AdminIncident = IncidentDetail;

export interface IncidentListResponse {
  items: AdminIncident[];
  total: number;
}
