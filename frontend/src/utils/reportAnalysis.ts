import type {
  AgencyType,
  ReportAnalysisResponse,
  Severity,
} from "../types/report";

export const MIN_ANALYSIS_DISPLAY_MS = 5000;
export const ANALYSIS_STAGE_INTERVAL_MS = 1000;

export type AnalysisStepState = "complete" | "active" | "pending";

export interface AnalysisModalCopy {
  title: string;
  description: string;
}

export function getAnalysisModalCopy(
  hasAttachment: boolean,
): AnalysisModalCopy {
  return hasAttachment
    ? {
        title: "AI가 신고 내용과 사진을 분석하고 있어요",
        description:
          "신고 내용과 첨부 자료를 바탕으로 위험 요소와 필요한 대응기관을 확인합니다.",
      }
    : {
        title: "AI가 신고 내용을 분석하고 있어요",
        description:
          "신고 내용을 바탕으로 위험 요소와 필요한 대응기관을 확인합니다.",
      };
}

export function getAnalysisStageLabels(hasAttachment: boolean): string[] {
  return [
    "신고 정보 확인",
    hasAttachment ? "AI 사진 분석" : "AI 신고내용 분석",
    "위험 요소 분석",
    "사고 유형 자동 분류",
    "대응기관 추천",
  ];
}

export function getAnalysisStepState(
  stepIndex: number,
  activeStepIndex: number,
): AnalysisStepState {
  if (stepIndex < activeStepIndex) return "complete";
  if (stepIndex === activeStepIndex) return "active";
  return "pending";
}

type Delay = (milliseconds: number) => Promise<void>;

const wait: Delay = (milliseconds) => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

export async function withMinimumDuration<T>(
  operation: Promise<T>,
  minimumMilliseconds = MIN_ANALYSIS_DISPLAY_MS,
  delay: Delay = wait,
): Promise<T> {
  const minimumDisplay = delay(minimumMilliseconds);
  try {
    const [result] = await Promise.all([operation, minimumDisplay]);
    return result;
  } catch (error) {
    await minimumDisplay;
    throw error;
  }
}

export function hasUsableRecommendation(
  analysis: ReportAnalysisResponse,
): boolean {
  return analysis.categories.length > 0 && !analysis.needsUserConfirmation;
}

export interface AnalysisHighlights {
  summary: string;
  severity: Severity;
  suggestedAgencies: AgencyType[];
  reasons: string[];
}

export function getAnalysisHighlights(
  analysis: ReportAnalysisResponse | null,
): AnalysisHighlights | null {
  if (!analysis || !hasUsableRecommendation(analysis)) return null;

  return {
    summary: analysis.summary,
    severity: analysis.severity,
    suggestedAgencies: analysis.suggestedAgencies,
    reasons: analysis.reasons.slice(0, 3),
  };
}
