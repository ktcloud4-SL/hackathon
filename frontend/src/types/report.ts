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
  categoryHint?: Category;
}

export interface CreateReportResponse {
  report: {
    id: number;
    description: string;
    address: string;
    imageUrl: string | null;
  };
  incident: {
    id: number;
    status: IncidentStatus;
    severity: Severity;
    categories: Category[];
    createdAt: string;
  };
  agencies: Array<{
    agencyType: AgencyType;
    status: AgencyStatus;
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
  };
}

export interface MyReportsResponse {
  items: MyReportItem[];
  total: number;
}
