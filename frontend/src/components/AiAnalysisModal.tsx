import { Check, Circle, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ANALYSIS_STAGE_INTERVAL_MS,
  getAnalysisModalCopy,
  getAnalysisStageLabels,
  getAnalysisStepState,
} from "../utils/reportAnalysis";
import "./ai-analysis-modal.css";

interface AiAnalysisModalProps {
  hasAttachment?: boolean;
}

export function AiAnalysisModal({ hasAttachment = false }: AiAnalysisModalProps) {
  const stages = useMemo(
    () => getAnalysisStageLabels(hasAttachment),
    [hasAttachment],
  );
  const copy = useMemo(
    () => getAnalysisModalCopy(hasAttachment),
    [hasAttachment],
  );
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const stageTimer = window.setInterval(() => {
      setActiveStage((current) => Math.min(current + 1, stages.length - 1));
    }, ANALYSIS_STAGE_INTERVAL_MS);

    return () => {
      window.clearInterval(stageTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [stages.length]);

  return (
    <div className="ai-analysis-backdrop" role="presentation">
      <section
        className="ai-analysis-modal"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-labelledby="ai-analysis-title"
        aria-describedby="ai-analysis-description"
      >
        <div className="ai-analysis-heading">
          <span className="ai-analysis-spinner" aria-hidden="true">
            <LoaderCircle size={42} strokeWidth={2.4} />
          </span>
          <span className="ai-analysis-kicker">
            <Sparkles size={15} aria-hidden="true" />
            OneReport AI
          </span>
          <h2 id="ai-analysis-title">{copy.title}</h2>
          <p id="ai-analysis-description">
            {copy.description}
          </p>
        </div>

        <ol className="ai-analysis-steps" aria-label="신고 분석 진행 단계">
          {stages.map((stage, index) => {
            const state = getAnalysisStepState(index, activeStage);
            return (
              <li
                key={stage}
                className={state}
                aria-current={state === "active" ? "step" : undefined}
              >
                <span className="ai-analysis-step-icon" aria-hidden="true">
                  {state === "complete" ? (
                    <Check size={16} strokeWidth={3} />
                  ) : state === "active" ? (
                    <LoaderCircle size={17} strokeWidth={2.5} />
                  ) : (
                    <Circle size={14} strokeWidth={2} />
                  )}
                </span>
                <span>
                  {stage}{state === "active" ? " 중" : ""}
                </span>
              </li>
            );
          })}
        </ol>

      </section>
    </div>
  );
}
