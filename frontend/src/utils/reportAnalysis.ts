import type { ReportAnalysisResponse } from "../types/report";

export const MIN_ANALYSIS_DISPLAY_MS = 2200;

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
