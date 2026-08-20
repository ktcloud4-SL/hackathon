import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Clock3,
  FileSearch,
  Flame,
  HeartPulse,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { CitizenHeader } from "../components/CitizenHeader";
import { loadReportResult } from "../mocks/citizenIncident";
import type { AgencyType, Category, Severity } from "../types/report";
import "./citizen-flow.css";

const categoryDetails: Record<
  Category,
  { label: string; description: string; icon: typeof Route }
> = {
  TRAFFIC_ACCIDENT: {
    label: "교통사고",
    description: "차량 충돌 및 교통 통제가 필요한 상황",
    icon: Route,
  },
  HUMAN_INJURY: {
    label: "인명 피해",
    description: "부상자 구조와 응급 처치가 필요한 상황",
    icon: HeartPulse,
  },
  ELECTRIC_DAMAGE: {
    label: "전기 설비 파손",
    description: "전선·전봇대 등 전기 시설 위험 상황",
    icon: Zap,
  },
  FIRE_RISK: {
    label: "화재 위험",
    description: "불꽃·연기 등 화재로 번질 수 있는 상황",
    icon: Flame,
  },
  ROAD_DAMAGE: {
    label: "도로 파손",
    description: "도로 시설 복구와 안전 조치가 필요한 상황",
    icon: TriangleAlert,
  },
  GAS_RISK: {
    label: "가스 위험",
    description: "가스 누출 확인과 안전 점검이 필요한 상황",
    icon: Activity,
  },
};

const agencyDetails: Record<AgencyType, { label: string; short: string }> = {
  POLICE: { label: "경찰", short: "112" },
  FIRE: { label: "소방·구급", short: "119" },
  KEPCO: { label: "한국전력", short: "한전" },
  ROAD: { label: "도로관리", short: "도로" },
  GAS: { label: "가스안전", short: "가스" },
};

const severityDetails: Record<Severity, { label: string; copy: string }> = {
  LOW: { label: "낮음", copy: "일반 대응이 필요한 상황입니다." },
  MEDIUM: { label: "보통", copy: "현장 확인과 기관 대응이 필요합니다." },
  HIGH: { label: "높음", copy: "여러 위험 요소가 있어 빠른 대응이 필요합니다." },
  CRITICAL: { label: "긴급", copy: "복합 위험이 확인되어 여러 기관이 함께 대응합니다." },
};

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AnalysisResultPage() {
  const result = useMemo(loadReportResult, []);
  const severity = severityDetails[result.incident.severity];

  return (
    <div className="app-shell citizen-flow-shell">
      <CitizenHeader active="report" />

      <main className="citizen-flow-main analysis-main">
        <div className="flow-breadcrumb">
          <a href="/">
            <ArrowLeft size={16} /> 신고서로 돌아가기
          </a>
          <span>신고 분석 결과</span>
        </div>

        <section className="analysis-hero">
          <div className="analysis-hero-icon" aria-hidden="true">
            <Sparkles size={32} />
          </div>
          <div className="analysis-hero-copy">
            <span className="flow-eyebrow">
              <BadgeCheck size={16} /> 분석 완료
            </span>
            <h1>신고 내용을 분석했어요.</h1>
            <p>
              입력하신 상황에서 {result.incident.categories.length}개의 위험 요소를
              확인하고 필요한 기관 {result.agencies.length}곳을 배정했습니다.
            </p>
          </div>
          <div className={`severity-summary severity-${result.incident.severity.toLowerCase()}`}>
            <span>대응 긴급도</span>
            <strong>{severity.label}</strong>
            <small>{severity.copy}</small>
          </div>
        </section>

        <div className="analysis-grid">
          <section className="flow-card classification-card">
            <div className="flow-card-heading">
              <div>
                <span className="section-number">01</span>
                <h2>확인된 사고 유형</h2>
              </div>
              <span className="result-count">{result.incident.categories.length}개</span>
            </div>

            <div className="category-result-list">
              {result.incident.categories.map((category) => {
                const detail = categoryDetails[category];
                const Icon = detail.icon;

                return (
                  <article key={category} className="category-result-item">
                    <span className="category-result-icon"><Icon size={21} /></span>
                    <div>
                      <strong>{detail.label}</strong>
                      <p>{detail.description}</p>
                    </div>
                    <span className="category-check"><Check size={16} /></span>
                  </article>
                );
              })}
            </div>

            <div className="analysis-note">
              <FileSearch size={18} />
              <p>입력한 설명의 키워드를 기준으로 분류한 결과입니다. 기관이 현장에서 실제 상황을 다시 확인합니다.</p>
            </div>
          </section>

          <section className="flow-card agency-assignment-card">
            <div className="flow-card-heading">
              <div>
                <span className="section-number">02</span>
                <h2>공동대응 기관</h2>
              </div>
              <span className="result-count">{result.agencies.length}곳</span>
            </div>

            <div className="assigned-agency-list">
              {result.agencies.map(({ agencyType }) => {
                const agency = agencyDetails[agencyType];
                return (
                  <article key={agencyType}>
                    <span className={`agency-symbol agency-${agencyType.toLowerCase()}`}>
                      {agency.short}
                    </span>
                    <div>
                      <strong>{agency.label}</strong>
                      <small>공동대응 배정 완료</small>
                    </div>
                    <span className="assignment-badge">배정</span>
                  </article>
                );
              })}
            </div>

            <div className="assignment-flow">
              <span><Check size={15} /> 상황 분류</span>
              <span className="flow-line" />
              <span><Check size={15} /> 기관 배정</span>
              <span className="flow-line muted" />
              <span className="pending"><Clock3 size={15} /> 접수 대기</span>
            </div>
          </section>
        </div>

        <section className="flow-card report-recap-card">
          <div className="flow-card-heading compact">
            <div>
              <span className="section-number">03</span>
              <h2>신고 내용</h2>
            </div>
            <span className="incident-preview-id">예상 Incident #{result.incident.id}</span>
          </div>
          <div className="report-recap-content">
            <div className="recap-description">
              <span>상황 설명</span>
              <p>{result.report.description}</p>
            </div>
            <div className="recap-meta">
              <div><MapPin size={17} /><span><small>사고 위치</small><strong>{result.report.address}</strong></span></div>
              <div><Clock3 size={17} /><span><small>분석 시각</small><strong>{formatCreatedAt(result.incident.createdAt)}</strong></span></div>
            </div>
          </div>
        </section>

        <section className="analysis-confirm-bar">
          <div>
            <span className="confirm-shield"><ShieldCheck size={22} /></span>
            <p>
              <strong>신고 접수가 완료되었습니다.</strong>
              기관별 접수·출동·도착 상태를 다음 화면에서 실시간으로 확인할 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.assign(`/incidents/${result.incident.id}`)}
          >
            실시간 대응 상황 보기 <ArrowRight size={19} />
          </button>
        </section>
      </main>

      <footer>
        <span>OneReport</span>
        <p>한 번의 신고, 여러 기관의 공동대응</p>
      </footer>
    </div>
  );
}
