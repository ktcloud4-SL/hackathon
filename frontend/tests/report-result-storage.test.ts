import assert from "node:assert/strict";
import test from "node:test";

import {
  loadReportResult,
  loadReportResultForIncident,
  saveReportResult,
} from "../src/state/reportResult.ts";
import type { CreateReportResponse } from "../src/types/report.ts";


class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}


function reportResult(incidentId = 42): CreateReportResponse {
  return {
    report: {
      id: 7,
      description: "차량이 전봇대를 들이받았습니다.",
      address: "서울특별시 강남구 테헤란로 1",
      latitude: 37.4981,
      longitude: 127.0276,
      imageUrl: null,
      createdAt: "2026-08-20T10:00:00+09:00",
    },
    incident: {
      id: incidentId,
      status: "OPEN",
      severity: "HIGH",
      categories: ["TRAFFIC_ACCIDENT", "ELECTRIC_DAMAGE"],
      createdAt: "2026-08-20T10:00:00+09:00",
      updatedAt: "2026-08-20T10:00:00+09:00",
    },
    agencies: [
      {
        agencyType: "POLICE",
        status: "ASSIGNED",
        assignedAt: "2026-08-20T10:00:00+09:00",
        updatedAt: "2026-08-20T10:00:00+09:00",
      },
      {
        agencyType: "KEPCO",
        status: "ASSIGNED",
        assignedAt: "2026-08-20T10:00:00+09:00",
        updatedAt: "2026-08-20T10:00:00+09:00",
      },
    ],
  };
}


test("matching incident can load the stored report result", () => {
  const storage = new MemoryStorage();
  const result = reportResult(42);
  saveReportResult(result, storage);

  assert.deepEqual(loadReportResultForIncident(42, storage), result);
});


test("another incident cannot load the stored report result", () => {
  const storage = new MemoryStorage();
  saveReportResult(reportResult(42), storage);

  assert.equal(loadReportResultForIncident(99, storage), null);
});


test("missing storage returns null", () => {
  assert.equal(loadReportResultForIncident(42, new MemoryStorage()), null);
});


test("broken or invalid storage is removed without throwing", () => {
  const broken = new MemoryStorage();
  broken.setItem("onereport:report-result", "{not-json");
  assert.equal(loadReportResultForIncident(42, broken), null);
  assert.equal(broken.getItem("onereport:report-result"), null);

  const invalid = new MemoryStorage();
  invalid.setItem("onereport:report-result", JSON.stringify({ incident: { id: 42 } }));
  assert.equal(loadReportResult(invalid), null);
  assert.equal(invalid.getItem("onereport:report-result"), null);
});


test("stored categories, severity, and agencies remain unchanged", () => {
  const storage = new MemoryStorage();
  const result = reportResult();
  saveReportResult(result, storage);

  const loaded = loadReportResult(storage);
  assert.deepEqual(loaded?.incident.categories, result.incident.categories);
  assert.equal(loaded?.incident.severity, result.incident.severity);
  assert.deepEqual(loaded?.agencies, result.agencies);
});
