import type { IncidentDetail, TimelineEvent } from "../types/incident";
import type {
  AgencyType,
  Category,
  CreateReportInput,
  CreateReportResponse,
  MyReportItem,
  Severity,
} from "../types/report";

const REPORT_STORAGE_KEY = "onereport:last-report";

const categoryRules: Array<{ category: Category; keywords: string[] }> = [
  { category: "TRAFFIC_ACCIDENT", keywords: ["차량", "자동차", "교통", "충돌"] },
  { category: "HUMAN_INJURY", keywords: ["사람", "부상", "다쳤", "환자"] },
  { category: "ELECTRIC_DAMAGE", keywords: ["전봇대", "전선", "전기", "불꽃"] },
  { category: "FIRE_RISK", keywords: ["화재", "불이", "연기", "불꽃"] },
  { category: "ROAD_DAMAGE", keywords: ["도로", "파손", "싱크홀"] },
  { category: "GAS_RISK", keywords: ["가스", "가스 냄새"] },
];

const categoryAgencies: Record<Category, AgencyType[]> = {
  TRAFFIC_ACCIDENT: ["POLICE", "ROAD"],
  HUMAN_INJURY: ["FIRE"],
  ELECTRIC_DAMAGE: ["KEPCO"],
  FIRE_RISK: ["FIRE"],
  ROAD_DAMAGE: ["ROAD"],
  GAS_RISK: ["GAS"],
};

const agencyNames: Record<AgencyType, string> = {
  POLICE: "경찰",
  FIRE: "소방·구급",
  KEPCO: "한국전력",
  ROAD: "도로관리",
  GAS: "가스안전",
};

export function classifyMockCategories(description: string): Category[] {
  return categoryRules
    .filter(({ keywords }) => keywords.some((keyword) => description.includes(keyword)))
    .map(({ category }) => category);
}

function calculateSeverity(categories: Category[]): Severity {
  if (categories.length >= 3 || categories.includes("FIRE_RISK")) return "CRITICAL";
  if (categories.length === 2) return "HIGH";
  return "MEDIUM";
}

export function createMockReportResult(
  input?: Partial<CreateReportInput>,
): CreateReportResponse {
  const description =
    input?.description?.trim() ||
    "차량이 전봇대를 들이받았고 사람이 다쳤으며 전선에서 불꽃이 납니다.";
  const classifiedCategories = classifyMockCategories(description);
  const categories = classifiedCategories.length > 0
    ? classifiedCategories
    : input?.categoryHint
      ? [input.categoryHint]
      : [];
  const agencies = Array.from(
    new Set(categories.flatMap((category) => categoryAgencies[category])),
  );

  return {
    report: {
      id: 101,
      description,
      address: input?.address || "서울특별시 강남구 테헤란로 1",
      imageUrl: null,
    },
    incident: {
      id: 42,
      status: "OPEN",
      severity: calculateSeverity(categories),
      categories,
      createdAt: new Date().toISOString(),
    },
    agencies: agencies.map((agencyType) => ({
      agencyType,
      status: "ASSIGNED",
    })),
  };
}

export function saveReportResult(result: CreateReportResponse) {
  sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(result));
}

export function loadReportResult(): CreateReportResponse {
  const stored = sessionStorage.getItem(REPORT_STORAGE_KEY);

  if (stored) {
    try {
      return JSON.parse(stored) as CreateReportResponse;
    } catch {
      sessionStorage.removeItem(REPORT_STORAGE_KEY);
    }
  }

  const fallback = createMockReportResult();
  saveReportResult(fallback);
  return fallback;
}

export function createMockIncidentDetail(
  result: CreateReportResponse,
): IncidentDetail {
  const createdAt = result.incident.createdAt;
  const timeline: TimelineEvent[] = [
    {
      id: 1,
      type: "INCIDENT_CREATED",
      message: "시민 신고가 접수되어 공동대응 Incident가 생성되었습니다.",
      occurredAt: createdAt,
      metadata: {},
    },
    {
      id: 2,
      type: "INCIDENT_CLASSIFIED",
      message: `${result.incident.categories.length}개의 사고 유형을 확인했습니다.`,
      occurredAt: createdAt,
      metadata: { categories: result.incident.categories },
    },
    ...result.agencies.map<TimelineEvent>((agency, index) => ({
      id: 3 + index,
      type: "AGENCY_ASSIGNED",
      message: `${agencyNames[agency.agencyType]} 기관이 공동대응에 배정되었습니다.`,
      occurredAt: createdAt,
      metadata: { agencyType: agency.agencyType },
    })),
  ];

  return {
    id: result.incident.id,
    status: result.incident.status,
    severity: result.incident.severity,
    categories: result.incident.categories,
    report: {
      ...result.report,
      createdAt,
    },
    agencies: result.agencies.map((agency) => ({
      ...agency,
      assignedAt: createdAt,
      updatedAt: createdAt,
    })),
    timeline,
    createdAt,
    updatedAt: createdAt,
  };
}

export function createMockIncidentFromReportItem(
  item: MyReportItem,
): IncidentDetail {
  const agencyStatus = item.incident.status === "OPEN"
    ? "ASSIGNED"
    : item.incident.status === "RESPONDING"
      ? "DISPATCHED"
      : "COMPLETED";
  const agencyTypes = Array.from(
    new Set(item.incident.categories.flatMap((category) => categoryAgencies[category])),
  );
  const response: CreateReportResponse = {
    report: {
      id: item.id,
      description: item.description,
      address: item.address,
      imageUrl: item.imageUrl,
    },
    incident: {
      ...item.incident,
      createdAt: item.createdAt,
    },
    agencies: agencyTypes.map((agencyType) => ({ agencyType, status: agencyStatus })),
  };
  const detail = createMockIncidentDetail(response);

  if (item.incident.status === "OPEN") return detail;

  const statusEvent: TimelineEvent = {
    id: detail.timeline.length + 1,
    type: item.incident.status === "RESPONDING"
      ? "AGENCY_STATUS_CHANGED"
      : item.incident.status === "RESOLVED"
        ? "INCIDENT_RESOLVED"
        : "INCIDENT_CLOSED",
    message: item.incident.status === "RESPONDING"
      ? "참여 기관이 신고를 접수하고 현장 대응을 시작했습니다."
      : item.incident.status === "RESOLVED"
        ? "모든 참여 기관의 현장 대응이 완료되었습니다."
        : "관리자가 Incident 상황을 최종 종료했습니다.",
    occurredAt: item.createdAt,
    metadata: { incidentStatus: item.incident.status },
  };

  return {
    ...detail,
    status: item.incident.status,
    timeline: [...detail.timeline, statusEvent],
  };
}
