import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { divIcon } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import {
  clearCurrentUser,
  getCurrentUser,
  getDefaultPathForUser,
  logout,
  saveCurrentUser,
} from "../api/auth";
import { ApiError } from "../api/http";
import "leaflet/dist/leaflet.css";
import "./admin-dashboard.css";

const initialHourlyReports = [
  { label: "00–03", count: 7 },
  { label: "03–06", count: 5 },
  { label: "06–09", count: 14 },
  { label: "09–12", count: 16 },
  { label: "12–15", count: 13 },
  { label: "15–18", count: 18 },
  { label: "18–21", count: 32 },
  { label: "21–24", count: 19 },
];

const initialIncidentTypes = [
  { label: "교통사고", count: 36, color: "#0e6b4e" },
  { label: "인명피해", count: 29, color: "#ef6a3a" },
  { label: "화재 위험", count: 22, color: "#dc4e32" },
  { label: "도로 위험", count: 16, color: "#397baa" },
  { label: "전력 시설", count: 12, color: "#7767a8" },
  { label: "가스 위험", count: 9, color: "#d39a2d" },
];

const initialRegionalHotspots = [
  { name: "강남구", detail: "역삼·논현 일대", count: 27, latitude: 37.5172, longitude: 127.0473, level: "critical" },
  { name: "송파구", detail: "잠실·문정 일대", count: 21, latitude: 37.5145, longitude: 127.1059, level: "high" },
  { name: "마포구", detail: "홍대·공덕 일대", count: 18, latitude: 37.5663, longitude: 126.9014, level: "high" },
  { name: "영등포구", detail: "여의도·당산 일대", count: 15, latitude: 37.5264, longitude: 126.8962, level: "medium" },
  { name: "종로구", detail: "광화문·종각 일대", count: 11, latitude: 37.5735, longitude: 126.979, level: "medium" },
  { name: "서초구", detail: "서초·반포 일대", count: 4, latitude: 37.4837, longitude: 127.0324, level: "low" },
  { name: "관악구", detail: "신림·봉천 일대", count: 3, latitude: 37.4784, longitude: 126.9516, level: "low" },
  { name: "강서구", detail: "마곡·화곡 일대", count: 3, latitude: 37.5509, longitude: 126.8495, level: "low" },
  { name: "구로구", detail: "구로·개봉 일대", count: 3, latitude: 37.4954, longitude: 126.8874, level: "low" },
  { name: "용산구", detail: "한남·이태원 일대", count: 2, latitude: 37.5326, longitude: 126.9905, level: "low" },
  { name: "성동구", detail: "성수·왕십리 일대", count: 2, latitude: 37.5633, longitude: 127.0371, level: "low" },
  { name: "광진구", detail: "건대·구의 일대", count: 2, latitude: 37.5385, longitude: 127.0823, level: "low" },
  { name: "노원구", detail: "상계·중계 일대", count: 1, latitude: 37.6542, longitude: 127.0568, level: "low" },
  { name: "은평구", detail: "연신내·불광 일대", count: 1, latitude: 37.6027, longitude: 126.9291, level: "low" },
  { name: "동대문구", detail: "청량리·장안 일대", count: 1, latitude: 37.5744, longitude: 127.0396, level: "low" },
  { name: "강동구", detail: "천호·길동 일대", count: 1, latitude: 37.5301, longitude: 127.1238, level: "low" },
  { name: "서대문구", detail: "신촌·홍제 일대", count: 1, latitude: 37.5791, longitude: 126.9368, level: "low" },
  { name: "양천구", detail: "목동·신정 일대", count: 1, latitude: 37.517, longitude: 126.8666, level: "low" },
  { name: "동작구", detail: "사당·노량진 일대", count: 1, latitude: 37.5124, longitude: 126.9393, level: "low" },
  { name: "금천구", detail: "가산·시흥 일대", count: 1, latitude: 37.4569, longitude: 126.8955, level: "low" },
  { name: "성북구", detail: "성신·길음 일대", count: 1, latitude: 37.5894, longitude: 127.0167, level: "low" },
  { name: "중랑구", detail: "면목·상봉 일대", count: 1, latitude: 37.6063, longitude: 127.0927, level: "low" },
  { name: "강북구", detail: "수유·미아 일대", count: 1, latitude: 37.6396, longitude: 127.0257, level: "low" },
  { name: "도봉구", detail: "창동·도봉 일대", count: 1, latitude: 37.6688, longitude: 127.0471, level: "low" },
  { name: "중구", detail: "명동·을지로 일대", count: 1, latitude: 37.5641, longitude: 126.9979, level: "low" },
];

