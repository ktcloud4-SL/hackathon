import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminIncidents } from "../mocks/adminIncidents";
import type { AdminIncident } from "../types/admin";
import type {
  AgencyStatus,
  AgencyType,
  Category,
  IncidentStatus,
  Severity,
} from "../types/report";
import "./admin-dashboard.css";

const severityLabel: Record<Severity, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "긴급",
};

const incidentStatusLabel: Record<IncidentStatus, string> = {
  OPEN: "접수",
  RESPONDING: "대응 중",
  RESOLVED: "해결됨",
  CLOSED: "종료",
};

const agencyLabel: Record<AgencyType, string> = {
  POLICE: "경찰",
  FIRE: "119",
  KEPCO: "한전",
  ROAD: "도로관리",
  GAS: "가스기관",
};

const agencyStatusLabel: Record<AgencyStatus, string> = {
  ASSIGNED: "배정됨",
  RECEIVED: "접수",
  DISPATCHED: "출동",
  ARRIVED: "현장도착",
  IN_PROGRESS: "조치중",
  COMPLETED: "완료",
};

const categoryLabel: Record<Category, string> = {
  TRAFFIC_ACCIDENT: "교통사고",
  HUMAN_INJURY: "인명피해",
  ELECTRIC_DAMAGE: "전력시설",
  FIRE_RISK: "화재위험",
  ROAD_DAMAGE: "도로위험",
  GAS_RISK: "가스위험",
};

const allAgencies: AgencyType[] = ["POLICE", "FIRE", "KEPCO", "ROAD", "GAS"];

function formatTime(dateTime: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateTime));
}

function formatDate(dateTime: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateTime));
}

