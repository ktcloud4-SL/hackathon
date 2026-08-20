export type Category =
  | "TRAFFIC_ACCIDENT"
  | "HUMAN_INJURY"
  | "ELECTRIC_DAMAGE"
  | "FIRE_RISK"
  | "ROAD_DAMAGE"
  | "GAS_RISK";

export type AgencyType = "POLICE" | "FIRE" | "KEPCO" | "ROAD" | "GAS";
export type AgencyStatus =
  | "ASSIGNED"
  | "RECEIVED"
  | "DISPATCHED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED";
export type IncidentStatus = "OPEN" | "RESPONDING" | "RESOLVED" | "CLOSED";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface CreateReportInput {
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  image?: File;
  categories: Category[];
}

export interface CreateReportResponse {
  report: {
    id: number;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    imageUrl: string | null;
    createdAt: string;
  };
  incident: {
    id: number;
    status: IncidentStatus;
    severity: Severity;
    categories: Category[];
    createdAt: string;
    updatedAt: string;
  };
  agencies: Array<{
    agencyType: AgencyType;
    status: AgencyStatus;
    assignedAt: string;
    updatedAt: string;
  }>;
}

export interface MyReportItem {
  id: number;
  description: string;
  address: string;
  imageUrl: string | null;
  createdAt: string;
  incident: {
    id: number;
    status: IncidentStatus;
    severity: Severity;
    categories: Category[];
    createdAt: string;
    updatedAt: string;
  };
}

export interface AgencyIncidentItem {
  id: number;
  incidentStatus: IncidentStatus;
  agencyStatus: AgencyStatus;
  severity: Severity;
  categories: Category[];
  description: string;
  address: string;
  assignedAt: string;
  updatedAt: string;
}

export interface AgencyIncidentListResponse {
  items: AgencyIncidentItem[];
  total: number;
}

export interface MyReportsResponse {
  items: MyReportItem[];
  total: number;
}
