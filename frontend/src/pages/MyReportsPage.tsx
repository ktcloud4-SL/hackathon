import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  Filter,
  MapPin,
  Plus,
  Radio,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  getDefaultPathForUser,
  saveCurrentUser,
} from "../api/auth";
import { ApiError } from "../api/http";
import { getMyReports } from "../api/reports";
import { CitizenHeader } from "../components/CitizenHeader";
import type { Category, IncidentStatus, MyReportItem, Severity } from "../types/report";
import "./my-reports.css";

type ReportFilter = "ALL" | "ACTIVE" | "COMPLETED";

const statusDetails: Record<IncidentStatus, { label: string; copy: string }> = {
  OPEN: { label: "기관 접수 대기", copy: "기관에 신고가 배정되었습니다." },
  RESPONDING: { label: "공동대응 중", copy: "참여 기관이 현장 대응 중입니다." },
  RESOLVED: { label: "대응 완료", copy: "모든 기관의 대응이 완료되었습니다." },
  CLOSED: { label: "상황 종료", copy: "Incident가 최종 종료되었습니다." },
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
};

function formatReportDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusIcon({ status }: { status: IncidentStatus }) {
  if (status === "RESPONDING") return <Radio size={19} />;
  if (status === "RESOLVED" || status === "CLOSED") return <CheckCircle2 size={19} />;
  return <CircleDot size={18} />;
}

export function MyReportsPage() {
  const [reports, setReports] = useState<MyReportItem[]>([]);
  const [filter, setFilter] = useState<ReportFilter>("ALL");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      try {
        const user = await getCurrentUser();
        saveCurrentUser(user);
        if (user.role !== "CITIZEN") {
          window.location.replace(getDefaultPathForUser(user));
          return;
        }

        const response = await getMyReports();
        if (!disposed) setReports(response.items);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          window.location.replace("/login?next=%2Freports%2Fme");
          return;
        }

        if (!disposed) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "신고 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
          );
        }
      } finally {
        if (!disposed) setIsLoading(false);
      }
    };

    void load();
    return () => { disposed = true; };
  }, []);

  const counts = useMemo(() => ({
    all: reports.length,
    active: reports.filter(({ incident }) => incident.status === "OPEN" || incident.status === "RESPONDING").length,
    completed: reports.filter(({ incident }) => incident.status === "RESOLVED" || incident.status === "CLOSED").length,
  }), [reports]);

  const filteredReports = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesFilter = filter === "ALL" ||
        (filter === "ACTIVE" && ["OPEN", "RESPONDING"].includes(report.incident.status)) ||
        (filter === "COMPLETED" && ["RESOLVED", "CLOSED"].includes(report.incident.status));
      const matchesQuery = !normalized ||
        report.description.toLowerCase().includes(normalized) ||
        report.address.toLowerCase().includes(normalized) ||
        String(report.incident.id).includes(normalized);

      return matchesFilter && matchesQuery;
    });
  }, [filter, query, reports]);

  return (
    <div className="app-shell my-reports-shell">
      <CitizenHeader active="my-reports" />

      <main className="my-reports-main">
        <section className="my-reports-hero">
          <div>
            <span className="flow-eyebrow"><FileText size={16} /> MY REPORTS</span>
            <h1>내 신고</h1>
            <p>접수한 신고와 기관별 대응 진행 상황을 한눈에 확인하세요.</p>
          </div>
          <a href="/#report-form"><Plus size={17} /> 새 신고하기</a>
        </section>

        <section className="report-summary-strip" aria-label="신고 현황 요약">
          <div><span>전체 신고</span><strong>{counts.all}</strong><small>건</small></div>
          <div className="active"><span>대응 중</span><strong>{counts.active}</strong><small>건</small></div>
          <div className="completed"><span>완료·종료</span><strong>{counts.completed}</strong><small>건</small></div>
          <p><ShieldCheck size={17} />신고 내용은 본인만 조회할 수 있습니다.</p>
        </section>

        <div className="report-list-toolbar">
          <div className="report-filter-tabs" role="tablist" aria-label="신고 상태 필터">
            {([
              ["ALL", "전체", counts.all],
              ["ACTIVE", "대응 중", counts.active],
              ["COMPLETED", "완료", counts.completed],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
                role="tab"
                aria-selected={filter === value}
              >
                {label}<span>{count}</span>
              </button>
            ))}
          </div>
          <label className="report-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주소·내용·번호 검색" aria-label="내 신고 검색" />
          </label>
        </div>

        {isLoading ? (
          <div className="reports-loading" role="status"><span /><span /><span /></div>
        ) : errorMessage ? (
          <div className="reports-error"><strong>목록을 불러오지 못했어요.</strong><p>{errorMessage}</p><button type="button" onClick={() => window.location.reload()}>다시 시도</button></div>
        ) : filteredReports.length === 0 ? (
          <div className="reports-empty">
            <span><Filter size={24} /></span>
            <strong>조건에 맞는 신고가 없습니다.</strong>
            <p>검색어나 상태 필터를 변경해 보세요.</p>
          </div>
        ) : (
          <section className="my-report-list" aria-label="신고 목록">
            {filteredReports.map((report) => {
              const status = statusDetails[report.incident.status];
              const isCivic = report.incident.track === "CIVIC";
              return (
                <a
                  key={report.id}
                  className="my-report-card"
                  href={`/incidents/${report.incident.id}`}
                >
                  <div className={`report-status-rail status-${report.incident.status.toLowerCase()}`} />
                  <div className="report-card-main">
                    <div className="report-card-heading">
                      <span className={`report-status-icon status-${report.incident.status.toLowerCase()}`}><StatusIcon status={report.incident.status} /></span>
                      <div>
                        <span>Incident #{report.incident.id}</span>
                        <strong>{isCivic && report.incident.status === "RESPONDING" ? "공공신고 처리 중" : status.label}</strong>
                        <small>{isCivic ? "담당기관이 신고를 확인하고 처리하고 있습니다." : status.copy}</small>
                      </div>
                      <span className="report-card-badges">
                        <span className={`report-track-pill track-${report.incident.track.toLowerCase()}`}>{isCivic ? "생활·공공신고" : "긴급·복합대응"}</span>
                        <span className={`report-severity severity-${report.incident.severity.toLowerCase()}`}>긴급도 {severityLabels[report.incident.severity]}</span>
                      </span>
                    </div>
                    <p className="report-card-description">{report.description}</p>
                    <div className="report-card-tags">
                      {report.incident.categories.map((category) => <span key={category}>{categoryLabels[category]}</span>)}
                    </div>
                  </div>
                  <div className="report-card-meta">
                    <span><MapPin size={15} />{report.address}</span>
                    <span><Clock3 size={15} />{formatReportDate(report.createdAt)}</span>
                  </div>
                  <span className="report-card-arrow">상황 보기 <ChevronRight size={17} /></span>
                </a>
              );
            })}
          </section>
        )}

        <section className="report-help-card">
          <div><span><ShieldCheck size={20} /></span><p><strong>신고 이후 상황이 달라졌나요?</strong>생명이 위험하거나 긴급한 추가 상황은 112 또는 119로 즉시 알려주세요.</p></div>
          <a href="/#report-form">추가 신고하기 <ArrowRight size={16} /></a>
        </section>
      </main>

       <footer><span>OneReport</span><p>한 번의 신고, 필요한 기관으로 연결</p></footer>
    </div>
  );
}