const mapTileUrl = import.meta.env.VITE_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

type LiveMockEvent = {
  id: number;
  district: string;
  incidentType: string;
  occurredAt: Date;
};

function pickWeightedIndex(items: Array<{ count: number }>) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let cursor = Math.random() * total;

  for (let index = 0; index < items.length; index += 1) {
    cursor -= items[index].count;
    if (cursor <= 0) return index;
  }

  return items.length - 1;
}

function formatLiveTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatToday() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export function AdminMonitoringPage() {
  const [adminName, setAdminName] = useState("통합 관리자");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hourlyReports, setHourlyReports] = useState(initialHourlyReports);
  const [incidentTypeCounts, setIncidentTypeCounts] = useState(initialIncidentTypes);
  const [regionalHotspots, setRegionalHotspots] = useState(initialRegionalHotspots);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isCompactMap, setIsCompactMap] = useState(() => window.matchMedia("(max-width: 620px)").matches);
  const [liveEvent, setLiveEvent] = useState<LiveMockEvent>(() => ({
    id: 124,
    district: "강남구",
    incidentType: "교통사고",
    occurredAt: new Date(),
  }));
  const liveSequence = useRef(124);

  const totalReports = hourlyReports.reduce((sum, item) => sum + item.count, 0);
  const maxHourlyReports = Math.max(...hourlyReports.map((item) => item.count));
  const peakHour = hourlyReports.reduce((peak, item) => item.count > peak.count ? item : peak);
  const incidentTypeTotal = incidentTypeCounts.reduce((sum, item) => sum + item.count, 0);
  const sortedRegionalHotspots = useMemo(
    () => [...regionalHotspots].sort((left, right) => right.count - left.count),
    [regionalHotspots],
  );
  const topRegion = sortedRegionalHotspots[0];
  const incidentTypes = useMemo(
    () => incidentTypeCounts.map((item) => ({
      ...item,
      ratio: Math.round((item.count / incidentTypeTotal) * 100),
    })),
    [incidentTypeCounts, incidentTypeTotal],
  );

  const donutBackground = useMemo(() => {
    let start = 0;
    const segments = incidentTypeCounts.map((item) => {
      const ratio = (item.count / incidentTypeTotal) * 100;
      const end = start + ratio;
      const segment = `${item.color} ${start}% ${end}%`;
      start = end;
      return segment;
    });
    return `conic-gradient(${segments.join(", ")})`;
  }, [incidentTypeCounts, incidentTypeTotal]);

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
          window.location.replace("/login?next=%2Fadmin%2Fmonitoring");
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "관리자 인증을 확인하지 못했습니다.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 620px)");
    const handleViewportChange = (event: MediaQueryListEvent) => setIsCompactMap(event.matches);
    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  useEffect(() => {
    const clockInterval = window.setInterval(() => setCurrentTime(new Date()), 1000);
    const mockEventInterval = window.setInterval(() => {
      const districtIndex = pickWeightedIndex(initialRegionalHotspots);
      const typeIndex = pickWeightedIndex(initialIncidentTypes);
      const hourIndex = pickWeightedIndex(initialHourlyReports);
      const occurredAt = new Date();

      liveSequence.current += 1;
      setHourlyReports((current) => current.map((item, index) =>
        index === hourIndex ? { ...item, count: item.count + 1 } : item,
      ));
      setIncidentTypeCounts((current) => current.map((item, index) =>
        index === typeIndex ? { ...item, count: item.count + 1 } : item,
      ));
      setRegionalHotspots((current) => current.map((item, index) =>
        index === districtIndex ? { ...item, count: item.count + 1 } : item,
      ));
      setLiveEvent({
        id: liveSequence.current,
        district: initialRegionalHotspots[districtIndex].name,
        incidentType: initialIncidentTypes[typeIndex].label,
        occurredAt,
      });
    }, 3800);

    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(mockEventInterval);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearCurrentUser();
      window.location.assign("/login");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="admin-shell">
        <div className="agency-empty-page">
          {isLoading ? "관리자 권한을 확인하는 중입니다." : errorMessage ?? "관리자 권한이 필요합니다."}
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
          <a href="/admin">
            <LayoutDashboard size={19} />
            통합 상황판
          </a>
          <a href="/admin#incident-list">
            <FileText size={19} />
            전체 사건
          </a>
          <span className="admin-nav-label second">시스템</span>
          <a href="/admin#agencies">
            <Building2 size={19} />
            대응기관 현황
          </a>
          <a className="is-active" href="/admin/monitoring" aria-current="page">
            <BarChart3 size={19} />
            모니터링
          </a>
        </nav>

        <div className="system-health">
          <div className="health-title"><Activity size={16} /><span>데이터 상태</span></div>
          <div className="health-row"><span><i />관리자 인증</span><strong>정상</strong></div>
          <div className="health-row"><span><i />지표 집계</span><strong>정상</strong></div>
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
              <h1>운영 모니터링</h1>
            </div>
          </div>
          <div className="admin-header-actions">
            <div className="sync-state monitoring-sync-state">
              <span><i />실시간 반영</span>
              <small>{formatLiveTime(currentTime)} 자동 갱신</small>
            </div>
            <button className="icon-button" type="button" aria-label="알림">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
          </div>
        </header>

        <main className="admin-main monitoring-main">
          <section className="admin-intro monitoring-intro">
            <div>
              <div className="admin-eyebrow"><ShieldCheck size={15} /> Operations Analytics</div>
              <h2>사건 접수 모니터링</h2>
              <p>지역·시간대·사건 유형별 접수 흐름을 한눈에 확인하세요.</p>
            </div>
            <div className="monitoring-period"><CalendarDays size={16} />오늘 00:00–현재</div>
          </section>

          <section className="monitoring-summary-grid" aria-label="오늘의 사건 접수 요약">
            <article className="monitoring-summary-card total">
              <span><FileText size={21} /></span>
              <div><small>오늘 누적 접수</small><strong key={totalReports} className="monitoring-live-value">{totalReports}<em>건</em></strong></div>
              <p><TrendingUp size={14} />어제보다 {Math.max(Math.round(((totalReports - 105) / 105) * 100), 0)}% 증가</p>
            </article>
            <article className="monitoring-summary-card peak">
              <span><Clock3 size={21} /></span>
              <div><small>최다 접수 시간</small><strong>{peakHour.label}<em>시</em></strong></div>
              <p>전체 접수의 {Math.round((peakHour.count / totalReports) * 100)}%</p>
            </article>
            <article className="monitoring-summary-card area">
              <span><MapPin size={21} /></span>
              <div><small>최다 접수 지역</small><strong>{topRegion.name}</strong></div>
              <p>{topRegion.count}건 · 전체의 {Math.round((topRegion.count / totalReports) * 100)}%</p>
            </article>
          </section>

          <section className="monitoring-live-feed" aria-label="실시간 사건 접수" aria-live="polite">
            <div className="monitoring-live-event" key={liveEvent.id}>
              <strong>새 사건 접수</strong>
              <span>#{String(liveEvent.id).padStart(4, "0")}</span>
              <em>{liveEvent.incidentType}</em>
              <span><MapPin size={13} />{liveEvent.district}</span>
            </div>
            <time>{formatLiveTime(liveEvent.occurredAt)}</time>
          </section>

          <section className="monitoring-panel-grid">
            <article className="monitoring-card monitoring-map-card">
              <div className="monitoring-card-heading">
                <div>
                  <span className="monitoring-heading-icon"><MapPin size={18} /></span>
                  <div><h3>신고 집중 지역</h3><p>서울 지역별 오늘 사건 접수 분포</p></div>
                </div>
              </div>

              <div className="monitoring-map-layout">
                <div
                  className="monitoring-map"
                  role="region"
                  aria-label={`서울 ${regionalHotspots.length}개 지역 신고 집중 지도. 상위 지역 ${sortedRegionalHotspots.slice(0, 5).map((item) => `${item.name} ${item.count}건`).join(", ")}`}
                >
                  <MapContainer
                    center={[37.566, 126.9784]}
                    className="monitoring-leaflet-map"
                    key={isCompactMap ? "compact-map" : "wide-map"}
                    maxZoom={14}
                    minZoom={10}
                    scrollWheelZoom={false}
                    zoom={isCompactMap ? 10 : 10.5}
                    zoomSnap={0.5}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url={mapTileUrl}
                    />
                    {regionalHotspots.map((hotspot) => {
                      const isLive = hotspot.name === liveEvent.district;
                      const icon = divIcon({
                        className: "monitoring-leaflet-icon",
                        html: `<div class="monitoring-leaflet-marker is-${hotspot.level} ${isLive ? "is-live" : ""}"><span><strong>${hotspot.count}</strong></span><small>${hotspot.name}</small></div>`,
                        iconAnchor: [40, 36],
                        iconSize: [80, 72],
                      });

                      return (
                        <Marker
                          icon={icon}
                          interactive={false}
                          keyboard={false}
                          key={`${hotspot.name}-${isLive ? liveEvent.id : hotspot.count}`}
                          position={[hotspot.latitude, hotspot.longitude]}
                          zIndexOffset={hotspot.count * 10}
                        />
                      );
                    })}
                  </MapContainer>

                  <div className="monitoring-map-legend">
                    <span><i className="legend-low" />1–9건</span>
                    <span><i className="legend-medium" />10–17건</span>
                    <span><i className="legend-high" />18건 이상</span>
                  </div>
                </div>

                <div className="monitoring-region-ranking">
                  <div className="monitoring-ranking-title"><span>접수 상위 지역</span><small>총 {totalReports}건</small></div>
                  <ol>
                    {sortedRegionalHotspots.slice(0, 5).map((hotspot, index) => (
                      <li key={hotspot.name}>
                        <span className="monitoring-rank">{index + 1}</span>
                        <div><strong>{hotspot.name}</strong><small>{hotspot.detail}</small></div>
                        <em>{hotspot.count}<small>건</small></em>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </article>

            <article className="monitoring-card monitoring-time-card">
              <div className="monitoring-card-heading">
                <div>
                  <span className="monitoring-heading-icon"><Clock3 size={18} /></span>
                  <div><h3>시간대별 접수량</h3><p>3시간 단위 접수 추이</p></div>
                </div>
                <span className="monitoring-peak-badge">{peakHour.label}시 집중</span>
              </div>

              <div
                className="monitoring-time-chart"
                role="img"
                aria-label={`시간대별 신고 접수량. ${peakHour.label}시가 ${peakHour.count}건으로 가장 많음`}
              >
                <div className="monitoring-chart-grid" aria-hidden="true"><i /><i /><i /><i /></div>
                {hourlyReports.map((item) => (
                  <div className={`monitoring-time-column ${item.count === maxHourlyReports ? "is-peak" : ""}`} key={item.label}>
                    <div className="monitoring-time-bar-wrap">
                      <strong>{item.count}</strong>
                      <span style={{ height: `${Math.max((item.count / maxHourlyReports) * 100, 12)}%` }} />
                    </div>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="monitoring-card monitoring-type-card">
              <div className="monitoring-card-heading">
                <div>
                  <span className="monitoring-heading-icon"><BarChart3 size={18} /></span>
                  <div><h3>사건 유형 분포</h3><p>오늘 접수된 사건 유형별 비중</p></div>
                </div>
                <span className="monitoring-data-badge">총 {totalReports}건</span>
              </div>

              <div className="monitoring-type-layout">
                <div
                  className="monitoring-donut"
                  style={{ background: donutBackground }}
                  role="img"
                  aria-label={incidentTypes.map((item) => `${item.label} ${item.ratio}%`).join(", ")}
                >
                  <div><strong>{totalReports}</strong><small>전체 사건</small></div>
                </div>
                <ul className="monitoring-type-legend">
                  {incidentTypes.map((item) => (
                    <li key={item.label}>
                      <span><i style={{ background: item.color }} />{item.label}</span>
                      <strong>{item.count}<small>건</small><em>{item.ratio}%</em></strong>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </section>

          <section className="monitoring-insight" aria-label="오늘의 운영 인사이트">
            <span><TrendingUp size={19} /></span>
            <div><strong>오늘의 운영 인사이트</strong><p>18–21시 강남·송파권 교통사고 접수가 집중되고 있습니다.</p></div>
            <small>순찰 및 현장 대응 인력 배치를 미리 점검하세요.</small>
          </section>
        </main>
      </div>
    </div>
  );
}
