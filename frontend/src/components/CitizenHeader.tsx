import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearCurrentUser,
  getCurrentUser,
  loadCurrentUser,
  logout,
  saveCurrentUser,
} from "../api/auth";
import type { UserPublic } from "../types/auth";

type CitizenNavItem = "report" | "guide" | "my-reports";

interface CitizenHeaderProps {
  active?: CitizenNavItem;
}

export function CitizenHeader({ active }: CitizenHeaderProps) {
  const [user, setUser] = useState<UserPublic | null>(() => loadCurrentUser());

  useEffect(() => {
    if (user) return;

    void getCurrentUser()
      .then((currentUser) => {
        saveCurrentUser(currentUser);
        setUser(currentUser);
      })
      .catch(() => {
        // 비로그인 또는 백엔드 연결 전에는 로그인 링크를 그대로 표시합니다.
      });
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // API 연결 전 데모 로그인도 로컬 세션은 항상 정리합니다.
    } finally {
      clearCurrentUser();
      window.location.assign("/");
    }
  };

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
        <a className={active === "guide" ? "active" : ""} href="/guide">
          이용안내
        </a>
        <a
          className={active === "my-reports" ? "active" : ""}
          href="/reports/me"
        >
          내 신고
        </a>
      </nav>

      <div className="header-actions">
        {user ? (
          <div className="header-user-action">
            <a className="header-user-name" href="/reports/me">{user.name}님</a>
            <button className="logout-button" type="button" onClick={handleLogout}>로그아웃</button>
          </div>
        ) : (
          <a className="text-button" href="/login">로그인</a>
        )}
        <button className="menu-button" type="button" aria-label="메뉴 열기">
          <Menu size={22} />
        </button>
      </div>
    </header>
  );
}
