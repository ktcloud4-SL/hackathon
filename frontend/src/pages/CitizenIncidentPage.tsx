import {
  ArrowLeft,
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  MapPin,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Siren,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  connectIncidentEvents,
  getIncident,
  getIncidentTimeline,
} from "../api/incidents";
import { getCurrentUser } from "../api/auth";
import { ApiError } from "../api/http";
import { CitizenHeader } from "../components/CitizenHeader";
import { IncidentPhoto } from "../components/IncidentPhoto";
import { applyIncidentStreamEvent } from "../state/incidentEvents";
import { loadReportResultForIncident } from "../state/reportResult";
import type {
  IncidentDetail,
} from "../types/incident";
import type {
  AgencyStatus,
  AgencyType,
  Category,
  Severity,
} from "../types/report";
import {
  formatTimelineMessage,
  getAgencyStatusLabel,
  getIncidentStatusDetail,
} from "../utils/incidentPresentation";
import "./citizen-flow.css";

const agencyStatusOrder: AgencyStatus[] = [
  "ASSIGNED",
  "RECEIVED",
  "DISPATCHED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
];

const agencyLabels: Record<AgencyType, { label: string; short: string }> = {
  POLICE: { label: "경찰", short: "112" },
  FIRE: { label: "소방·구급", short: "119" },
  KEPCO: { label: "한국전력", short: "한전" },
  ROAD: { label: "도로관리", short: "도로" },
  GAS: { label: "가스안전", short: "가스" },
  LOCAL_GOV: { label: "관할 지자체", short: "지자체" },
};

const severityLabels: Record<Severity, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "긴급",
};

const categoryLabels: Record<Category, string> = {
  TRAFFIC_ACCIDENT: "교통사고",
  HUMAN_INJURY: "인명 피해",
  ELECTRIC_DAMAGE: "전기 설비 파손",
  FIRE_RISK: "화재 위험",
  ROAD_DAMAGE: "도로 파손",
  GAS_RISK: "가스 위험",
  ANIMAL_CARCASS: "동물 사체",
  OTHER_CIVIC: "기타 생활·공공신고",
};

type ConnectionState = "connecting" | "live" | "retrying" | "error";

