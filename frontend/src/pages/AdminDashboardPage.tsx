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
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addIncidentAgency,
  changeIncidentSeverity,
  closeIncident,
  getAdminIncidents,
} from "../api/admin";
import {
  clearCurrentUser,
  getCurrentUser,
  getDefaultPathForUser,
  logout,
  saveCurrentUser,
} from "../api/auth";
import { ApiError } from "../api/http";
import { connectIncidentEvents, getIncident } from "../api/incidents";
import { applyIncidentStreamEvent } from "../state/incidentEvents";
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
  FIRE: "소방·구급 · 119",
  KEPCO: "한국전력",
  ROAD: "도로관리",
  GAS: "가스안전",
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

function formatToday() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export function AdminDashboardPage() {
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<Severity | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [toast, setToast] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("통합 관리자");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [isDetailLive, setIsDetailLive] = useState(false);

  useEffect(() => {
    void getCurrentUser()
      .then((user) => {
        saveCurrentUser(user);
        if (user.role !== "ADMIN") {
          window.location.replace(getDefaultPathForUser(user));
          return;
        }
        setAdminName(user.name);
        setIsAuthorized(true);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          window.location.replace("/login?next=%2Fadmin");
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "관리자 인증을 확인하지 못했습니다.");
        setIsLoading(false);
      });
  }, []);

  const refreshIncidents = useCallback(async () => {
    try {
      const response = await getAdminIncidents();
      setIncidents(response.items);
      setSelectedIncidentId((current) =>
        current && response.items.some((item) => item.id === current)
          ? current
          : response.items[0]?.id ?? null,
      );
      setLastSyncedAt(new Date());
      setErrorMessage(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.replace("/login?next=%2Fadmin");
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "Incident 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    void refreshIncidents();
    const interval = window.setInterval(() => void refreshIncidents(), 5000);
    return () => window.clearInterval(interval);
  }, [isAuthorized, refreshIncidents]);

  useEffect(() => {
    if (!isAuthorized || selectedIncidentId === null) return;
    const incidentId = selectedIncidentId;
    const source = connectIncidentEvents(incidentId, {
      onEvent: (event) => setIncidents((current) =>
        current.map((incident) =>
          incident.id === incidentId
            ? applyIncidentStreamEvent(incident, event)
            : incident,
        )
      ),
      onOpen: () => {
        setIsDetailLive(true);
        void getIncident(incidentId)
          .then((detail) => setIncidents((current) =>
            current.map((incident) => incident.id === detail.id ? detail : incident)
          ))
          .catch((error) => {
            if (error instanceof ApiError && error.status === 401) {
              window.location.replace("/login?next=%2Fadmin");
            }
          });
      },
      onError: () => {
        setIsDetailLive(false);
        void getCurrentUser().catch((error) => {
          if (error instanceof ApiError && error.status === 401) {
            window.location.replace("/login?next=%2Fadmin");
          }
        });
      },
    });

    return () => {
      source.close();
      setIsDetailLive(false);
    };
  }, [isAuthorized, selectedIncidentId]);

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
    incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0] ?? null;

  const availableAgencies = selectedIncident ? allAgencies.filter(
    (agencyType) =>
      !selectedIncident.agencies.some((agency) => agency.agencyType === agencyType),
  ) : [];

  const updateIncident = (updated: AdminIncident) => {
    setIncidents((current) =>
      current.map((incident) =>
        incident.id === updated.id ? updated : incident,
      ),
    );
  };

  const handleSeverityChange = async (severity: Severity) => {
    if (!selectedIncident || selectedIncident.severity === severity) return;
    setIsActionPending(true);
    try {
      updateIncident(await changeIncidentSeverity(selectedIncident.id, severity));
      setToast(`Incident #${selectedIncident.id} 위험도가 변경되었습니다.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "위험도를 변경하지 못했습니다.");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleAddAgency = async (agencyType: AgencyType) => {
    if (!selectedIncident) return;
    setIsActionPending(true);
    try {
      updateIncident(await addIncidentAgency(selectedIncident.id, agencyType));
      setIsAgencyModalOpen(false);
      setToast(`${agencyLabel[agencyType]}이 대응기관으로 배정되었습니다.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "기관을 추가하지 못했습니다.");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleCloseIncident = async () => {
    if (!selectedIncident || selectedIncident.status !== "RESOLVED") return;
    setIsActionPending(true);
    try {
      updateIncident(await closeIncident(selectedIncident.id));
      setToast(`Incident #${selectedIncident.id}이 종료되었습니다.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Incident를 종료하지 못했습니다.");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleLogout = async () => {
    try { await logout(); } finally {
      clearCurrentUser();
      window.location.assign("/login");
    }
  };

  const stats = {
    responding: incidents.filter((incident) => incident.status === "RESPONDING").length,
    critical: incidents.filter((incident) => incident.severity === "CRITICAL").length,
    resolved: incidents.filter((incident) => incident.status === "RESOLVED").length,
    today: incidents.filter(
      (incident) => new Date(incident.createdAt).toDateString() === new Date().toDateString(),
    ).length,
  };

  if (!selectedIncident) {
    return (
      <div className="admin-shell">
        <div className="agency-empty-page">
          {isLoading ? "Incident 목록을 불러오는 중입니다." : errorMessage ?? "등록된 Incident가 없습니다."}
        </div>
      </div>
    );
  }

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
          <div className="health-row"><span><i />API 서버</span><strong>{errorMessage ? "확인 필요" : "정상"}</strong></div>
          <div className="health-row"><span><i />상세 SSE</span><strong>{isDetailLive ? "연결" : "재연결"}</strong></div>
        </div>

        <div className="admin-profile">
          <span className="profile-avatar"><UserRound size={18} /></span>
          <div><strong>{adminName}</strong><small>ADMIN</small></div>
          <button type="button" aria-label="로그아웃" onClick={() => void handleLogout()}><LogOut size={17} /></button>
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
              <span>{formatToday()}</span>
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
            <button className="refresh-button" type="button" onClick={() => void refreshIncidents()} disabled={isLoading}>
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
                      onChange={(event) => void handleSeverityChange(event.target.value as Severity)}
                      aria-label="선택한 사건 위험도 변경"
                      disabled={isActionPending}
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
                    disabled={isActionPending || availableAgencies.length === 0 || ["RESOLVED", "CLOSED"].includes(selectedIncident.status)}
                  >
                    <Plus size={16} />기관 추가
                  </button>
                  <button
                    className="close-incident-button"
                    type="button"
                    onClick={() => void handleCloseIncident()}
                    disabled={isActionPending || selectedIncident.status !== "RESOLVED"}
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
                  {[...selectedIncident.timeline].reverse().map((event, index, events) => (
                    <div className="admin-timeline-item" key={event.id}>
                      <div className="timeline-axis">
                        <span className={index === 0 ? "latest" : ""}><CircleDot size={14} /></span>
                        {index < events.length - 1 && <i />}
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
                <button key={agencyType} type="button" onClick={() => void handleAddAgency(agencyType)} disabled={isActionPending}>
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
