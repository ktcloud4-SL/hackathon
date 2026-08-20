import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import "./ai-analysis-modal.css";

export function AiAnalysisModal() {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="ai-analysis-backdrop" role="presentation">
      <section
        className="ai-analysis-modal"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-labelledby="ai-analysis-title"
      >
        <span className="ai-analysis-spinner" aria-hidden="true">
          <LoaderCircle size={48} strokeWidth={2.4} />
        </span>
        <h2 id="ai-analysis-title">AI가 신고 내용을 분석 중입니다</h2>
        <p>잠시만 기다려 주세요.</p>
      </section>
    </div>
  );
}
