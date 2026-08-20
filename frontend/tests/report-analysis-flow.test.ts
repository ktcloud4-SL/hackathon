import assert from "node:assert/strict";
import test from "node:test";

import {
  getAnalysisHighlights,
  hasUsableRecommendation,
  withMinimumDuration,
} from "../src/utils/reportAnalysis.ts";


test("analysis and minimum spinner duration run concurrently", async () => {
  let releaseDelay: (() => void) | undefined;
  const delay = () => new Promise<void>((resolve) => {
    releaseDelay = resolve;
  });
  let settled = false;

  const resultPromise = withMinimumDuration(Promise.resolve("analyzed"), 2200, delay);
  resultPromise.then(() => {
    settled = true;
  });
  await Promise.resolve();

  assert.equal(settled, false);
  assert.ok(releaseDelay);
  releaseDelay();
  assert.equal(await resultPromise, "analyzed");
});


test("analysis failure still waits for the minimum spinner duration", async () => {
  let releaseDelay: (() => void) | undefined;
  const delay = () => new Promise<void>((resolve) => {
    releaseDelay = resolve;
  });

  const resultPromise = withMinimumDuration(
    Promise.reject(new Error("analysis unavailable")),
    2200,
    delay,
  );
  const rejection = assert.rejects(resultPromise, /analysis unavailable/);
  await Promise.resolve();

  assert.ok(releaseDelay);
  releaseDelay();
  await rejection;
});


test("only classified results are used as recommendations", () => {
  const classified = {
    categories: ["GAS_RISK"],
    severity: "MEDIUM",
    suggestedAgencies: ["GAS"],
    summary: "가스 위험 관련 상황으로 분석했습니다.",
    confidence: 0.66,
    reasons: ["가스 표현에서 가스 위험 가능성을 감지했습니다."],
    needsUserConfirmation: false,
    analysisMethod: "RULE",
  } as const;
  const unclassified = {
    ...classified,
    categories: [],
    suggestedAgencies: [],
    confidence: 0,
    reasons: [],
    needsUserConfirmation: true,
  } as const;

  assert.equal(hasUsableRecommendation(classified), true);
  assert.equal(hasUsableRecommendation(unclassified), false);
});


test("analysis highlights keep agencies and up to three reasons", () => {
  const analysis = {
    categories: ["TRAFFIC_ACCIDENT", "HUMAN_INJURY", "ELECTRIC_DAMAGE", "FIRE_RISK"],
    severity: "HIGH",
    suggestedAgencies: ["POLICE", "ROAD", "FIRE", "KEPCO"],
    summary: "교통사고, 인명 피해, 전기 설비 파손, 화재 위험 요소가 함께 감지된 복합 상황입니다.",
    confidence: 0.95,
    reasons: ["교통사고 근거", "인명 피해 근거", "전력 위험 근거", "화재 위험 근거"],
    needsUserConfirmation: false,
    analysisMethod: "RULE",
  } as const;

  assert.deepEqual(getAnalysisHighlights(analysis), {
    summary: analysis.summary,
    severity: "HIGH",
    suggestedAgencies: ["POLICE", "ROAD", "FIRE", "KEPCO"],
    reasons: ["교통사고 근거", "인명 피해 근거", "전력 위험 근거"],
  });
});


test("single-category highlights keep one reason and fallback has no details", () => {
  const single = {
    categories: ["GAS_RISK"],
    severity: "MEDIUM",
    suggestedAgencies: ["GAS"],
    summary: "가스 위험 관련 상황으로 분석했습니다.",
    confidence: 0.66,
    reasons: ["가스 위험 근거"],
    needsUserConfirmation: false,
    analysisMethod: "RULE",
  } as const;
  const fallback = {
    ...single,
    categories: [],
    suggestedAgencies: [],
    reasons: [],
    needsUserConfirmation: true,
  } as const;

  assert.deepEqual(getAnalysisHighlights(single)?.reasons, ["가스 위험 근거"]);
  assert.equal(getAnalysisHighlights(fallback), null);
  assert.equal(getAnalysisHighlights(null), null);
});
