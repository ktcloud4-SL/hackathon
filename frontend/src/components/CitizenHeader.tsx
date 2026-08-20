import { Menu } from "lucide-react";

type CitizenNavItem = "report" | "guide" | "my-reports";

interface CitizenHeaderProps {
  active?: CitizenNavItem;
}

export function CitizenHeader({ active }: CitizenHeaderProps) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="OneReport 홈">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
        </span>
        <span>OneReport</span>
      </a>

      <nav className="desktop-nav" aria-label="주요 메뉴">
        <a className={active === "report" ? "active" : ""} href="/#report-form">
          신고하기
        </a>
        <a className={active === "guide" ? "active" : ""} href="/#guide">
          이용안내
        </a>
        <a
          className={active === "my-reports" ? "active" : ""}
          href="/#my-reports"
        >
          내 신고
        </a>
      </nav>

      <div className="header-actions">
        <button className="text-button" type="button">로그인</button>
        <button className="menu-button" type="button" aria-label="메뉴 열기">
          <Menu size={22} />
        </button>
      </div>
    </header>
  );
}
