import type { MyReportItem, MyReportsResponse } from "../types/report";
import { loadReportResult } from "./citizenIncident";

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function createMockMyReports(): MyReportsResponse {
  const latest = loadReportResult();

  const items: MyReportItem[] = [
    {
      id: latest.report.id,
      description: latest.report.description,
      address: latest.report.address,
      imageUrl: latest.report.imageUrl,
      createdAt: latest.incident.createdAt,
      incident: {
        id: latest.incident.id,
        status: latest.incident.status,
        severity: latest.incident.severity,
        categories: latest.incident.categories,
      },
    },
    {
      id: 98,
      description: "교차로에서 승용차 두 대가 충돌했고 한 명이 차에서 나오지 못하고 있습니다.",
      address: "서울특별시 송파구 올림픽로 300",
      imageUrl: null,
      createdAt: hoursAgo(7),
      incident: {
        id: 41,
        status: "RESPONDING",
        severity: "HIGH",
        categories: ["TRAFFIC_ACCIDENT", "HUMAN_INJURY"],
      },
    },
    {
      id: 92,
      description: "도로 중앙에 큰 포트홀이 생겨 차량들이 급하게 피하고 있습니다.",
      address: "서울특별시 마포구 월드컵북로 120",
      imageUrl: null,
      createdAt: hoursAgo(28),
      incident: {
        id: 40,
        status: "RESOLVED",
        severity: "MEDIUM",
        categories: ["ROAD_DAMAGE"],
      },
    },
    {
      id: 87,
      description: "골목 건물 외벽 가스 배관 주변에서 강한 가스 냄새가 납니다.",
      address: "서울특별시 용산구 한강대로 45",
      imageUrl: null,
      createdAt: hoursAgo(76),
      incident: {
        id: 39,
        status: "CLOSED",
        severity: "HIGH",
        categories: ["GAS_RISK"],
      },
    },
  ];

  return { items, total: items.length };
}
