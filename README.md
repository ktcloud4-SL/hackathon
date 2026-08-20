# OneReport

**어디에 신고할지 몰라도 상황만 전달하면, 필요한 공공기관·공기업을 하나의 Incident로 연결하는 통합 신고·공동대응 플랫폼입니다.**

OneReport는 시민의 신고 내용을 규칙 기반으로 분석해 사고 유형과 긴급도를 추천하고, 사용자가 확인한 유형을 기존 Routing 규칙에 전달해 대응 기관을 자동 배정합니다. 시민·기관·관리자는 같은 Incident와 Timeline을 보며 대응 상태를 공유합니다.

현재 PoC는 경찰(112), 소방·구급(119), 한국전력, 도로관리, 가스안전 5개 대표 기관의 공동대응 시나리오를 구현합니다. 실제 112·119 또는 기관 내부 시스템에 신고를 전송하는 단계는 아니며, 장기적으로 지자체·상하수도·환경·생활민원 등까지 연결하는 공공 신고 Single Entry Point를 지향합니다.

## 현재 구현 범위

- 시민 회원가입·로그인, 신고 작성, 내 신고와 Incident 상세 조회
- `POST /api/analyze-report` 규칙 기반 자동분석
  - 복수 Category, Severity, 추천 기관, 요약과 근거 반환
  - 시민이 추천 Category를 확인·수정하며, 미분류·실패 시 직접 선택
- Report 생성과 Incident 1:1 연결, Category 기반 기관 자동 배정
- 경찰·소방·한국전력·도로관리·가스안전 기관 Dashboard와 관리자 Dashboard
- 기관 상태 전이, 추가 기관 요청, 관리자 긴급도 변경·Incident 종료
- REST 초기 조회, Timeline 기록, SSE 실시간 변경 알림
- 신고 사진 Amazon S3 저장과 Presigned URL 기반 상세 화면 표시
- PostgreSQL/Alembic, 7개 Demo 계정 자동 Seed
- 배포 직후 핵심 흐름을 검증하는 Demo Smoke Test

자동분석은 현재 설명 가능한 Keyword/phrase Rule 방식입니다. 외부 LLM이나 실제 공공기관 연계는 구현 범위에 포함하지 않습니다.

## 기술 구성

| 영역 | 구성 |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Backend | FastAPI, Pydantic, SQLAlchemy Async |
| DB | PostgreSQL 16, Alembic; AWS 운영은 Amazon RDS |
| 인증·실시간 | JWT HttpOnly Cookie, SSE |
| 이미지 | Amazon S3, Presigned GET URL |
| 실행 | Docker, Docker Compose, Nginx |
| AWS | EC2, RDS, S3, IAM, Route53, Elastic IP |
| 배포·검증 | GitHub Actions, Terraform, Let's Encrypt HTTPS/HTTP2 |

## 통신 구조

- Frontend → Backend 명령: same-origin REST API (`/api/...`)
- Backend → Frontend Incident 변경 알림: SSE
- 신고 직후 초기 상태: `POST /api/reports` 응답
- 기관·관리자 Incident 목록: polling
- SSE 재연결: Incident REST 상세 재조회
- 인증: 운영 HTTPS에서 `Secure`·`HttpOnly` Cookie

## 로컬 실행

로컬 개발에서는 루트 `.env.example`의 Docker PostgreSQL 예시와 `AUTH_COOKIE_SECURE=false`를 사용합니다. Frontend 개발 서버는 `/api`를 기본적으로 `http://127.0.0.1:8000`에 프록시합니다.

```bash
cp .env.example .env
docker compose up -d --wait postgres
docker compose up -d backend

cd frontend
npm install
npm run dev
```

현재 루트 Nginx 설정은 `jinwook.store`의 Let's Encrypt 인증서를 사용하는 AWS 운영 구성입니다. 인증서가 없는 로컬 환경에서 전체 `docker compose up`을 실행하려면 별도 로컬 Nginx 설정이 필요합니다. 자세한 구분은 [DevOps 가이드](docs/devops-guide.md)를 참고하세요.

## AWS 배포 구조

```text
Client
  → Route53 (jinwook.store)
  → EC2 Elastic IP
  → Nginx :80 redirect / :443 HTTPS·HTTP2
      ├─ /        → Frontend container :3000
      └─ /api/*   → Backend container :8000
                       ├─ Amazon RDS PostgreSQL :5432
                       └─ Amazon S3 (EC2 IAM Role)
```

Backend·Frontend·infra·Compose의 `main` 변경은 GitHub Actions가 배포 번들을 EC2의 `/opt/onereport`에 전송한 뒤 컨테이너를 재빌드·재기동합니다. 운영 DB는 GitHub Actions의 `DATABASE_URL` secret으로 RDS에 연결되고, Backend entrypoint가 Alembic migration과 Demo Seed를 실행합니다.

발표 전 검증 기준으로 `https://jinwook.store/api/health`는 `200 {"status":"ok"}`를 반환했고, 자동분석·S3 이미지·Routing·기관 상태·Timeline·관리자 조회를 포함한 아래 Smoke Test는 `FINAL: PASS`를 확인했습니다.

```bash
# ONEREPORT_DEMO_PASSWORD는 로컬 환경변수 또는 --password로 전달합니다.
python scripts/demo-smoke.py --base-url https://jinwook.store
```

## 저장소 구조

- `frontend/` — 시민·기관·관리자 UI와 실제 API client
- `backend/` — API, DB, 분석, Routing, Timeline, SSE, S3 adapter
- `infra/` — Terraform과 Nginx 운영 설정
- `docs/` — MVP, API, ERD, SSE, 배포 계약
- `scripts/` — Demo Smoke/Reset, 원격 로그 확인

## 문서

- [Contributing](CONTRIBUTING.md)
- [MVP Specification](docs/mvp-spec.md)
- [ERD](docs/erd.md)
- [API Contract](docs/api-contract.md)
- [SSE Events](docs/sse-events.md)
- [DevOps Guide](docs/devops-guide.md)
