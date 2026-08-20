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
  Construction,
  Crosshair,
  FileText,
  Flame,
  Gauge,
  Headphones,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquarePlus,
  PhoneCall,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Siren,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminIncidents } from "../mocks/adminIncidents";
import type { AdminIncident } from "../types/admin";
import type {
  AgencyStatus,
  AgencyType,
  Category,
  IncidentStatus,
  Severity,
} from "../types/report";
import "./agency-dashboard.css";

interface AgencyConfig {
  type: AgencyType;
  slug: string;
  name: string;
  fullName: string;
  centerName: string;
  theme: string;
  icon: LucideIcon;
  operator: string;
}

const agencyConfigs: Record<AgencyType, AgencyConfig> = {
  POLICE: {
    type: "POLICE",
    slug: "police",
    name: "경찰",
    fullName: "경찰청",
    centerName: "경찰 통합상황실",
    theme: "police",
    icon: Shield,
    operator: "경찰 상황요원",
  },
  FIRE: {
    type: "FIRE",
    slug: "fire",
    name: "119",
    fullName: "소방청",
    centerName: "119 종합상황실",
    theme: "fire",
    icon: Flame,
    operator: "119 상황요원",
  },
  KEPCO: {
    type: "KEPCO",
    slug: "kepco",
    name: "한전",
    fullName: "한국전력공사",
    centerName: "전력 재난상황실",
    theme: "kepco",
    icon: Zap,
    operator: "전력 복구요원",
  },
  ROAD: {
    type: "ROAD",
    slug: "road",
    name: "도로관리",
    fullName: "도로관리기관",
    centerName: "도로 안전상황실",
    theme: "road",
    icon: Construction,
    operator: "도로 상황요원",
  },
  GAS: {
    type: "GAS",
    slug: "gas",
    name: "가스기관",
    fullName: "가스안전기관",
    centerName: "가스 안전상황실",
    theme: "gas",
    icon: Gauge,
    operator: "가스 안전요원",
  },
};

const slugToAgency: Record<string, AgencyType> = {
  police: "POLICE",
  fire: "FIRE",
  kepco: "KEPCO",
  road: "ROAD",
  gas: "GAS",
};

const agencyStatusOrder: AgencyStatus[] = [
  "ASSIGNED",
  "RECEIVED",
  "DISPATCHED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
];

const agencyStatusLabel: Record<AgencyStatus, string> = {
  ASSIGNED: "배정됨",
  RECEIVED: "접수",
  DISPATCHED: "출동",
  ARRIVED: "현장도착",
  IN_PROGRESS: "조치중",
  COMPLETED: "완료",
};

const nextActionLabel: Partial<Record<AgencyStatus, string>> = {
  ASSIGNED: "사건 접수하기",
  RECEIVED: "출동 시작하기",
  DISPATCHED: "현장 도착 처리",
  ARRIVED: "조치 시작하기",
  IN_PROGRESS: "대응 완료하기",
};

const statusMessage: Record<AgencyStatus, string> = {
  ASSIGNED: "사건을 대응기관에 배정했습니다.",
  RECEIVED: "사건을 접수했습니다.",
  DISPATCHED: "현장으로 출동을 시작했습니다.",
  ARRIVED: "현장에 도착했습니다.",
  IN_PROGRESS: "현장 조치를 시작했습니다.",
  COMPLETED: "현장 대응을 완료했습니다.",
};

const incidentStatusLabel: Record<IncidentStatus, string> = {
  OPEN: "접수",
  RESPONDING: "대응 중",
  RESOLVED: "해결됨",
  CLOSED: "종료",
};

const severityLabel: Record<Severity, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "긴급",
};

const categoryLabel: Record<Category, string> = {
  TRAFFIC_ACCIDENT: "교통사고",
  HUMAN_INJURY: "인명피해",
  ELECTRIC_DAMAGE: "전력시설",
  FIRE_RISK: "화재위험",
  ROAD_DAMAGE: "도로위험",
  GAS_RISK: "가스위험",
};

function getAgencyTypeFromPath(): AgencyType {
  const slug = window.location.pathname.split("/")[2]?.toLowerCase();
  return slugToAgency[slug] ?? "FIRE";
}

function formatTime(dateTime: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateTime));
}