function parseIncidentId() {
  const segment = window.location.pathname.split("/").filter(Boolean).at(-1);
  const incidentId = Number(segment);
  return Number.isFinite(incidentId) && incidentId > 0 ? incidentId : 42;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function connectionContent(state: ConnectionState) {
  if (state === "live") return { label: "실시간 연결됨", icon: Wifi };
  if (state === "retrying") return { label: "재연결 중", icon: RefreshCw };
  if (state === "connecting") return { label: "연결 확인 중", icon: Radio };
  return { label: "연결 오류", icon: WifiOff };
}

export function CitizenIncidentPage() {
  const incidentId = useMemo(parseIncidentId, []);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasMatchingReportResult = useMemo(
    () => loadReportResultForIncident(incidentId) !== null,
    [incidentId],
  );

  useEffect(() => {
    let source: EventSource | undefined;
    let disposed = false;
    let hasOpened = false;

    const synchronize = async () => {
      const [detail, timeline] = await Promise.all([
        getIncident(incidentId),
        getIncidentTimeline(incidentId),
      ]);

      if (!disposed) {
        setIncident({ ...detail, timeline: timeline.items });
        setErrorMessage(null);
      }
    };

    void synchronize()
      .then(() => {
        if (disposed) return;

        source = connectIncidentEvents(incidentId, {
          onEvent: (event) => setIncident((current) =>
            current ? applyIncidentStreamEvent(current, event) : current
          ),
          onOpen: () => {
            setConnection("live");
            if (hasOpened) void synchronize();
            hasOpened = true;
          },
          onError: () => {
            setConnection("retrying");
            void getCurrentUser().catch((error) => {
              if (error instanceof ApiError && error.status === 401) {
                window.location.replace(`/login?next=${encodeURIComponent(`/incidents/${incidentId}`)}`);
              }
            });
          },
        });
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent(`/incidents/${incidentId}`)}`);
          return;
        }
        if (!disposed) {
          setConnection("error");
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Incident 정보를 불러오지 못했습니다.",
          );
        }
      });

    return () => {
      disposed = true;
      source?.close();
    };
  }, [incidentId]);

  if (!incident) {
    return (
      <div className="app-shell citizen-flow-shell">
        <CitizenHeader active="my-reports" />
        <main className="citizen-flow-main incident-main">
          <section className="flow-card">
            {errorMessage ? (
              <>
                <h1>상황 정보를 불러오지 못했습니다.</h1>
                <p>{errorMessage}</p>
                <button type="button" onClick={() => window.location.reload()}>다시 시도</button>
              </>
            ) : (
              <><h1>Incident 정보를 불러오는 중입니다.</h1><p>잠시만 기다려 주세요.</p></>
            )}
          </section>
        </main>
      </div>
    );
  }

  const isCivic = incident.track === "CIVIC";
  const statusDetail = getIncidentStatusDetail(incident.track, incident.status);
  const connectionDetail = connectionContent(connection);
  const ConnectionIcon = connectionDetail.icon;

  const progress = (() => {
    if (incident.agencies.length === 0) return 0;
    const total = incident.agencies.reduce(
      (sum, agency) => sum + agencyStatusOrder.indexOf(agency.status),
      0,
    );
    return Math.round(
      (total / (incident.agencies.length * (agencyStatusOrder.length - 1))) * 100,
    );
  })();

  const sortedTimeline = [...incident.timeline].sort((a, b) => b.id - a.id);

  return (
    <div className="app-shell citizen-flow-shell">
      <CitizenHeader active="my-reports" />

      <main className="citizen-flow-main incident-main">
        <div className="flow-breadcrumb incident-breadcrumb">
          <a href="/reports/me"><ArrowLeft size={16} /> 내 신고</a>
          <span>Incident #{incident.id}</span>
          <span className={`connection-badge connection-${connection}`}>
            <ConnectionIcon size={14} /> {connectionDetail.label}
          </span>
        </div>

        <section className={`incident-hero incident-${incident.status.toLowerCase()}`}>
          <div className="incident-hero-heading">
            <span className="incident-icon"><Siren size={26} /></span>
            <div>
              <div className="incident-title-row">
                <span>Incident #{incident.id}</span>
                <span className={`report-track-pill track-${incident.track.toLowerCase()}`}>
                  {isCivic ? "생활·공공신고" : "긴급·복합대응"}
                </span>
              </div>
              <h1>{statusDetail.label}</h1>
              <p>{statusDetail.copy}</p>
            </div>
          </div>
          <div className="incident-hero-meta">
            <span className={`severity-pill severity-${incident.severity.toLowerCase()}`}>
              긴급도 {severityLabels[incident.severity]}
            </span>
            <span><Clock3 size={15} /> {formatDateTime(incident.updatedAt)} 업데이트</span>
          </div>
          <div className="overall-progress">
            <div>
               <span>{isCivic ? "전체 처리 진행률" : "전체 대응 진행률"}</span>
              <strong>{progress}%</strong>
            </div>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          </div>
        </section>

        <div className="incident-layout">
          <div className="incident-primary-column">
            <section className="flow-card responding-agencies-card">
              <div className="flow-card-heading">
                <div>
                  <span className="live-dot"><span /> LIVE</span>
                   <h2>{isCivic ? "기관별 처리 현황" : "기관별 대응 현황"}</h2>
                </div>
                <span className="result-count">{incident.agencies.length}개 기관</span>
              </div>

              <div className="agency-response-list">
                {incident.agencies.map((agency) => {
                  const detail = agencyLabels[agency.agencyType];
                  const statusIndex = agencyStatusOrder.indexOf(agency.status);

                  return (
                    <article key={agency.agencyType} className={`agency-response agency-${agency.agencyType.toLowerCase()}`}>
                      <div className="agency-response-top">
                        <span className="agency-symbol">{detail.short}</span>
                        <div>
                          <strong>{detail.label}</strong>
                          <small>마지막 변경 {formatTime(agency.updatedAt)}</small>
                        </div>
                        <span className={`agency-current-status status-${agency.status.toLowerCase()}`}>
                          {agency.status === "COMPLETED" && <Check size={14} />}
                           {getAgencyStatusLabel(incident.track, agency.status)}
                        </span>
                      </div>
                      <div className="agency-stepper" aria-label={`${detail.label} ${isCivic ? "처리" : "대응"} 단계`}>
                        {agencyStatusOrder.map((status, index) => (
                          <span
                            key={status}
                            className={index <= statusIndex ? "done" : ""}
                             title={getAgencyStatusLabel(incident.track, status)}
                          />
                        ))}
                      </div>
                      <div className="agency-step-labels">
                         {agencyStatusOrder.map((status) => <span key={status}>{getAgencyStatusLabel(incident.track, status)}</span>)}
                      </div>
                    </article>
                  );
                })}
              </div>

            </section>

            <section className="flow-card timeline-card">
              <div className="flow-card-heading">
                <div>
                  <span className="section-number"><BellRing size={15} /></span>
                  <h2>실시간 상황 기록</h2>
                </div>
                <span className="result-count">{incident.timeline.length}건</span>
              </div>

              <ol className="citizen-timeline">
                {sortedTimeline.map((event, index) => (
                  <li key={event.id} className={index === 0 ? "latest" : ""}>
                    <span className="timeline-node">
                      {event.type === "INCIDENT_RESOLVED" || event.type === "INCIDENT_CLOSED"
                        ? <CheckCircle2 size={18} />
                        : event.type === "AGENCY_STATUS_CHANGED"
                          ? <Radio size={18} />
                          : <CircleDot size={17} />}
                    </span>
                    <div>
                      <span>{formatTime(event.occurredAt)}{index === 0 && <em>최신</em>}</span>
                      <p>{formatTimelineMessage(event, incident.track)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="incident-side-column">
            <section className="flow-card incident-summary-card">
              <div className="flow-card-heading compact">
                <div><span className="section-number"><Building2 size={15} /></span><h2>신고 요약</h2></div>
              </div>
              <div className="summary-location">
                <span><MapPin size={18} /></span>
                <div><small>사고 위치</small><strong>{incident.report.address}</strong></div>
              </div>
              <p className="summary-description">{incident.report.description}</p>
              <div className="summary-categories">
                {incident.categories.map((category) => <span key={category}>{categoryLabels[category]}</span>)}
              </div>
              <IncidentPhoto
                imageUrl={incident.report.imageUrl}
                incidentId={incident.id}
                compact
              />
              {hasMatchingReportResult && (
                <a href="/report/analysis">분석 결과 다시 보기 <ChevronRight size={16} /></a>
              )}
            </section>

            <section className="citizen-safety-card">
              <span><ShieldCheck size={22} /></span>
              <div>
                <strong>안전한 곳에서 기다려 주세요.</strong>
                <p>현장 상황이 급격히 악화되거나 생명이 위험하면 이 화면을 기다리지 말고 112 또는 119에 전화하세요.</p>
              </div>
            </section>

            <section className="incident-id-card">
              <div><Route size={18} /><span>접수 번호</span></div>
              <strong>OR-{new Date(incident.createdAt).getFullYear()}-{String(incident.id).padStart(6, "0")}</strong>
              <small>문의 시 접수 번호를 알려주세요.</small>
            </section>
          </aside>
        </div>
      </main>

      <footer>
        <span>OneReport</span>
         <p>한 번의 신고, 필요한 기관으로 연결</p>
      </footer>
    </div>
  );
}
