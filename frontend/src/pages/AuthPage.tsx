import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  getDefaultPathForUser,
  login,
  register,
  saveCurrentUser,
} from "../api/auth";
import { ApiError } from "../api/http";
import { CitizenHeader } from "../components/CitizenHeader";
import "./auth-page.css";

function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/reports/me";
}

export function AuthPage() {
  const isRegister = window.location.pathname.startsWith("/register");
  const nextPath = useMemo(getSafeNextPath, []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const switchHref = `${isRegister ? "/login" : "/register"}?next=${encodeURIComponent(nextPath)}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (isRegister && !name.trim()) {
      setErrorMessage("이름을 입력해 주세요.");
      return;
    }

    if (!email.includes("@")) {
      setErrorMessage("올바른 이메일 주소를 입력해 주세요.");
      return;
    }

    if (password.length < (isRegister ? 8 : 1)) {
      setErrorMessage(isRegister ? "비밀번호는 8자 이상이어야 합니다." : "비밀번호를 입력해 주세요.");
      return;
    }

    if (isRegister && password !== passwordConfirm) {
      setErrorMessage("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    if (isRegister && !agreed) {
      setErrorMessage("서비스 이용 및 개인정보 처리 안내에 동의해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      let user;

      if (isRegister) {
        await register({ name: name.trim(), email, password });
        user = await login({ email, password });
      } else {
        user = await login({ email, password });
      }

      saveCurrentUser(user);
      window.location.assign(
        user.role === "CITIZEN" ? nextPath : getDefaultPathForUser(user),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell auth-shell">
      <CitizenHeader />

      <main className="auth-main">
        <section className="auth-story-panel" aria-label="OneReport 서비스 소개">
          <div className="auth-story-content">
            <span className="auth-story-badge"><ShieldCheck size={16} /> 공공신고 통합 연결</span>
            <h1>
              어디에 신고할지 몰라도<br />
              <span>상황에 필요한 기관</span>으로<br />
              연결됩니다.
            </h1>
            <p>상황과 위치를 한 번 전달하고, 필요한 기관의 처리·대응 과정을 한 화면에서 확인하세요.</p>

            <div className="auth-route-visual" aria-hidden="true">
              <div className="auth-citizen-node"><UserRound size={24} /><span>시민 신고</span></div>
              <span className="auth-route-line"><i /><i /><i /></span>
              <div className="auth-agency-nodes">
                <span><ShieldCheck size={17} />경찰</span>
                <span><UsersRound size={17} />소방</span>
                <span><Building2 size={17} />기관</span>
              </div>
            </div>

            <ul className="auth-benefits">
              <li><Check size={15} />한 번의 신고로 복수 기관 자동 배정</li>
              <li><Check size={15} />기관별 처리·대응 상태 실시간 확인</li>
              <li><Check size={15} />나의 신고와 상황 기록 안전하게 보관</li>
            </ul>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-heading">
              <span>{isRegister ? "시민 회원가입" : "다시 만나서 반가워요"}</span>
              <h2>{isRegister ? "OneReport 시작하기" : "로그인"}</h2>
              <p>
                {isRegister
                  ? "가입 후 신고 내역과 대응 상황을 언제든 확인할 수 있어요."
                  : "신고 내역과 실시간 대응 상황을 확인하세요."}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {isRegister && (
                <label>
                  <span>이름</span>
                  <div className="auth-input-wrap">
                    <UserRound size={18} />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      placeholder="홍길동"
                      aria-label="이름"
                    />
                  </div>
                </label>
              )}

              <label>
                <span>이메일</span>
                <div className="auth-input-wrap">
                  <Mail size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="name@example.com"
                    aria-label="이메일"
                  />
                </div>
              </label>

              <label>
                <span>비밀번호</span>
                <div className="auth-input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    placeholder={isRegister ? "8자 이상 입력" : "비밀번호 입력"}
                    aria-label="비밀번호"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              {isRegister && (
                <label>
                  <span>비밀번호 확인</span>
                  <div className="auth-input-wrap">
                    <LockKeyhole size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordConfirm}
                      onChange={(event) => setPasswordConfirm(event.target.value)}
                      autoComplete="new-password"
                      placeholder="비밀번호 다시 입력"
                      aria-label="비밀번호 확인"
                    />
                    {passwordConfirm && password === passwordConfirm && (
                      <CheckCircle2 className="password-match" size={17} />
                    )}
                  </div>
                </label>
              )}

              {isRegister && (
                <label className="auth-check-row">
                  <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                  <span><i><Check size={12} /></i>서비스 이용약관 및 개인정보 처리 안내에 동의합니다.</span>
                </label>
              )}

              {errorMessage && <div className="auth-error" role="alert">{errorMessage}</div>}

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "처리 중..." : isRegister ? "회원가입하고 시작하기" : "로그인"}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="auth-switch">
              {isRegister ? "이미 계정이 있으신가요?" : "OneReport가 처음이신가요?"}
              <a href={switchHref}>{isRegister ? "로그인" : "회원가입"}</a>
            </div>

            <p className="auth-security-note"><ShieldCheck size={14} />로그인 정보는 안전한 HttpOnly Cookie 방식으로 보호됩니다.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
