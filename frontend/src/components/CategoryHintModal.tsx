import {
  Activity,
  ArrowRight,
  CarFront,
  Check,
  Flame,
  HeartPulse,
  Route,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import type { Category } from "../types/report";
import "./category-hint-modal.css";

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
];

interface CategoryHintModalProps {
  selected: Category[];
  onToggle: (category: Category) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function CategoryHintModal({
  selected,
  onToggle,
  onConfirm,
  onClose,
}: CategoryHintModalProps) {
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
              <span>사고 유형 확인 필요</span>
              <h2 id="category-modal-title">해당하는 사고 유형을 모두 선택해 주세요.</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="사고 유형 선택 닫기"><X size={20} /></button>
        </header>

        <p className="category-modal-description">
          선택한 사고 유형을 기준으로 필요한 대응기관이 자동 배정됩니다. 하나 이상 선택해 주세요.
        </p>

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
