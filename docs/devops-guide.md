# OneReport DevOps & 배포 가이드

현재 저장소의 로컬 개발 구성과 AWS 운영 구성을 구분해 설명합니다. 비밀값과 계정 자격 증명은 문서에 기록하지 않고 환경변수 또는 GitHub Actions Secrets로만 전달합니다.

## 1. 현재 운영 구성

- 리전: AWS Seoul (`ap-northeast-2`)
- Canonical URL: [https://jinwook.store](https://jinwook.store)
- API 헬스체크: [https://jinwook.store/api/health](https://jinwook.store/api/health)
- DNS: Route53의 apex/`www` A record → EC2 Elastic IP
- TLS: Let's Encrypt 인증서, Nginx HTTPS/HTTP2
- Compute: EC2 위 Nginx·Frontend·Backend 컨테이너
- DB: Amazon RDS for PostgreSQL 16
- 사진: 비공개 Amazon S3 bucket, EC2 IAM Role, Presigned GET URL

발표 전 확인 기준으로 운영 헬스체크는 `200 {"status":"ok"}`, `scripts/demo-smoke.py`는 `FINAL: PASS`였습니다.

```text
Internet
  → Route53
  → EC2 Elastic IP
  → Nginx :80 (HTTPS redirect) / :443 (TLS, HTTP/2)
      ├─ /             → Frontend :3000
      ├─ /api/*        → Backend :8000
      └─ /api/.../events → Backend SSE (buffering disabled)
                            ├─ RDS PostgreSQL :5432
                            └─ S3 via EC2 Instance Profile
```

## 2. Nginx와 same-origin 통신

| 경로 | 대상 | 비고 |
| --- | --- | --- |
| `/` | Frontend container `:3000` | SPA 및 정적 자산 |
| `/api/` | Backend container `:8000` | REST API |
| `/health` | Backend `/api/health` | 보조 health path |
| `/api/incidents/{id}/events` | Backend SSE | `proxy_buffering off`, 장시간 read timeout |

Frontend는 절대 API 주소가 아니라 `/api/...` 상대 경로를 사용합니다. 인증 요청은 `credentials: "include"`, SSE는 `EventSource(..., { withCredentials: true })`를 사용하므로 운영에서는 같은 HTTPS origin으로 Cookie와 API/SSE를 전달합니다. `AUTH_COOKIE_SECURE=true`가 운영 배포값입니다.

## 3. 로컬 개발과 AWS 운영의 차이

| 항목 | 로컬 개발 | AWS 운영 |
| --- | --- | --- |
| 접속 | HTTP (`localhost`) | HTTPS (`jinwook.store`) |
| Cookie | `AUTH_COOKIE_SECURE=false` | `AUTH_COOKIE_SECURE=true` |
| DB | Docker Compose PostgreSQL | Amazon RDS PostgreSQL |
| `DATABASE_URL` host | Compose service `postgres` | private RDS endpoint |
| 사진 | S3 설정 시 사용 | S3 + EC2 IAM Role |
| Frontend API | Vite `/api` proxy | Nginx same-origin proxy |
| Nginx | 선택 | Let's Encrypt 인증서가 필요한 운영 구성 |

루트 `.env.example`은 로컬 Docker DB를 가리키는 예시입니다. 실제 비밀번호를 그대로 운영에 사용하지 않습니다.

```bash
cp .env.example .env
docker compose up -d --wait postgres
docker compose up -d backend

cd frontend
npm install
npm run dev
```

현재 `docker-compose.yml`의 Nginx는 `/etc/letsencrypt/live/jinwook.store` 인증서를 마운트하는 운영 설정입니다. 인증서가 없는 로컬 PC에서 Nginx까지 포함한 전체 Compose를 그대로 시작하는 구성은 아닙니다. 로컬 Frontend는 Vite가 `/api`를 기본 `http://127.0.0.1:8000`으로 프록시합니다.

## 4. Backend 시작 순서와 환경변수

Backend container entrypoint는 다음 순서를 사용합니다.

1. `alembic upgrade head`
2. `python seed.py`로 7개 Demo 계정 upsert
3. `uvicorn app.main:app --host 0.0.0.0 --port 8000`

주요 환경변수:

| 이름 | 용도 |
| --- | --- |
| `APP_ENV` | `development`, `test`, `production` |
| `DATABASE_URL` | SQLAlchemy async PostgreSQL URL (`postgresql+asyncpg://...`) |
| `JWT_SECRET` | JWT 서명 비밀값, 최소 32자 |
| `AUTH_COOKIE_SECURE` | 운영 HTTPS에서는 `true` |
| `CORS_ORIGINS` | 허용 origin 목록; 운영 UI는 same-origin 사용 |
| `AWS_REGION` | S3 리전 |
| `STORAGE_BUCKET` | S3 bucket 이름 (`S3_BUCKET_NAME`, `S3_BUCKET`도 Backend alias로 허용) |
| `STORAGE_PREFIX` | S3 object prefix |

DB에는 사진 object key만 저장하며 API 조회 시 Presigned GET URL을 새로 생성합니다. AWS 자격 증명은 소스나 `.env`에 두지 않고 EC2 Instance Profile의 기본 Boto3 자격 증명 체인을 사용합니다.

## 5. RDS 연결 근거

Terraform의 `infra/terraform/rds.tf`는 PostgreSQL 16 RDS를 생성하고, RDS Security Group의 `5432` ingress를 EC2 Web Security Group에서만 허용합니다. RDS는 public access를 사용하지 않습니다.

배포 workflow는 `/opt/onereport/.env`에 GitHub Actions의 `DATABASE_URL` secret을 기록하고, Compose가 같은 값을 Backend container에 주입합니다. 따라서 운영에서 `DATABASE_URL`은 다음 형식의 RDS endpoint를 사용해야 합니다.

```text
postgresql+asyncpg://<DB_USER>:<DB_PASSWORD>@<RDS_ENDPOINT>:5432/<DB_NAME>
```

Terraform output의 `rds_address`/`rds_port`와 DB 생성 시 정한 사용자·DB 이름으로 URL을 구성해 `DATABASE_URL` secret에 등록합니다. URL이나 DB 비밀번호를 저장소에 커밋하지 않습니다. Compose의 `postgres` service와 `.env.example`의 local URL은 로컬 개발용 fallback이며 운영 연결 근거가 아닙니다.

## 6. GitHub Actions 배포

`.github/workflows/deploy.yml`은 `main`의 Backend/Frontend/infra/Compose 변경 또는 수동 실행으로 동작합니다.

1. `backend`, `frontend`, `infra`, Compose와 env example을 bundle로 패키징
2. bundle을 EC2 `/tmp`로 전송
3. `/opt/onereport`에서 기존 배포 source 디렉터리만 정리
4. runtime `.env` 생성
5. `docker compose up -d --build --remove-orphans`
6. Nginx 재시작과 미사용 Docker image 정리
7. Frontend 및 Backend health 확인

cleanup 대상은 `/opt/onereport/backend`, `frontend`, `infra`와 배포 설정 파일입니다. Docker volume 및 runtime `.env`는 삭제 대상에 포함되지 않습니다. 현재 배포는 release 디렉터리를 교체하는 blue/green 방식이 아니라 같은 경로에서 재빌드·재기동하는 구조이므로, rollback은 이전 Git revision을 다시 배포하는 운영 절차가 필요합니다.

필수 운영 Secrets:

| 이름 | 용도 |
| --- | --- |
| `EC2_HOST` | Route53가 가리키는 EC2 Elastic IP |
| `EC2_USER` | SSH 사용자 |
| `EC2_SSH_KEY` | SSH private key |
| `DATABASE_URL` | RDS async PostgreSQL connection URL |
| `JWT_SECRET` | 운영 JWT 서명 비밀값 |
| `S3_BUCKET_NAME` | Terraform이 생성한 report upload bucket |
| `AWS_REGION` | AWS 리전 |

`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`는 Compose의 로컬 PostgreSQL service 설정에 사용됩니다. 운영 Backend의 실제 연결 대상은 `DATABASE_URL`이 결정합니다.

## 7. Terraform과 수동 연결 단계

Terraform은 VPC/subnet/security group, EC2와 Elastic IP, IAM Instance Profile, S3, private RDS, Route53 A record를 정의합니다. GitHub Actions가 이 output을 자동으로 Secrets에 복사하지는 않으므로 최초 provision 또는 변경 후 다음 값을 수동으로 동기화해야 합니다.

- `ec2_public_ip` → `EC2_HOST`
- `s3_bucket_name` → `S3_BUCKET_NAME`
- RDS endpoint와 DB 자격 증명 → `DATABASE_URL`
- Terraform이 생성한 SSH key → `EC2_SSH_KEY`

`infra/terraform/outputs.tf`의 `app_url`과 `api_health_url`은 EIP 기반 초기 HTTP 주소를 출력하지만, 현재 사용자용 canonical endpoint는 Route53와 Let's Encrypt를 거친 `https://jinwook.store`입니다.

## 8. 발표 전 Smoke Test

비밀번호는 명령행 기록에 남기기보다 환경변수로 전달합니다. HTTPS 인증서 검증은 기본적으로 활성화됩니다.

```bash
export ONEREPORT_DEMO_PASSWORD='<demo-password>'
python scripts/demo-smoke.py --base-url https://jinwook.store
```

Windows PowerShell:

```powershell
$env:ONEREPORT_DEMO_PASSWORD = '<demo-password>'
python scripts/demo-smoke.py --base-url https://jinwook.store
```

Smoke Test는 health, 시민 Cookie 인증, 규칙 기반 분석, 복수 Category와 추천 기관, 사진 multipart 업로드, S3 Presigned GET, Report/Incident 생성, Routing 일치, 기관 상태 변경, Timeline, 선택적 지원 기관 배정, 관리자 조회와 Severity 변경을 검증합니다. 실패 시 `FINAL: FAIL`과 non-zero exit code, 성공 시 `FINAL: PASS`를 반환합니다.
