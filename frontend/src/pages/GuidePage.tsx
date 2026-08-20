import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Building2,
  CarFront,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Flame,
  HeartPulse,
  MapPin,
  Radio,
  Route,
  ShieldCheck,
  Siren,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";
import { CitizenHeader } from "../components/CitizenHeader";
import "./guide-page.css";

const responseSteps = [
  {
    number: "01",
    title: "상황과 위치 전달",
    copy: "담당 기관을 몰라도 지금 보이는 상황과 위치를 중심으로 알려주면 됩니다.",
    icon: MapPin,
  },
  {
    number: "02",
    title: "상황 분석·유형 판단",
    copy: "신고 내용을 분석해 상황의 유형과 긴급도를 판단하고 필요한 대응을 정리합니다.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "필요 기관 연결·공동대응",
    copy: "한 곳 또는 여러 기관을 하나의 Incident로 연결하고 대응 과정을 Timeline으로 공유합니다.",
    icon: Radio,
  },
];

const agencies = [
  { name: "경찰", short: "112", copy: "교통사고 현장 통제", icon: ShieldCheck, className: "police" },
  { name: "소방·구급", short: "119", copy: "구조·응급·화재 대응", icon: HeartPulse, className: "fire" },
  { name: "한국전력", short: "한전", copy: "전기 설비 안전 조치", icon: Zap, className: "kepco" },
  { name: "도로관리", short: "도로", copy: "도로 파손·시설 복구", icon: Route, className: "road" },
  { name: "가스안전", short: "가스", copy: "가스 누출·안전 점검", icon: Flame, className: "gas" },
];

const agencyStatuses = ["배정", "접수", "출동", "도착", "대응", "완료"];

