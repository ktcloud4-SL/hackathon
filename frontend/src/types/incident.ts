import type {
  AgencyStatus,
  AgencyType,
  Category,
  IncidentStatus,
  ReportTrack,
  Severity,
} from "./report";

export type TimelineEventType =
  | "REPORT_CREATED"
  | "INCIDENT_CREATED"
  | "INCIDENT_CLASSIFIED"
  | "AGENCY_ASSIGNED"
  | "AGENCY_STATUS_CHANGED"
  | "SUPPORT_REQUESTED"
  | "SEVERITY_CHANGED"
  | "INCIDENT_RESOLVED"
  | "INCIDENT_CLOSED";

export interface TimelineEvent {
  id: number;
  type: TimelineEventType;
  message: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface IncidentAgency {
  agencyType: AgencyType;
  status: AgencyStatus;
  assignedAt: string;
  updatedAt: string;
}

export interface IncidentDetail {
  id: number;
  status: IncidentStatus;
  severity: Severity;
  categories: Category[];
  track: ReportTrack;
  report: {
    id: number;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    imageUrl: string | null;
    createdAt: string;
  };
  agencies: IncidentAgency[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface IncidentEventData {
  agencyType?: AgencyType;
  requesterAgencyType?: AgencyType;
  targetAgencyType?: AgencyType;
  previousStatus?: AgencyStatus;
  status?: AgencyStatus;
  incidentStatus?: IncidentStatus;
  severity?: Severity;
  reason?: string;
}

export interface IncidentStreamEvent {
  type: TimelineEventType;
  incidentId: number;
  occurredAt: string;
  data: IncidentEventData;
  timelineEvent?: TimelineEvent;
}

export interface TimelineResponse {
  items: TimelineEvent[];
  total: number;
}
