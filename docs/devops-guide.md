# OneReport DevOps & 배포 가이드

본 문서는 백엔드(BE) 및 프론트엔드(FE) 개발팀이 AWS 인프라 및 CI/CD 환경과 연동하기 위한 표준 가이드입니다.

---

## 1. 인프라 개요 및 접속 정보

- **배포 리전**: AWS Seoul (`ap-northeast-2`)
- **고정 공인 IP (Elastic IP)**: `13.125.52.10`
- **웹 서비스 URL**: [http://13.125.52.10](http://13.125.52.10)
- **API 헬스체크**: [http://13.125.52.10/api/health](http://13.125.52.10/api/health)
- **S3 사진 업로드 버킷**: `onereport-uploads-788246d2`

---

## 2. 포트 및 라우팅 규격 (Nginx Reverse Proxy)

Nginx가 80번 포트에서 요청을 수신하여 내부 컨테이너로 라우팅합니다.

| 경로 (Path) | 대상 서비스 | 포트 | 비고 |
| :--- | :--- | :--- | :--- |
| `/` | Frontend Container | `3000` | 정적 자산 / SPA 웹앱 |
| `/api/` | Backend Container | `8000` | REST API |
| `/health` | Backend Container | `8000` | 헬스체크 |
| `/api/incidents/*/events` | Backend Container | `8000` | **SSE 스트리밍 (`proxy_buffering off`)** |
| (내부) | PostgreSQL | `5432` | DB 컨테이너 |

---

## 3. 백엔드(BE) 팀 준수 사항

1. **포트 및 엔트리포인트**:
   - `backend/Dockerfile`에서 컨테이너 내부 포트를 **`8000`**으로 노출해야 합니다.
   - 예: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
2. **환경변수 (`.env`)**:
   - `DATABASE_URL`: `postgresql+asyncpg://postgres:postgres@postgres:5432/onereport`
   - `JWT_SECRET`: JWT 서명용 비밀키 (최소 32자 이상 필수)
   - `AUTH_COOKIE_SECURE`: `false` (HTTP 환경 테스트 시)
   - `S3_BUCKET_NAME`: `onereport-uploads-788246d2`
   - `AWS_REGION`: `ap-northeast-2`
3. **AWS S3 연동 (신고 사진 업로드)**:
   - EC2 인스턴스에 S3 읽기/쓰기 권한이 포함된 **IAM Role(`onereport-ec2-role`)**이 연결되어 있습니다.
   - 백엔드 코드(Boto3 / AWS SDK)에서 Access Key를 하드코딩할 필요 없이 기본 자격 증명 체인(IAM Instance Profile)으로 S3 업로드가 즉시 동작합니다.
4. **SSE 스트리밍 헤더**:
   - SSE 응답 시 다음 헤더를 포함해야 원활한 스트리밍이 보장됩니다.
     - `Content-Type: text/event-stream`
     - `Cache-Control: no-cache`
     - `X-Accel-Buffering: no`

---

## 4. 프론트엔드(FE) 팀 준수 사항

1. **포트 및 빌드**:
   - `frontend/Dockerfile`에서 컨테이너 내부 포트를 **`3000`**으로 노출해야 합니다.
2. **API 호출 Base URL**:
   - Nginx가 동일 도메인에서 `/api`를 백엔드로 프록시하므로, 프론트엔드에서는 절대 URL 대신 **상대 경로(`/api/...`)**로 호출하면 CORS 문제 없이 바로 통신됩니다.
3. **SSE 연결**:
   - `new EventSource('/api/incidents/' + incidentId + '/events')` 형태로 상대 경로 연결을 사용합니다.

---

## 5. CI/CD 자동 배포 (GitHub Actions)

`main` 브랜치에 코드가 머지되면 `.github/workflows/deploy.yml`이 자동 실행되어 EC2 서버에 컨테이너가 무중단으로 빌드 및 재시작됩니다.

### GitHub Repository Secrets 설정
GitHub 저장소 `Settings` -> `Secrets and variables` -> `Actions`에 아래 시크릿을 등록합니다:

| 시크릿 이름 | 설명 | 권장 값 |
| :--- | :--- | :--- |
| `EC2_HOST` | EC2 Elastic IP | `13.125.52.10` |
| `EC2_USER` | SSH 계정 | `ubuntu` |
| `EC2_SSH_KEY` | SSH 개인키 PEM 내용 | (Terraform이 생성한 PEM 키 내용 전체) |
| `S3_BUCKET_NAME` | S3 버킷명 | `onereport-uploads-788246d2` |
| `AWS_REGION` | AWS 리전 | `ap-northeast-2` |
| `JWT_SECRET` | JWT 비밀키 | (임의의 강력한 문자열) |