export function GuidePage() {
  return (
    <div className="app-shell guide-shell">
      <CitizenHeader active="guide" />

      <main className="guide-main">
        <section className="guide-hero">
          <div className="guide-hero-copy">
            <span className="guide-eyebrow"><BadgeCheck size={16} /> OneReport 이용안내</span>
            <h1><span className="guide-hero-question">어디에 신고할지 고민하지 마세요.</span><span>한 번의 신고를 필요한 기관에 연결합니다.</span></h1>
            <p>현재 시연에서는 상황과 위치, 선택한 사고 유형을 바탕으로 대표 기관을 연결합니다. 장기적으로는 공공기관·공기업·지자체·민원 채널까지 하나의 Incident로 잇는 통합 신고·공동대응 플랫폼을 지향합니다.</p>
            <div className="guide-hero-actions">
              <a href="/#report-form">지금 신고하기 <ArrowRight size={18} /></a>
              <a className="secondary" href="/reports/me">내 신고 확인</a>
            </div>
          </div>

          <div className="guide-hero-visual" aria-hidden="true">
            <span className="guide-visual-ring ring-one" />
            <span className="guide-visual-ring ring-two" />
            <div className="guide-center-node"><Siren size={26} /><strong>ONE</strong><small>INCIDENT</small></div>
            <span className="guide-node node-police"><ShieldCheck size={16} />경찰</span>
            <span className="guide-node node-fire"><HeartPulse size={16} />소방</span>
            <span className="guide-node node-kepco"><Zap size={16} />한전</span>
            <span className="guide-node node-road"><Route size={16} />도로</span>
            <span className="guide-node node-gas"><Flame size={16} />가스</span>
          </div>
        </section>

        <section className="guide-section guide-steps" aria-labelledby="guide-steps-title">
          <div className="guide-section-heading">
            <span>HOW IT WORKS</span>
            <h2 id="guide-steps-title">신고는 이렇게 진행돼요.</h2>
            <p>시민은 한 번만 신고하고, 이후 기관별 대응 상황을 계속 확인할 수 있습니다.</p>
          </div>
          <div className="guide-step-grid">
            {responseSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.number}>
                  <div className="guide-step-top">
                    <span className="guide-step-icon"><Icon size={22} /></span>
                    <em>{step.number}</em>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                  {index < responseSteps.length - 1 && <span className="guide-step-arrow"><ArrowRight size={18} /></span>}
                </article>
              );
            })}
          </div>
        </section>

        <section className="guide-scope-section">
          <div className="guide-scope-copy">
            <span className="guide-section-icon"><Building2 size={21} /></span>
            <span className="guide-small-title">서비스 범위</span>
            <h2>OneReport는 기관을 대체하지 않고<br />공동대응을 연결합니다.</h2>
            <p>현재 OneReport는 서비스 시연 환경으로, 실제 기관으로 신고가 접수되지는 않습니다.</p>
            <div className="emergency-number-callout"><CircleAlert size={19} /><span><strong>생명이 위험하면 즉시 112·119</strong>OneReport 화면을 기다리지 말고 먼저 전화하세요.</span></div>
          </div>

          <div className="guide-scope-cards">
            <article className="scope-does">
              <span><Check size={17} /> 현재 시연 범위</span>
              <ul>
                <li>복합 상황을 하나의 Incident로 관리</li>
                <li>상황에 따른 필요 기관 배정</li>
                <li>기관별 대응 상태·Timeline 공유</li>
                <li>추가 기관 지원 요청 기록</li>
              </ul>
            </article>
            <article className="scope-future">
              <span><Sparkles size={17} /> 향후 연동 범위</span>
              <ul>
                <li>실제 112·119 신고 시스템</li>
                <li>지자체·공공기관 민원 시스템</li>
                <li>공기업·생활 인프라 시스템</li>
                <li>출동 ETA·공공 안전 데이터·IoT</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="guide-section guide-agencies" aria-labelledby="guide-agencies-title">
          <div className="guide-section-heading inline">
            <div><span>JOINT RESPONSE</span><h2 id="guide-agencies-title">상황에 맞는 기관으로 자동 연결해요.</h2></div>
            <p>아래는 현재 시연에서 연결되는 대표 기관이며, 상황에 필요한 기관만 배정됩니다.</p>
          </div>
          <div className="guide-agency-grid">
            {agencies.map((agency) => {
              const Icon = agency.icon;
              return (
                <article key={agency.name} className={agency.className}>
                  <span className="guide-agency-symbol">{agency.short}</span>
                  <div><strong>{agency.name}</strong><small>{agency.copy}</small></div>
                  <Icon size={18} />
                </article>
              );
            })}
          </div>
          <p className="guide-agency-expansion"><strong>확장 방향</strong> 지자체 · 상하수도 · 환경 · 생활민원 등 다양한 공공 서비스 채널</p>
        </section>

        <section className="guide-status-section">
          <div className="guide-status-heading">
            <span><Activity size={19} /> 실시간 상태</span>
            <h2>기관의 현재 단계를 순서대로 알려드려요.</h2>
            <p>기관 상태는 중간 단계를 건너뛰지 않고 변경되며 시민 화면에 실시간 반영됩니다.</p>
          </div>
          <ol className="guide-status-flow">
            {agencyStatuses.map((status, index) => (
              <li key={status} className={index < 3 ? "active" : ""}>
                <span>{index < 3 ? <Check size={15} /> : index + 1}</span>
                <strong>{status}</strong>
                <small>{["기관 지정", "신고 확인", "현장 이동", "현장 확인", "조치 진행", "조치 종료"][index]}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="guide-section guide-faq" aria-labelledby="guide-faq-title">
          <div className="guide-section-heading">
            <span>FAQ</span>
            <h2 id="guide-faq-title">자주 묻는 질문</h2>
          </div>
          <div className="guide-faq-list">
            <details open>
              <summary>사고 유형을 정확히 모르겠어요.<ChevronDown size={17} /></summary>
              <p>괜찮습니다. 보이는 상황을 구체적으로 작성하고 가장 가까운 사고 유형을 선택하면, OneReport가 선택 정보를 바탕으로 필요한 기관을 연결합니다.</p>
            </details>
            <details>
              <summary>신고 후 진행 상황은 어디서 보나요?<ChevronDown size={17} /></summary>
              <p>로그인 후 ‘내 신고’에서 신고를 선택하면 기관별 접수·출동·도착·대응 상태와 전체 Timeline을 확인할 수 있습니다.</p>
            </details>
            <details>
              <summary>추가 기관이 필요하면 다시 신고해야 하나요?<ChevronDown size={17} /></summary>
              <p>아닙니다. 현장 기관이 추가 지원을 요청하면 대상 기관이 같은 Incident에 배정되고 시민 상황 화면에도 기록됩니다.</p>
            </details>
          </div>
        </section>

        <section className="guide-cta">
          <span><UsersRound size={24} /></span>
          <div><strong>위험 상황을 발견하셨나요?</strong><p>보이는 상황과 위치만 알려주시면 필요한 기관을 연결합니다.</p></div>
          <a href="/#report-form">신고 시작하기 <ArrowRight size={18} /></a>
        </section>
      </main>

      <footer><span>OneReport</span><p>한 번의 신고, 여러 기관의 공동대응</p></footer>
    </div>
  );
}
