import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearCurrentUser,
  getCurrentUser,
  getDefaultPathForUser,
  loadCurrentUser,
  logout,
  saveCurrentUser,
} from "../api/auth";
import { ApiError } from "../api/http";
import type { UserPublic } from "../types/auth";

type CitizenNavItem = "report" | "guide" | "my-reports";

interface CitizenHeaderProps {
  active?: CitizenNavItem;
}

export function CitizenHeader({ active }: CitizenHeaderProps) {
  const [user, setUser] = useState<UserPublic | null>(() => loadCurrentUser());

  useEffect(() => {
    void getCurrentUser()
      .then((currentUser) => {
        saveCurrentUser(currentUser);
        setUser(currentUser);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          clearCurrentUser();
          setUser(null);
        }
      });
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // 서버 응답 여부와 관계없이 브라우저의 사용자 표시는 정리합니다.
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
            <a className="header-user-name" href={getDefaultPathForUser(user)}>{user.name}님</a>
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
