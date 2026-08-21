import type { AdminIncident } from "../types/admin";
import type { TimelineEvent } from "../types/incident";
import type {
  AgencyStatus,
  AgencyType,
  IncidentStatus,
  ReportTrack,
  Severity,
} from "../types/report";

export type TrackFilter = ReportTrack | "ALL";

const agencyLabels: Record<AgencyType, string> = {
  POLICE: "경찰",
  FIRE: "소방·구급",
  KEPCO: "한국전력",
  ROAD: "도로관리",
  GAS: "가스안전",
  LOCAL_GOV: "관할 지자체",
};

const compactAgencyLabels: Record<AgencyType, string> = {
  POLICE: "경찰",
  FIRE: "소방",
  KEPCO: "한전",
  ROAD: "도로",
  GAS: "가스",
  LOCAL_GOV: "지자체",
};

const emergencyAgencyStatusLabels: Record<AgencyStatus, string> = {
  ASSIGNED: "배정됨",
  RECEIVED: "접수",
  DISPATCHED: "출동",
  ARRIVED: "현장도착",
  IN_PROGRESS: "조치중",
  COMPLETED: "완료",
};

const civicAgencyStatusLabels: Record<AgencyStatus, string> = {
  ASSIGNED: "담당 배정",
  RECEIVED: "접수",
  DISPATCHED: "처리 준비",
  ARRIVED: "현장 확인",
  IN_PROGRESS: "처리 중",
  COMPLETED: "완료",
};

const severityLabels: Record<Severity, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "긴급",
};

const emergencyIncidentStatusDetails: Record<IncidentStatus, { label: string; copy: string }> = {
  OPEN: { label: "기관 접수 대기", copy: "필요한 기관에 신고가 배정되었습니다." },
  RESPONDING: { label: "공동대응 중", copy: "한 곳 이상의 기관이 신고를 확인하고 대응 중입니다." },
  RESOLVED: { label: "대응 완료", copy: "참여 기관의 대응이 완료되었습니다." },
  CLOSED: { label: "상황 종료", copy: "관리자가 Incident를 최종 종료했습니다." },
};

const civicIncidentStatusDetails: Record<IncidentStatus, { label: string; copy: string }> = {
  OPEN: { label: "담당기관 접수 대기", copy: "신고 내용에 맞는 담당기관에 연결되었습니다." },
  RESPONDING: { label: "공공신고 처리 중", copy: "담당기관이 신고를 확인하고 처리하고 있습니다." },
  RESOLVED: { label: "처리 완료", copy: "담당기관의 신고 처리가 완료되었습니다." },
  CLOSED: { label: "처리 종료", copy: "공공신고 처리가 최종 종료되었습니다." },
};

const agencyTypes = new Set<AgencyType>(Object.keys(agencyLabels) as AgencyType[]);
const agencyStatuses = new Set<AgencyStatus>(Object.keys(emergencyAgencyStatusLabels) as AgencyStatus[]);
const severities = new Set<Severity>(Object.keys(severityLabels) as Severity[]);

function isAgencyType(value: unknown): value is AgencyType {
  return typeof value === "string" && agencyTypes.has(value as AgencyType);
}

function isAgencyStatus(value: unknown): value is AgencyStatus {
  return typeof value === "string" && agencyStatuses.has(value as AgencyStatus);
}

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && severities.has(value as Severity);
}

export function getTrackLabel(track: ReportTrack, compact = false): string {
  if (track === "CIVIC") return compact ? "생활·공공" : "생활·공공신고";
  return compact ? "긴급·복합" : "긴급·복합대응";
}

export function getAgencyStatusLabel(track: ReportTrack, status: AgencyStatus): string {
  return track === "CIVIC"
    ? civicAgencyStatusLabels[status]
    : emergencyAgencyStatusLabels[status];
}

export function getIncidentStatusDetail(track: ReportTrack, status: IncidentStatus) {
  return track === "CIVIC"
    ? civicIncidentStatusDetails[status]
    : emergencyIncidentStatusDetails[status];
}

