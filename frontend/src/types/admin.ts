import type {
  AgencyStatus,
  AgencyType,
  Category,
  IncidentStatus,
  Severity,
} from "./report";

export interface AdminIncidentAgency {
  agencyType: AgencyType;
  status: AgencyStatus;
}

export interface TimelineEvent {
  id: number;
  type: string;
  message: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface AdminIncident {
  id: number;
  status: IncidentStatus;
  severity: Severity;
  categories: Category[];
  report: {
    description: string;
    address: string;
  };
  agencies: AdminIncidentAgency[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentListResponse {
  items: AdminIncident[];
  total: number;
}