function formatElapsed(dateTime: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(dateTime).getTime()) / 60000));
  return minutes < 60 ? `${minutes}분 전` : `${Math.floor(minutes / 60)}시간 전`;
}

export function AgencyDashboardPage() {
  const agencyType = getAgencyTypeFromPath();
  const config = agencyConfigs[agencyType];
  const AgencyIcon = config.icon;
  const [incidents, setIncidents] = useState<AdminIncident[]>(adminIncidents);
  const agencyIncidents = useMemo(
    () => incidents.filter((incident) => incident.agencies.some((agency) => agency.agencyType === agencyType)),
    [agencyType, incidents],
  );
  const [selectedId, setSelectedId] = useState(
    agencyIncidents.find((incident) => incident.status !== "CLOSED")?.id ?? agencyIncidents[0]?.id ?? 42,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgencyStatus | "ALL">("ALL");
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportAgency, setSupportAgency] = useState<AgencyType | "">("");
  const [supportReason, setSupportReason] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setLastSyncedAt(new Date()), 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedIncident =
    agencyIncidents.find((incident) => incident.id === selectedId) ?? agencyIncidents[0];
  const myAgency = selectedIncident?.agencies.find((agency) => agency.agencyType === agencyType);
  const myStatus = myAgency?.status ?? "ASSIGNED";
  const myStatusIndex = agencyStatusOrder.indexOf(myStatus);
  const nextStatus = agencyStatusOrder[myStatusIndex + 1];

  const filteredIncidents = agencyIncidents.filter((incident) => {
    const currentAgency = incident.agencies.find((agency) => agency.agencyType === agencyType);
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      String(incident.id).includes(query) ||
      incident.report.description.toLowerCase().includes(query) ||
      incident.report.address.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "ALL" || currentAgency?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const availableAgencies = (Object.keys(agencyConfigs) as AgencyType[]).filter(
    (type) =>
      type !== agencyType &&
      !selectedIncident?.agencies.some((agency) => agency.agencyType === type),
  );

  const stats = {
    assigned: agencyIncidents.filter((incident) =>
      incident.agencies.some((agency) => agency.agencyType === agencyType && agency.status === "ASSIGNED"),
    ).length,
    active: agencyIncidents.filter((incident) =>
      incident.agencies.some(
        (agency) => agency.agencyType === agencyType && !["ASSIGNED", "COMPLETED"].includes(agency.status),
      ),
    ).length,
    completed: agencyIncidents.filter((incident) =>
      incident.agencies.some((agency) => agency.agencyType === agencyType && agency.status === "COMPLETED"),
    ).length,
  };

  const updateSelectedIncident = (updater: (incident: AdminIncident) => AdminIncident) => {
    setIncidents((current) =>
      current.map((incident) => (incident.id === selectedIncident.id ? updater(incident) : incident)),
    );
  };

  const handleNextStatus = () => {
    if (!selectedIncident || !nextStatus) return;
    const now = new Date().toISOString();

    updateSelectedIncident((incident) => {
      const nextAgencies = incident.agencies.map((agency) =>
        agency.agencyType === agencyType ? { ...agency, status: nextStatus } : agency,
      );
      const allCompleted = nextAgencies.every((agency) => agency.status === "COMPLETED");
      const incidentStatus: IncidentStatus = allCompleted
        ? "RESOLVED"
        : nextStatus === "RECEIVED" && incident.status === "OPEN"
          ? "RESPONDING"
          : incident.status;

      return {
        ...incident,
        status: incidentStatus,
        agencies: nextAgencies,
        updatedAt: now,
        timeline: [
          {
            id: Date.now(),
            type: "AGENCY_STATUS_CHANGED",
            message: `${config.name}이 ${statusMessage[nextStatus]}`,
            occurredAt: now,
            metadata: { agencyType, previousStatus: myStatus, status: nextStatus, incidentStatus },
          },
          ...incident.timeline,
        ],
      };
    });
    setToast(`${agencyStatusLabel[nextStatus]} 상태로 변경되었습니다.`);
  };

  const handleSupportRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supportAgency || !supportReason.trim() || !selectedIncident) return;
    const now = new Date().toISOString();
    const targetConfig = agencyConfigs[supportAgency];

    updateSelectedIncident((incident) => ({
      ...incident,
      updatedAt: now,
      agencies: [...incident.agencies, { agencyType: supportAgency, status: "ASSIGNED" }],
      timeline: [
        {
          id: Date.now() + 1,
          type: "AGENCY_ASSIGNED",
          message: `${targetConfig.name}이 추가 대응기관으로 배정되었습니다.`,
          occurredAt: now,
          metadata: { agencyType: supportAgency, status: "ASSIGNED" },
        },
        {
          id: Date.now(),
          type: "SUPPORT_REQUESTED",
          message: `${config.name}이 ${targetConfig.name} 지원을 요청했습니다.`,
          occurredAt: now,
          metadata: {
            requesterAgencyType: agencyType,
            targetAgencyType: supportAgency,
            reason: supportReason.trim(),
          },
        },
        ...incident.timeline,
      ],
    }));
    setToast(`${targetConfig.name} 지원 요청이 완료되었습니다.`);
    setSupportAgency("");
    setSupportReason("");
    setSupportModalOpen(false);
  };

  if (!selectedIncident) {
    return <div className="agency-empty-page">배정된 Incident가 없습니다.</div>;
  }

  return (
    <div className={`agency-shell agency-theme-${config.theme}`}>
      <aside className={`agency-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <a className="agency-brand" href="/report">
          <span className="brand-mark" aria-hidden="true"><span /><span /></span>
          <div><strong>OneReport</strong><small>AGENCY CONSOLE</small></div>
        </a>

        <div className="agency-identity">
          <span className="agency-identity-icon"><AgencyIcon size={23} /></span>
          <div><small>{config.fullName}</small><strong>{config.centerName}</strong></div>
          <span className="duty-indicator"><i />근무 중</span>
        </div>

        <nav className="agency-nav" aria-label="기관 메뉴">
          <span>상황실</span>
          <a className="active" href="#agency-overview"><LayoutDashboard size={18} />배정 사건<span>{agencyIncidents.length}</span></a>
          <a href="#agency-timeline"><Activity size={18} />실시간 현황</a>
          <a href="#support"><MessageSquarePlus size={18} />지원 요청</a>
        </nav>

        <div className="agency-contact-card">
          <Headphones size={18} />
          <div><small>공동대응 지원센터</small><strong>내선 2424</strong></div>
          <PhoneCall size={15} />
        </div>

        <div className="agency-profile">
          <span><UserRound size={17} /></span>
          <div><strong>{config.operator}</strong><small>{agencyType} OPERATOR</small></div>
          <button type="button" aria-label="로그아웃"><LogOut size={16} /></button>
        </div>
      </aside>

      {sidebarOpen && <button className="agency-sidebar-backdrop" type="button" onClick={() => setSidebarOpen(false)} aria-label="메뉴 닫기" />}

      <div className="agency-workspace">
        <header className="agency-header">
          <div className="agency-header-title">
            <button type="button" onClick={() => setSidebarOpen(true)} aria-label="메뉴 열기"><Menu size={20} /></button>
            <div><small>ONE REPORT · {agencyType}</small><h1>{config.centerName}</h1></div>
          </div>
          <div className="agency-header-actions">
            <label className="agency-switcher">
              <AgencyIcon size={15} />
              <select
                value={agencyType}
                onChange={(event) => {
                  const target = agencyConfigs[event.target.value as AgencyType];
                  window.location.href = `/agency/${target.slug}`;
                }}
                aria-label="Mock 기관 화면 전환"
              >
                {(Object.keys(agencyConfigs) as AgencyType[]).map((type) => (
                  <option key={type} value={type}>{agencyConfigs[type].name}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <div className="agency-sync"><span><i />실시간 연결</span><small>{formatTime(lastSyncedAt.toISOString())} 동기화</small></div>
            <button className="agency-bell" type="button" aria-label="알림"><Bell size={18} /><i /></button>
          </div>
        </header>

        <main className="agency-main" id="agency-overview">
          <section className="agency-welcome">
            <div><span><ShieldCheck size={15} />오늘의 공동대응 현황</span><h2>{config.name}에 배정된 사건입니다.</h2><p>신규 사건을 접수하고 현장 대응 단계를 실시간으로 공유해 주세요.</p></div>
            <button type="button" onClick={() => setLastSyncedAt(new Date())}><RefreshCw size={16} />목록 새로고침</button>
          </section>

          <section className="agency-stats" aria-label="기관 대응 현황">
            <article className="new"><span><FileText size={21} /></span><div><small>신규 배정</small><strong>{stats.assigned}<em>건</em></strong></div><b>확인 필요</b></article>
            <article className="active"><span><Siren size={21} /></span><div><small>대응 진행</small><strong>{stats.active}<em>건</em></strong></div><b>LIVE</b></article>
            <article className="done"><span><CheckCircle2 size={21} /></span><div><small>대응 완료</small><strong>{stats.completed}<em>건</em></strong></div><b>오늘</b></article>
          </section>

          <section className="agency-console">
            <div className="agency-incident-list">
              <div className="agency-list-heading"><div><h3>배정된 Incident</h3><span>{filteredIncidents.length}건</span></div><span className="polling-label"><i />5초 자동 갱신</span></div>
              <div className="agency-list-filters">
                <label><Search size={15} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="사건 번호, 주소 검색" /></label>
                <label className="agency-status-filter">
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AgencyStatus | "ALL")} aria-label="기관 상태 필터">
                    <option value="ALL">전체 상태</option>
                    {agencyStatusOrder.map((status) => <option key={status} value={status}>{agencyStatusLabel[status]}</option>)}
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
              <div className="agency-list-scroll">
                {filteredIncidents.map((incident) => {
                  const status = incident.agencies.find((agency) => agency.agencyType === agencyType)?.status ?? "ASSIGNED";
                  return (
                    <button key={incident.id} className={`agency-incident-card ${incident.id === selectedIncident.id ? "selected" : ""}`} type="button" onClick={() => setSelectedId(incident.id)}>
                      <span className={`agency-severity-dot severity-${incident.severity.toLowerCase()}`} />
                      <span className="agency-card-body">
                        <span className="agency-card-top"><strong>Incident #{String(incident.id).padStart(3, "0")}</strong><span className={`agency-card-status status-${status.toLowerCase()}`}><i />{agencyStatusLabel[status]}</span></span>
                        <span className="agency-card-description">{incident.report.description}</span>
                        <span className="agency-card-location"><MapPin size={12} />{incident.report.address}</span>
                        <span className="agency-card-footer"><span className={`agency-severity-label severity-${incident.severity.toLowerCase()}`}>{severityLabel[incident.severity]}</span><time>{formatElapsed(incident.updatedAt)}</time></span>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  );
                })}
                {filteredIncidents.length === 0 && <div className="agency-no-results"><Search size={23} /><strong>조건에 맞는 사건이 없습니다.</strong></div>}
              </div>
            </div>

            <article className="agency-incident-detail">
              <div className="agency-detail-hero">
                <div className="agency-detail-top"><div><span>INCIDENT #{String(selectedIncident.id).padStart(3, "0")}</span><div><b className={`severity-${selectedIncident.severity.toLowerCase()}`}><AlertTriangle size={12} />{severityLabel[selectedIncident.severity]}</b><b className={`incident-${selectedIncident.status.toLowerCase()}`}>{incidentStatusLabel[selectedIncident.status]}</b></div></div><time>{formatElapsed(selectedIncident.updatedAt)} 업데이트</time></div>
                <h3>{selectedIncident.report.description}</h3>
                <p><MapPin size={14} />{selectedIncident.report.address}</p>
                <div className="agency-category-list">{selectedIncident.categories.map((category) => <span key={category}>{categoryLabel[category]}</span>)}</div>
              </div>

              <section className="my-response-card">
                <div className="my-response-heading"><div><span className="response-agency-icon"><AgencyIcon size={18} /></span><div><small>{config.name} 대응 상태</small><strong>{agencyStatusLabel[myStatus]}</strong></div></div><span className="response-live"><i />실시간 공유 중</span></div>
                <div className="response-stepper">
                  {agencyStatusOrder.map((status, index) => (
                    <div key={status} className={`response-step ${index < myStatusIndex ? "complete" : ""} ${index === myStatusIndex ? "current" : ""}`}>
                      <span>{index < myStatusIndex ? <Check size={13} /> : index + 1}</span>
                      <small>{agencyStatusLabel[status]}</small>
                    </div>
                  ))}
                </div>
                {nextStatus ? (
                  <button className="next-status-button" type="button" onClick={handleNextStatus}><span><Crosshair size={17} />{nextActionLabel[myStatus]}</span><ChevronRight size={18} /></button>
                ) : (
                  <div className="response-complete"><CheckCircle2 size={18} />이 기관의 현장 대응이 완료되었습니다.</div>
                )}
              </section>

              <section className="agency-detail-section joint-agencies">
                <div className="agency-section-heading"><div><Building2 size={16} /><h4>공동 대응기관</h4></div><button id="support" type="button" onClick={() => setSupportModalOpen(true)} disabled={availableAgencies.length === 0 || selectedIncident.status === "CLOSED"}><MessageSquarePlus size={15} />추가 기관 요청</button></div>
                <div className="joint-agency-grid">
                  {selectedIncident.agencies.map((agency) => {
                    const itemConfig = agencyConfigs[agency.agencyType];
                    const ItemIcon = itemConfig.icon;
                    return <div className={agency.agencyType === agencyType ? "mine" : ""} key={agency.agencyType}><span className={`joint-icon theme-${itemConfig.theme}`}><ItemIcon size={16} /></span><div><strong>{itemConfig.name}{agency.agencyType === agencyType && <em>내 기관</em>}</strong><span className={`status-${agency.status.toLowerCase()}`}><i />{agencyStatusLabel[agency.status]}</span></div></div>;
                  })}
                </div>
              </section>

              <section className="agency-detail-section" id="agency-timeline">
                <div className="agency-section-heading"><div><Clock3 size={16} /><h4>Timeline</h4></div><span>{selectedIncident.timeline.length}개 기록</span></div>
                <div className="agency-timeline">
                  {selectedIncident.timeline.map((item, index) => (
                    <div className="agency-timeline-item" key={item.id}><div><span className={index === 0 ? "latest" : ""}><CircleDot size={13} /></span>{index < selectedIncident.timeline.length - 1 && <i />}</div><div><div><strong>{item.message}</strong><time>{formatTime(item.occurredAt)}</time></div>{item.type === "SUPPORT_REQUESTED" && typeof item.metadata.reason === "string" && <p>요청 사유 · {item.metadata.reason}</p>}</div></div>
                  ))}
                </div>
              </section>
            </article>
          </section>
        </main>
      </div>

      {supportModalOpen && (
        <div className="support-modal-backdrop" onMouseDown={() => setSupportModalOpen(false)}>
          <form className="support-modal" onSubmit={handleSupportRequest} onMouseDown={(event) => event.stopPropagation()}>
            <div className="support-modal-heading"><div><span><MessageSquarePlus size={20} /></span><div><small>INCIDENT #{selectedIncident.id}</small><h2>추가 기관 지원 요청</h2></div></div><button type="button" onClick={() => setSupportModalOpen(false)} aria-label="지원 요청 창 닫기"><X size={18} /></button></div>
            <p>현장에서 추가 대응이 필요한 기관과 요청 사유를 입력해 주세요.</p>
            <label className="support-field"><span>지원 기관 <b>*</b></span><div><select value={supportAgency} onChange={(event) => setSupportAgency(event.target.value as AgencyType)} required><option value="">기관을 선택하세요</option>{availableAgencies.map((type) => <option key={type} value={type}>{agencyConfigs[type].name}</option>)}</select><ChevronDown size={15} /></div></label>
            <label className="support-field"><span>요청 사유 <b>*</b></span><textarea value={supportReason} onChange={(event) => setSupportReason(event.target.value)} placeholder="예: 현장에서 가스 냄새가 발견되었습니다." maxLength={300} required /><small>{supportReason.length} / 300</small></label>
            <div className="support-notice"><AlertTriangle size={15} /><span>요청 즉시 대상 기관이 <strong>배정됨</strong> 상태로 추가되고 Timeline에 기록됩니다.</span></div>
            <div className="support-modal-actions"><button type="button" onClick={() => setSupportModalOpen(false)}>취소</button><button type="submit" disabled={!supportAgency || !supportReason.trim()}><MessageSquarePlus size={16} />지원 요청하기</button></div>
          </form>
        </div>
      )}

      {toast && <div className="agency-toast" role="status"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  );
}