export function filterAgencyIncidents(
  incidents: AdminIncident[],
  agencyType: AgencyType,
  query: string,
  trackFilter: TrackFilter,
  statusFilter: AgencyStatus | "ALL",
): AdminIncident[] {
  const normalizedQuery = query.trim().toLowerCase();

  return incidents.filter((incident) => {
    const currentAgency = incident.agencies.find((agency) => agency.agencyType === agencyType);
    const matchesSearch =
      !normalizedQuery ||
      String(incident.id).includes(normalizedQuery) ||
      incident.report.description.toLowerCase().includes(normalizedQuery) ||
      incident.report.address.toLowerCase().includes(normalizedQuery);
    const matchesTrack = trackFilter === "ALL" || incident.track === trackFilter;
    const matchesStatus = statusFilter === "ALL" || currentAgency?.status === statusFilter;
    return matchesSearch && matchesTrack && matchesStatus;
  });
}

export function getCompactAgencyLabel(agencyType: AgencyType): string {
  return compactAgencyLabels[agencyType];
}

export function filterAdminIncidents(
  incidents: AdminIncident[],
  query: string,
  trackFilter: TrackFilter,
  statusFilter: IncidentStatus | "ALL",
  severityFilter: Severity | "ALL",
): AdminIncident[] {
  const normalizedQuery = query.trim().toLowerCase();

  return incidents.filter((incident) => {
    const matchesSearch =
      !normalizedQuery ||
      String(incident.id).includes(normalizedQuery) ||
      incident.report.description.toLowerCase().includes(normalizedQuery) ||
      incident.report.address.toLowerCase().includes(normalizedQuery);
    const matchesTrack = trackFilter === "ALL" || incident.track === trackFilter;
    const matchesStatus = statusFilter === "ALL" || incident.status === statusFilter;
    const matchesSeverity = severityFilter === "ALL" || incident.severity === severityFilter;
    return matchesSearch && matchesTrack && matchesStatus && matchesSeverity;
  });
}

export function formatTimelineMessage(event: TimelineEvent, track: ReportTrack): string {
  const status = event.metadata.status;
  const agencyType = event.metadata.agencyType;

  if (event.type === "AGENCY_STATUS_CHANGED" && isAgencyStatus(status)) {
    const agency = isAgencyType(agencyType) ? agencyLabels[agencyType] : "담당기관";
    const statusKind = track === "CIVIC" ? "처리" : "대응";
    return `${agency} ${statusKind} 상태가 ‘${getAgencyStatusLabel(track, status)}’ 단계로 변경되었습니다.`;
  }

  if (event.type === "INCIDENT_CREATED") {
    return track === "CIVIC"
      ? "생활·공공신고 처리 건이 생성되었습니다."
      : "긴급·복합대응 Incident가 생성되었습니다.";
  }

  if (event.type === "INCIDENT_RESOLVED") {
    return getIncidentStatusDetail(track, "RESOLVED").copy;
  }

  if (event.type === "SEVERITY_CHANGED" && isSeverity(event.metadata.severity)) {
    return `긴급도가 ‘${severityLabels[event.metadata.severity]}’ 단계로 변경되었습니다.`;
  }

  if (event.type === "SUPPORT_REQUESTED" && isAgencyType(event.metadata.targetAgencyType)) {
    return `${agencyLabels[event.metadata.targetAgencyType]}에 추가 지원을 요청했습니다.`;
  }

  let message = event.message;
  const labels = track === "CIVIC" ? civicAgencyStatusLabels : emergencyAgencyStatusLabels;
  for (const [rawStatus, label] of Object.entries(labels)) {
    message = message.replaceAll(rawStatus, label);
  }
  for (const [rawSeverity, label] of Object.entries(severityLabels)) {
    message = message.replaceAll(rawSeverity, label);
  }
  for (const [rawAgency, label] of Object.entries(agencyLabels)) {
    message = message.replaceAll(rawAgency, label);
  }
  if (track === "CIVIC") message = message.replaceAll("대응 상태", "처리 상태");
  return message.replaceAll("(으)로", " 단계로");
}
