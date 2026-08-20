import type { AdminIncident } from "../types/admin";

export const adminIncidents: AdminIncident[] = [
  {
    id: 42,
    status: "RESPONDING",
    severity: "CRITICAL",
    categories: ["TRAFFIC_ACCIDENT", "HUMAN_INJURY", "ELECTRIC_DAMAGE"],
    report: {
      description: "차량이 전봇대를 들이받았고 운전자가 차 안에 있습니다. 전선에서 불꽃이 보입니다.",
      address: "서울특별시 강남구 테헤란로 1",
    },
    agencies: [
      { agencyType: "POLICE", status: "ARRIVED" },
      { agencyType: "FIRE", status: "DISPATCHED" },
      { agencyType: "KEPCO", status: "RECEIVED" },
      { agencyType: "ROAD", status: "ASSIGNED" },
    ],
    timeline: [
      {
        id: 15,
        type: "AGENCY_STATUS_CHANGED",
        message: "경찰이 현장에 도착했습니다.",
        occurredAt: "2026-08-20T17:08:00+09:00",
        metadata: { agencyType: "POLICE", status: "ARRIVED" },
      },
      {
        id: 14,
        type: "AGENCY_STATUS_CHANGED",
        message: "119가 출동을 시작했습니다.",
        occurredAt: "2026-08-20T17:04:00+09:00",
        metadata: { agencyType: "FIRE", status: "DISPATCHED" },
      },
      {
        id: 13,
        type: "AGENCY_STATUS_CHANGED",
        message: "한전이 사건을 접수했습니다.",
        occurredAt: "2026-08-20T17:03:00+09:00",
        metadata: { agencyType: "KEPCO", status: "RECEIVED" },
      },
      {
        id: 12,
        type: "AGENCY_ASSIGNED",
        message: "4개 대응기관이 자동 배정되었습니다.",
        occurredAt: "2026-08-20T17:01:00+09:00",
        metadata: {},
      },
      {
        id: 11,
        type: "REPORT_SUBMITTED",
        message: "시민 신고가 접수되었습니다.",
        occurredAt: "2026-08-20T17:01:00+09:00",
        metadata: {},
      },
    ],
    createdAt: "2026-08-20T17:01:00+09:00",
    updatedAt: "2026-08-20T17:08:00+09:00",
  },
  {
    id: 57,
    status: "OPEN",
    severity: "HIGH",
    categories: ["GAS_RISK", "HUMAN_INJURY"],
    report: {
      description: "상가 건물 지하에서 가스 냄새가 심하게 나고 한 명이 어지럼증을 호소합니다.",
      address: "서울특별시 중구 을지로 100",
    },
    agencies: [
      { agencyType: "GAS", status: "ASSIGNED" },
      { agencyType: "FIRE", status: "ASSIGNED" },
    ],
    timeline: [
      {
        id: 31,
        type: "AGENCY_ASSIGNED",
        message: "119와 가스기관이 자동 배정되었습니다.",
        occurredAt: "2026-08-20T17:14:00+09:00",
        metadata: {},
      },
      {
        id: 30,
        type: "REPORT_SUBMITTED",
        message: "시민 신고가 접수되었습니다.",
        occurredAt: "2026-08-20T17:14:00+09:00",
        metadata: {},
      },
    ],
    createdAt: "2026-08-20T17:14:00+09:00",
    updatedAt: "2026-08-20T17:14:00+09:00",
  },
  {
    id: 38,
    status: "RESOLVED",
    severity: "MEDIUM",
    categories: ["ROAD_DAMAGE"],
    report: {
      description: "도로 중앙에 대형 낙하물이 떨어져 차량 통행을 방해하고 있습니다.",
      address: "서울특별시 종로구 종로 1",
    },
    agencies: [{ agencyType: "ROAD", status: "COMPLETED" }],
    timeline: [
      {
        id: 9,
        type: "INCIDENT_RESOLVED",
        message: "모든 참여 기관의 대응이 완료되었습니다.",
        occurredAt: "2026-08-20T16:52:00+09:00",
        metadata: {},
      },
      {
        id: 8,
        type: "AGENCY_STATUS_CHANGED",
        message: "도로관리기관의 조치가 완료되었습니다.",
        occurredAt: "2026-08-20T16:52:00+09:00",
        metadata: { agencyType: "ROAD", status: "COMPLETED" },
      },
    ],
    createdAt: "2026-08-20T16:30:00+09:00",
    updatedAt: "2026-08-20T16:52:00+09:00",
  },
  {
    id: 29,
    status: "CLOSED",
    severity: "LOW",
    categories: ["TRAFFIC_ACCIDENT"],
    report: {
      description: "주차장에서 차량 두 대가 가볍게 접촉했습니다. 부상자는 없습니다.",
      address: "서울특별시 마포구 월드컵북로 21",
    },
    agencies: [
      { agencyType: "POLICE", status: "COMPLETED" },
      { agencyType: "ROAD", status: "COMPLETED" },
    ],
    timeline: [
      {
        id: 4,
        type: "INCIDENT_CLOSED",
        message: "관리자가 사건을 종료했습니다.",
        occurredAt: "2026-08-20T15:42:00+09:00",
        metadata: {},
      },
    ],
    createdAt: "2026-08-20T15:10:00+09:00",
    updatedAt: "2026-08-20T15:42:00+09:00",
  },
];
