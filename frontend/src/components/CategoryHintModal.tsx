import {
  Activity,
  ArrowRight,
  Building2,
  CarFront,
  Check,
  CircleAlert,
  Flame,
  HeartPulse,
  Route,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import type {
  AgencyType,
  Category,
  ReportAnalysisResponse,
  Severity,
} from "../types/report";
import { deriveTrackPreview, getAnalysisHighlights } from "../utils/reportAnalysis";
import "./category-hint-modal.css";

const severityLabels: Record<Severity, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "긴급",
};

const agencyLabels: Record<AgencyType, string> = {
  POLICE: "경찰",
  FIRE: "소방·구급",
  KEPCO: "한국전력",
  ROAD: "도로관리",
  GAS: "가스안전",
  LOCAL_GOV: "관할 지자체",
};

const categoryOptions: Array<{
  value: Category;
  label: string;
  copy: string;
  examples: string;
  icon: typeof CarFront;
}> = [
  {
    value: "TRAFFIC_ACCIDENT",
    label: "교통사고",
    copy: "차량·오토바이·보행자 충돌",
    examples: "차량 충돌, 전복, 교통 방해",
    icon: CarFront,
  },
  {
    value: "HUMAN_INJURY",
    label: "인명 피해",
    copy: "다친 사람이나 구조가 필요한 상황",
    examples: "부상자, 의식 없음, 고립",
    icon: HeartPulse,
  },
  {
    value: "ELECTRIC_DAMAGE",
    label: "전기 설비 파손",
    copy: "전선·전봇대·전기 시설 위험",
    examples: "끊어진 전선, 정전, 감전 위험",
    icon: Zap,
  },
  {
    value: "FIRE_RISK",
    label: "화재 위험",
    copy: "불·연기·불꽃이 보이는 상황",
    examples: "화재, 연기, 폭발 위험",
    icon: Flame,
  },
  {
    value: "ROAD_DAMAGE",
    label: "도로 파손",
    copy: "도로·교량·안전 시설물 파손",
    examples: "포트홀, 싱크홀, 낙하물",
    icon: Route,
  },
  {
    value: "GAS_RISK",
    label: "가스 위험",
    copy: "가스 냄새나 배관 파손 상황",
    examples: "가스 누출, 배관 파손, 이상 냄새",
    icon: Activity,
  },
  {
    value: "ANIMAL_CARCASS",
    label: "동물 사체",
    copy: "도로 위 동물 사체나 로드킬 신고",
    examples: "동물 사체, 로드킬, 죽은 동물",
    icon: CircleAlert,
  },
];

interface CategoryHintModalProps {
  selected: Category[];
  hasRecommendation?: boolean;
  analysis?: ReportAnalysisResponse | null;
  onToggle: (category: Category) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function CategoryHintModal({
  selected,
  hasRecommendation = false,
  analysis = null,
  onToggle,
  onConfirm,
  onClose,
}: CategoryHintModalProps) {
  const highlights = getAnalysisHighlights(analysis);
  const selectedTrack = deriveTrackPreview(selected) ?? highlights?.track ?? null;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="category-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="category-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
      >
        <header className="category-modal-header">
          <div>
            <span className="category-modal-icon"><ShieldAlert size={22} /></span>
            <div>
              <span>{hasRecommendation ? "AI 분석 결과" : "사고 유형 확인 필요"}</span>
              <h2 id="category-modal-title">
                {hasRecommendation
                  ? "추천 사고 유형을 확인해 주세요."
                  : "해당하는 사고 유형을 모두 선택해 주세요."}
              </h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="사고 유형 선택 닫기"><X size={20} /></button>
        </header>

        {highlights ? (
          <section className="analysis-highlights" aria-label="AI 상황 분석 결과">
            {selectedTrack && (
              <div className={`analysis-track-banner track-${selectedTrack.toLowerCase()}`}>
                <strong>{selectedTrack === "EMERGENCY" ? "긴급·복합대응" : "생활·공공신고"}</strong>
                <span>
                  {selectedTrack === "EMERGENCY"
                    ? "여러 대응기관이 하나의 Incident에서 함께 대응합니다."
                    : "신고 내용에 맞는 공공기관 또는 담당부서로 연결합니다."}
                </span>
              </div>
            )}
            <div className="analysis-highlight-summary">
              <div>
                <span>상황 분석 요약</span>
                <p>{highlights.summary}</p>
              </div>
              <span className={`analysis-severity severity-${highlights.severity.toLowerCase()}`}>
                긴급도 {severityLabels[highlights.severity]}
              </span>
            </div>

            {highlights.suggestedAgencies.length > 0 && (
              <div className="analysis-highlight-row">
                <strong><Building2 size={15} />예상 대응기관</strong>
                <div className="analysis-agency-list">
                  {highlights.suggestedAgencies.map((agency) => (
                    <span key={agency}>{agencyLabels[agency]}</span>
                  ))}
                </div>
              </div>
            )}

            {highlights.reasons.length > 0 && (
              <div className="analysis-highlight-row analysis-reasons">
                <strong><CircleAlert size={15} />분석된 위험 요소</strong>
                <ul>
                  {highlights.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
            )}
          </section>
        ) : (
          <p className="category-modal-description">
            자동으로 분류하지 못했습니다. 해당하는 유형을 하나 이상 직접 선택해 주세요.
          </p>
        )}

        {hasRecommendation && (
          <p className="category-modal-description category-recommendation-guide">
            분석 결과를 확인하고 필요하면 사고 유형을 수정해 주세요.
          </p>
        )}

        <div className="category-option-grid" role="group" aria-label="사고 유형">
          {categoryOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={isSelected ? "selected" : ""}
                aria-pressed={isSelected}
                onClick={() => onToggle(option.value)}
              >
                <span className="category-option-icon"><Icon size={21} /></span>
                <span className="category-option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.copy}</small>
                  <em>{option.examples}</em>
                </span>
                <span className="category-radio-mark">{isSelected && <Check size={14} />}</span>
              </button>
            );
          })}
        </div>

        <div className="category-modal-notice">
          <ShieldAlert size={17} />
          <p><strong>정확하지 않아도 괜찮아요.</strong>선택한 유형은 초기 배정에만 사용되며 기관이 실제 현장 상황을 다시 확인합니다.</p>
        </div>

        <footer className="category-modal-actions">
          <button type="button" className="category-cancel-button" onClick={onClose}>신고 내용 다시 확인</button>
          <button type="button" className="category-confirm-button" onClick={onConfirm} disabled={selected.length === 0}>
            {selected.length}개 유형으로 신고 접수 <ArrowRight size={18} />
          </button>
        </footer>
      </section>
    </div>
  );
}
