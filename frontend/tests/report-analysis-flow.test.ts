import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYSIS_STAGE_INTERVAL_MS,
  MIN_ANALYSIS_DISPLAY_MS,
  deriveTrackPreview,
  getAnalysisHighlights,
  getAnalysisModalCopy,
  getRecommendationGuide,
  getAnalysisStageLabels,
  getAnalysisStepState,
  hasUsableRecommendation,
  withMinimumDuration,
} from "../src/utils/reportAnalysis.ts";


test("analysis and minimum spinner duration run concurrently", async () => {
  let releaseDelay: (() => void) | undefined;
  const delay = () => new Promise<void>((resolve) => {
    releaseDelay = resolve;
  });
  let settled = false;

  const resultPromise = withMinimumDuration(
    Promise.resolve("analyzed"),
    MIN_ANALYSIS_DISPLAY_MS,
    delay,
  );
  resultPromise.then(() => {
    settled = true;
  });
  await Promise.resolve();

  assert.equal(settled, false);
  assert.ok(releaseDelay);
  releaseDelay();
  assert.equal(await resultPromise, "analyzed");
});


test("the default demo spinner duration is five seconds", async () => {
  let requestedDelay = 0;
  const delay = (milliseconds: number) => {
    requestedDelay = milliseconds;
    return Promise.resolve();
  };

  assert.equal(
    await withMinimumDuration(Promise.resolve("analyzed"), undefined, delay),
    "analyzed",
  );
  assert.equal(requestedDelay, 5000);
});


test("spinner waits for a slow analysis after the minimum duration finishes", async () => {
  let releaseAnalysis: ((value: string) => void) | undefined;
  const analysis = new Promise<string>((resolve) => {
    releaseAnalysis = resolve;
  });
  let settled = false;

  const resultPromise = withMinimumDuration(
    analysis,
    MIN_ANALYSIS_DISPLAY_MS,
    () => Promise.resolve(),
  );
  resultPromise.then(() => {
    settled = true;
  });
  await Promise.resolve();

  assert.equal(settled, false);
  assert.ok(releaseAnalysis);
  releaseAnalysis("slow analysis");
  assert.equal(await resultPromise, "slow analysis");
});


test("analysis failure still waits for the minimum spinner duration", async () => {
  let releaseDelay: (() => void) | undefined;
  const delay = () => new Promise<void>((resolve) => {
    releaseDelay = resolve;
  });

  const resultPromise = withMinimumDuration(
    Promise.reject(new Error("analysis unavailable")),
    MIN_ANALYSIS_DISPLAY_MS,
    delay,
  );
  const rejection = assert.rejects(resultPromise, /analysis unavailable/);
  await Promise.resolve();

  assert.ok(releaseDelay);
  releaseDelay();
  await rejection;
});


test("analysis stages progress in order and attachment wording stays accurate", () => {
  assert.equal(ANALYSIS_STAGE_INTERVAL_MS, 1000);
  assert.deepEqual(getAnalysisStageLabels(false), [
    "신고 정보 확인",
    "AI 신고내용 분석",
    "위험 요소 분석",
    "사고 유형 자동 분류",
    "대응기관 추천",
  ]);
  assert.deepEqual(getAnalysisStageLabels(true).slice(0, 2), [
    "신고 정보 확인",
    "AI 사진 분석",
  ]);
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((step) => getAnalysisStepState(step, 2)),
    ["complete", "complete", "active", "pending", "pending"],
  );
});


test("analysis modal copy clearly distinguishes reports with photos", () => {
  assert.deepEqual(getAnalysisModalCopy(true), {
    title: "AI가 신고 내용과 사진을 분석하고 있어요",
    description:
      "신고 내용과 첨부 자료를 바탕으로 위험 요소와 필요한 대응기관을 확인합니다.",
  });
  assert.deepEqual(getAnalysisModalCopy(false), {
    title: "AI가 신고 내용을 분석하고 있어요",
    description:
      "신고 내용을 바탕으로 위험 요소와 필요한 대응기관을 확인합니다.",
  });
});


test("any categorized result is shown, including a confirmable civic fallback", () => {
  const classified = {
    categories: ["GAS_RISK"],
    track: "EMERGENCY",
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
  const civicFallback = {
    ...classified,
    categories: ["OTHER_CIVIC"],
    track: "CIVIC",
    severity: "LOW",
    suggestedAgencies: ["LOCAL_GOV"],
    needsUserConfirmation: true,
  } as const;

  assert.equal(hasUsableRecommendation(classified), true);
  assert.equal(hasUsableRecommendation(civicFallback), true);
  assert.equal(hasUsableRecommendation(unclassified), false);
});


test("track preview follows the categories the user finally confirms", () => {
  assert.equal(deriveTrackPreview([]), null);
  assert.equal(deriveTrackPreview(["ANIMAL_CARCASS"]), "CIVIC");
  assert.equal(deriveTrackPreview(["ROAD_DAMAGE"]), "CIVIC");
  assert.equal(deriveTrackPreview(["OTHER_CIVIC"]), "CIVIC");
  assert.equal(
    deriveTrackPreview(["ANIMAL_CARCASS", "HUMAN_INJURY"]),
    "EMERGENCY",
  );
});


test("analysis highlights keep agencies and up to three reasons", () => {
  const analysis = {
    categories: ["TRAFFIC_ACCIDENT", "HUMAN_INJURY", "ELECTRIC_DAMAGE", "FIRE_RISK"],
    track: "EMERGENCY",
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
    track: "EMERGENCY",
  });
});


test("single-category highlights keep one reason and empty fallback has no details", () => {
  const single = {
    categories: ["GAS_RISK"],
    track: "EMERGENCY",
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


test("confirmable OTHER_CIVIC fallback keeps its real analysis details", () => {
  const fallback = {
    categories: ["OTHER_CIVIC"],
    track: "CIVIC",
    severity: "LOW",
    suggestedAgencies: ["LOCAL_GOV"],
    summary: "구체 유형에 정확히 일치하지 않는 생활·공공신고로 분석했습니다.",
    confidence: 0.35,
    reasons: ["관할 기관에서 신고 내용을 확인한 뒤 담당부서로 연결합니다."],
    needsUserConfirmation: true,
    analysisMethod: "RULE",
  } as const;

  assert.deepEqual(getAnalysisHighlights(fallback), {
    summary: fallback.summary,
    severity: "LOW",
    suggestedAgencies: ["LOCAL_GOV"],
    reasons: fallback.reasons,
    track: "CIVIC",
  });
  assert.equal(
    getRecommendationGuide(fallback),
    "유형이 정확하지 않아도 괜찮아요. 접수 후 담당기관이 신고 내용을 다시 확인합니다.",
  );
});
