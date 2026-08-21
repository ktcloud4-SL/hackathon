import {
  ArrowLeft,
  ArrowRight,
  FileQuestion,
  Home,
  MapPinOff,
  Search,
  ShieldCheck,
} from "lucide-react";
import { CitizenHeader } from "../components/CitizenHeader";
import "./not-found.css";

export function NotFoundPage() {
  const currentPath = window.location.pathname;

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/");
  };

  return (
    <div className="app-shell not-found-shell">
      <CitizenHeader />

      <main className="not-found-main">
        <section className="not-found-card">
          <div className="not-found-visual" aria-hidden="true">
            <span className="not-found-orbit orbit-one" />
            <span className="not-found-orbit orbit-two" />
            <div className="not-found-icon"><MapPinOff size={40} /></div>
            <span className="not-found-code">404</span>
          </div>

          <div className="not-found-copy">
            <span className="not-found-kicker"><FileQuestion size={16} /> PAGE NOT FOUND</span>
            <h1>요청하신 페이지를<br />찾을 수 없어요.</h1>
            <p>주소가 잘못 입력되었거나 페이지가 이동되었을 수 있습니다. 아래 메뉴에서 다시 시작해 주세요.</p>
            <code>{currentPath}</code>

            <div className="not-found-actions">
              <a href="/"><Home size={17} /> 홈으로 가기</a>
              <button type="button" onClick={goBack}><ArrowLeft size={17} /> 이전 페이지</button>
            </div>
          </div>
        </section>

        <section className="not-found-links" aria-label="추천 메뉴">
          <a href="/#report-form">
            <span><ShieldCheck size={19} /></span>
            <div><strong>새 신고 작성</strong><small>위험 상황을 신고해 주세요.</small></div>
            <ArrowRight size={17} />
          </a>
          <a href="/reports/me">
            <span><Search size={19} /></span>
            <div><strong>내 신고 확인</strong><small>대응 중인 상황을 확인하세요.</small></div>
            <ArrowRight size={17} />
          </a>
        </section>
      </main>

      <footer><span>OneReport</span><p>한 번의 신고, 필요한 기관으로 연결</p></footer>
    </div>
  );
}