export function AdminDashboardPage() {
  const [incidents, setIncidents] = useState<AdminIncident[]>(adminIncidents);
  const [selectedIncidentId, setSelectedIncidentId] = useState(adminIncidents[0].id);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<Severity | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setLastSyncedAt(new Date()), 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredIncidents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return incidents.filter((incident) => {
      const matchesStatus = statusFilter === "ALL" || incident.status === statusFilter;
      const matchesSeverity = severityFilter === "ALL" || incident.severity === severityFilter;
      const matchesQuery =
        !normalizedQuery ||
        String(incident.id).includes(normalizedQuery) ||
        incident.report.description.toLowerCase().includes(normalizedQuery) ||
        incident.report.address.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesSeverity && matchesQuery;
    });
  }, [incidents, searchQuery, severityFilter, statusFilter]);

  const selectedIncident =
    incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0];

  const availableAgencies = allAgencies.filter(
    (agencyType) =>
      !selectedIncident.agencies.some((agency) => agency.agencyType === agencyType),
  );

  const updateSelectedIncident = (updater: (incident: AdminIncident) => AdminIncident) => {
    setIncidents((current) =>
      current.map((incident) =>
        incident.id === selectedIncident.id ? updater(incident) : incident,
      ),
    );
  };

  const handleSeverityChange = (severity: Severity) => {
    const previousSeverity = selectedIncident.severity;
    if (previousSeverity === severity) return;

    updateSelectedIncident((incident) => ({
      ...incident,
      severity,
      updatedAt: new Date().toISOString(),
      timeline: [
        {
          id: Date.now(),
          type: "SEVERITY_CHANGED",
          message: `관리자가 위험도를 ${severityLabel[severity]}(으)로 변경했습니다.`,
          occurredAt: new Date().toISOString(),
          metadata: { previousSeverity, severity },
        },
        ...incident.timeline,
      ],
    }));
    setToast(`Incident #${selectedIncident.id} 위험도가 변경되었습니다.`);
  };

  const handleAddAgency = (agencyType: AgencyType) => {
    updateSelectedIncident((incident) => ({
      ...incident,
      updatedAt: new Date().toISOString(),
      agencies: [...incident.agencies, { agencyType, status: "ASSIGNED" }],
      timeline: [
        {
          id: Date.now(),
          type: "AGENCY_ASSIGNED",
          message: `관리자가 ${agencyLabel[agencyType]}을 대응기관으로 추가했습니다.`,
          occurredAt: new Date().toISOString(),
          metadata: { agencyType, status: "ASSIGNED" },
        },
        ...incident.timeline,
      ],
    }));
    setIsAgencyModalOpen(false);
    setToast(`${agencyLabel[agencyType]}이 대응기관으로 배정되었습니다.`);
  };

  const handleCloseIncident = () => {
    if (selectedIncident.status !== "RESOLVED") return;

    updateSelectedIncident((incident) => ({
      ...incident,
      status: "CLOSED",
      updatedAt: new Date().toISOString(),
      timeline: [
        {
          id: Date.now(),
          type: "INCIDENT_CLOSED",
          message: "관리자가 사건을 종료했습니다.",
          occurredAt: new Date().toISOString(),
          metadata: {},
        },
        ...incident.timeline,
      ],
    }));
    setToast(`Incident #${selectedIncident.id}이 종료되었습니다.`);
  };

  const stats = {
    responding: incidents.filter((incident) => incident.status === "RESPONDING").length,
    critical: incidents.filter((incident) => incident.severity === "CRITICAL").length,
    resolved: incidents.filter((incident) => incident.status === "RESOLVED").length,
    today: incidents.length,
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${isSidebarOpen ? "is-open" : ""}`}>
        <div className="admin-brand">
          <span className="brand-mark" aria-hidden="true"><span /><span /></span>
          <div><strong>OneReport</strong><small>ADMIN CONSOLE</small></div>
        </div>

        <nav className="admin-nav" aria-label="관리자 메뉴">
          <span className="admin-nav-label">운영</span>
          <a className="is-active" href="/admin">
            <LayoutDashboard size={19} />
            통합 상황판
            <span className="nav-count">{incidents.length}</span>
          </a>
          <a href="#incident-list">
            <FileText size={19} />
            전체 사건
          </a>
          <span className="admin-nav-label second">시스템</span>
          <a href="#agencies">
            <Building2 size={19} />
            대응기관 현황
          </a>
        </nav>

        <div className="system-health">
          <div className="health-title"><Activity size={16} /><span>시스템 상태</span></div>
          <div className="health-row"><span><i />API 서버</span><strong>정상</strong></div>
          <div className="health-row"><span><i />SSE 연결</span><strong>정상</strong></div>
        </div>

        <div className="admin-profile">
          <span className="profile-avatar"><UserRound size={18} /></span>
          <div><strong>통합 관리자</strong><small>ADMIN</small></div>
          <button type="button" aria-label="로그아웃"><LogOut size={17} /></button>
        </div>
      </aside>

      {isSidebarOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="메뉴 닫기"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="admin-workspace">
        <header className="admin-header">
          <div className="admin-header-title">
            <button
              className="admin-menu-button"
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="관리자 메뉴 열기"
            >
              <Menu size={21} />
            </button>
            <div>
              <span>2026년 8월 20일 목요일</span>
              <h1>통합 상황판</h1>
            </div>
          </div>
          <div className="admin-header-actions">
            <div className="sync-state">
              <span><i />실시간 동기화</span>
              <small>{formatTime(lastSyncedAt.toISOString())} 갱신</small>
            </div>
            <button className="icon-button" type="button" aria-label="알림">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
          </div>
        </header>

        <main className="admin-main">
          <section className="admin-intro">
            <div>
              <div className="admin-eyebrow"><ShieldCheck size={15} /> OneReport Command Center</div>
              <h2>전체 사고 대응 현황</h2>
              <p>기관별 대응 상태를 확인하고 필요한 조치를 빠르게 이어가세요.</p>
            </div>
            <button className="refresh-button" type="button" onClick={() => setLastSyncedAt(new Date())}>
              <RefreshCw size={16} />
              지금 새로고침
            </button>
          </section>

          <section className="stats-grid" aria-label="사건 현황 요약">
            <article className="stat-card responding">
              <span className="stat-icon"><Activity size={22} /></span>
              <div><small>현재 대응 중</small><strong>{stats.responding}<em>건</em></strong></div>
              <span className="stat-trend">LIVE</span>
            </article>
            <article className="stat-card critical">
              <span className="stat-icon"><Siren size={22} /></span>
              <div><small>긴급 사건</small><strong>{stats.critical}<em>건</em></strong></div>
              <span className="stat-caption">우선 확인 필요</span>
            </article>
            <article className="stat-card resolved">
              <span className="stat-icon"><CheckCircle2 size={22} /></span>
              <div><small>종료 대기</small><strong>{stats.resolved}<em>건</em></strong></div>
              <span className="stat-caption">관리자 확인</span>
            </article>
            <article className="stat-card today">
              <span className="stat-icon"><FileText size={22} /></span>
              <div><small>오늘 접수</small><strong>{stats.today}<em>건</em></strong></div>
              <span className="stat-caption">전체 신고</span>
            </article>
          </section>

          <section className="incident-console" id="incident-list">
            <div className="incident-list-panel">
              <div className="panel-heading">
                <div><h3>Incident 목록</h3><span>총 {filteredIncidents.length}건</span></div>
                <SlidersHorizontal size={18} />
              </div>

              <div className="incident-filters">
                <label className="admin-search">
                  <Search size={16} />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="사건 번호, 주소 검색"
                    aria-label="사건 검색"
                  />
                </label>
                <div className="filter-selects">
                  <label>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as IncidentStatus | "ALL")}
                      aria-label="사건 상태 필터"
                    >
                      <option value="ALL">전체 상태</option>
                      <option value="OPEN">접수</option>
                      <option value="RESPONDING">대응 중</option>
                      <option value="RESOLVED">해결됨</option>
                      <option value="CLOSED">종료</option>
                    </select>
                    <ChevronDown size={14} />
                  </label>
                  <label>
                    <select
                      value={severityFilter}
                      onChange={(event) => setSeverityFilter(event.target.value as Severity | "ALL")}
                      aria-label="위험도 필터"
                    >
                      <option value="ALL">전체 위험도</option>
                      <option value="CRITICAL">긴급</option>
                      <option value="HIGH">높음</option>
                      <option value="MEDIUM">보통</option>
                      <option value="LOW">낮음</option>
                    </select>
                    <ChevronDown size={14} />
                  </label>
                </div>
              </div>

              <div className="incident-list">
                {filteredIncidents.length > 0 ? (
                  filteredIncidents.map((incident) => (
                    <button
                      key={incident.id}
                      className={`incident-list-item ${selectedIncident.id === incident.id ? "is-selected" : ""}`}
                      type="button"
                      onClick={() => setSelectedIncidentId(incident.id)}
                    >
                      <span className={`severity-bar severity-${incident.severity.toLowerCase()}`} />
                      <span className="incident-item-content">
                        <span className="incident-item-topline">
                          <strong>Incident #{String(incident.id).padStart(3, "0")}</strong>
                          <span className={`incident-status status-${incident.status.toLowerCase()}`}>
                            <i />{incidentStatusLabel[incident.status]}
                          </span>
                        </span>
                        <span className="incident-description">{incident.report.description}</span>
                        <span className="incident-item-meta">
                          <span><MapPin size={13} />{incident.report.address}</span>
                          <span><Clock3 size={13} />{formatTime(incident.updatedAt)}</span>
                        </span>
                        <span className="incident-item-bottom">
                          <span className={`severity-chip severity-${incident.severity.toLowerCase()}`}>
                            {severityLabel[incident.severity]}
                          </span>
                          <span className="agency-stack">
                            {incident.agencies.slice(0, 4).map((agency) => (
                              <i key={agency.agencyType}>{agencyLabel[agency.agencyType].slice(0, 2)}</i>
                            ))}
                            {incident.agencies.length > 4 && <em>+{incident.agencies.length - 4}</em>}
                          </span>
                        </span>
                      </span>
                      <ChevronRight className="incident-chevron" size={18} />
                    </button>
                  ))
                ) : (
                  <div className="empty-incidents">
                    <Search size={25} />
                    <strong>조건에 맞는 사건이 없습니다.</strong>
                    <span>필터나 검색어를 변경해 주세요.</span>
                  </div>
                )}
              </div>
            </div>

            <article className="incident-detail-panel">
              <div className="detail-hero">
                <div className="detail-hero-top">
                  <div>
                    <span className="detail-id">INCIDENT #{String(selectedIncident.id).padStart(3, "0")}</span>
                    <div className="detail-badges">
                      <span className={`severity-badge severity-${selectedIncident.severity.toLowerCase()}`}>
                        <AlertTriangle size={13} />{severityLabel[selectedIncident.severity]}
                      </span>
                      <span className={`status-badge status-${selectedIncident.status.toLowerCase()}`}>
                        {incidentStatusLabel[selectedIncident.status]}
                      </span>
                    </div>
                  </div>
                  <span className="detail-updated">최근 변경 {formatTime(selectedIncident.updatedAt)}</span>
                </div>
                <h3>{selectedIncident.report.description}</h3>
                <div className="detail-location"><MapPin size={15} />{selectedIncident.report.address}</div>
                <div className="category-list">
                  {selectedIncident.categories.map((category) => (
                    <span key={category}>{categoryLabel[category]}</span>
                  ))}
                </div>
              </div>

              <div className="admin-actions-card">
                <div className="action-block">
                  <span className="action-label"><Gauge size={15} />위험도 변경</span>
                  <label className={`severity-select severity-${selectedIncident.severity.toLowerCase()}`}>
                    <select
                      value={selectedIncident.severity}
                      onChange={(event) => handleSeverityChange(event.target.value as Severity)}
                      aria-label="선택한 사건 위험도 변경"
                    >
                      <option value="LOW">낮음</option>
                      <option value="MEDIUM">보통</option>
                      <option value="HIGH">높음</option>
                      <option value="CRITICAL">긴급</option>
                    </select>
                    <ChevronDown size={15} />
                  </label>
                </div>
                <div className="action-buttons">
                  <button
                    className="add-agency-button"
                    type="button"
                    onClick={() => setIsAgencyModalOpen(true)}
                    disabled={availableAgencies.length === 0 || selectedIncident.status === "CLOSED"}
                  >
                    <Plus size={16} />기관 추가
                  </button>
                  <button
                    className="close-incident-button"
                    type="button"
                    onClick={handleCloseIncident}
                    disabled={selectedIncident.status !== "RESOLVED"}
                    title={selectedIncident.status !== "RESOLVED" ? "해결된 사건만 종료할 수 있습니다." : "사건 종료"}
                  >
                    <Check size={16} />사건 종료
                  </button>
                </div>
              </div>

              <section className="detail-section" id="agencies">
                <div className="detail-section-heading">
                  <div><Building2 size={17} /><h4>대응기관</h4></div>
                  <span>{selectedIncident.agencies.length}개 기관 참여</span>
                </div>
                <div className="agency-status-grid">
                  {selectedIncident.agencies.map((agency) => (
                    <div className="agency-status-card" key={agency.agencyType}>
                      <span className={`agency-symbol agency-${agency.agencyType.toLowerCase()}`}>
                        {agencyLabel[agency.agencyType].slice(0, 2)}
                      </span>
                      <div>
                        <strong>{agencyLabel[agency.agencyType]}</strong>
                        <span className={`agency-current status-${agency.status.toLowerCase()}`}>
                          <i />{agencyStatusLabel[agency.status]}
                        </span>
                      </div>
                      <ChevronRight size={16} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="detail-section timeline-section">
                <div className="detail-section-heading">
                  <div><Clock3 size={17} /><h4>Timeline</h4></div>
                  <span>{selectedIncident.timeline.length}개 기록</span>
                </div>
                <div className="admin-timeline">
                  {selectedIncident.timeline.map((event, index) => (
                    <div className="admin-timeline-item" key={event.id}>
                      <div className="timeline-axis">
                        <span className={index === 0 ? "latest" : ""}><CircleDot size={14} /></span>
                        {index < selectedIncident.timeline.length - 1 && <i />}
                      </div>
                      <div className="timeline-copy">
                        <div><strong>{event.message}</strong><time>{formatTime(event.occurredAt)}</time></div>
                        <small>{formatDate(event.occurredAt)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </article>
          </section>
        </main>
      </div>

      {isAgencyModalOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setIsAgencyModalOpen(false)}>
          <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="agency-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-modal-heading">
              <div><span><Building2 size={20} /></span><div><small>INCIDENT #{selectedIncident.id}</small><h2 id="agency-modal-title">대응기관 추가</h2></div></div>
              <button type="button" onClick={() => setIsAgencyModalOpen(false)} aria-label="기관 추가 창 닫기"><X size={19} /></button>
            </div>
            <p>현장 대응에 추가로 필요한 기관을 선택하세요. 선택 즉시 <strong>배정됨</strong> 상태로 참여합니다.</p>
            <div className="agency-options">
              {availableAgencies.map((agencyType) => (
                <button key={agencyType} type="button" onClick={() => handleAddAgency(agencyType)}>
                  <span className={`agency-symbol agency-${agencyType.toLowerCase()}`}>{agencyLabel[agencyType].slice(0, 2)}</span>
                  <div><strong>{agencyLabel[agencyType]}</strong><small>{agencyType}</small></div>
                  <Plus size={18} />
                </button>
              ))}
            </div>
            {availableAgencies.length === 0 && (
              <div className="no-agency-option"><CheckCircle2 size={22} />모든 기관이 이미 참여하고 있습니다.</div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="admin-toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
