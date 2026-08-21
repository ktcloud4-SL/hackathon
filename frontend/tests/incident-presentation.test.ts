import assert from "node:assert/strict";
import test from "node:test";

import type { AdminIncident } from "../src/types/admin.ts";
import type { AgencyStatus, ReportTrack } from "../src/types/report.ts";
import {
  filterAgencyIncidents,
  formatTimelineMessage,
  getAgencyStatusLabel,
  getIncidentStatusDetail,
  getTrackLabel,
} from "../src/utils/incidentPresentation.ts";

const timestamp = "2026-08-21T12:00:00Z";

function incident(
  id: number,
  track: ReportTrack,
  agencyType: "ROAD" | "LOCAL_GOV",
  agencyStatus: AgencyStatus,
  description: string,
): AdminIncident {
  return {
    id,
    status: agencyStatus === "COMPLETED" ? "RESOLVED" : agencyStatus === "ASSIGNED" ? "OPEN" : "RESPONDING",
    severity: track === "CIVIC" ? "LOW" : "HIGH",
    categories: track === "CIVIC" ? ["ROAD_DAMAGE"] : ["TRAFFIC_ACCIDENT"],
    track,
    report: {
      id,
      description,
      address: id === 1 ? "서울시 강남구" : "서울시 종로구",
      latitude: 37.5,
      longitude: 127,
      imageUrl: null,
      createdAt: timestamp,
    },
    agencies: [{ agencyType, status: agencyStatus, assignedAt: timestamp, updatedAt: timestamp }],
    timeline: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    resolvedAt: agencyStatus === "COMPLETED" ? timestamp : null,
    closedAt: null,
  };
}

test("agency track, status, and search filters combine without changing API data", () => {
  const incidents = [
    incident(1, "EMERGENCY", "ROAD", "ASSIGNED", "복합 교통사고"),
    incident(2, "CIVIC", "ROAD", "ASSIGNED", "도로 포트홀"),
    incident(3, "CIVIC", "ROAD", "RECEIVED", "도로 파손 접수"),
  ];

  assert.deepEqual(filterAgencyIncidents(incidents, "ROAD", "", "ALL", "ALL").map(({ id }) => id), [1, 2, 3]);
  assert.deepEqual(filterAgencyIncidents(incidents, "ROAD", "", "EMERGENCY", "ALL").map(({ id }) => id), [1]);
  assert.deepEqual(filterAgencyIncidents(incidents, "ROAD", "", "CIVIC", "ALL").map(({ id }) => id), [2, 3]);
  assert.deepEqual(filterAgencyIncidents(incidents, "ROAD", "포트홀", "CIVIC", "ASSIGNED").map(({ id }) => id), [2]);
});

test("LOCAL_GOV civic-only list still supports track and status filters", () => {
  const incidents = [incident(4, "CIVIC", "LOCAL_GOV", "IN_PROGRESS", "동물 사체 처리")];

  assert.equal(filterAgencyIncidents(incidents, "LOCAL_GOV", "", "CIVIC", "IN_PROGRESS").length, 1);
  assert.equal(filterAgencyIncidents(incidents, "LOCAL_GOV", "", "EMERGENCY", "ALL").length, 0);
});

test("track and agency status labels remain distinct and track-aware", () => {
  assert.equal(getTrackLabel("EMERGENCY", true), "긴급·복합");
  assert.equal(getTrackLabel("CIVIC", true), "생활·공공");
  assert.equal(getAgencyStatusLabel("EMERGENCY", "DISPATCHED"), "출동");
  assert.equal(getAgencyStatusLabel("CIVIC", "DISPATCHED"), "처리 준비");
  assert.equal(getAgencyStatusLabel("CIVIC", "IN_PROGRESS"), "처리 중");
});

test("timeline status messages never expose backend enums", () => {
  const event = {
    id: 7,
    type: "AGENCY_STATUS_CHANGED" as const,
    message: "관할 지자체 대응 상태가 IN_PROGRESS(으)로 변경되었습니다.",
    occurredAt: timestamp,
    metadata: { agencyType: "LOCAL_GOV", status: "IN_PROGRESS" },
  };

  const message = formatTimelineMessage(event, "CIVIC");
  assert.equal(message, "관할 지자체 처리 상태가 ‘처리 중’ 단계로 변경되었습니다.");
  assert.doesNotMatch(message, /IN_PROGRESS|대응 상태/);
});

test("citizen completion copy is final rather than ongoing for both tracks", () => {
  assert.deepEqual(getIncidentStatusDetail("CIVIC", "RESOLVED"), {
    label: "처리 완료",
    copy: "담당기관의 신고 처리가 완료되었습니다.",
  });
  assert.deepEqual(getIncidentStatusDetail("EMERGENCY", "RESOLVED"), {
    label: "대응 완료",
    copy: "참여 기관의 대응이 완료되었습니다.",
  });
});
