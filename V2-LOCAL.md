# OneReport V2 local runtime

이 실행 경로는 `experiment/public-report-v2-full`의 로컬 검증 전용입니다. 운영 `jinwook.store`, 운영 RDS/S3, 기존 `docker-compose.yml`, 배포 workflow와 연결되지 않습니다.

## 사전 준비

- Windows PowerShell
- Python 3.12+
- Node.js/npm
- Docker Desktop

## 시작과 종료

```powershell
powershell -ExecutionPolicy Bypass -File scripts/v2-local-up.ps1
```

첫 실행은 `backend/.venv`와 `frontend/node_modules`가 없으면 dependency를 설치합니다. 이후 아래 주소를 사용합니다.

- V2 Frontend: `http://localhost:5174`
- V2 Backend health: `http://127.0.0.1:8001/api/health`
- V2 MinIO console: `http://127.0.0.1:59001`
- 원본 V1 운영본: `https://jinwook.store`

V2 화면 오른쪽 아래의 `V1 운영본 열기` 링크는 원본 V1을 새 탭으로 엽니다.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/v2-local-down.ps1
```

기본 종료는 V2 전용 PostgreSQL/MinIO volume을 보존합니다. 로컬 V2 데이터까지 초기화할 때만 명시적으로 `-RemoveData`를 사용합니다.

## Demo 계정

공통 비밀번호는 `Password123!`입니다.

- 시민: `citizen@onereport.com`
- 관할 지자체: `localgov@onereport.com`
- 도로관리: `road@onereport.com`
- 관리자: `admin@onereport.com`

## V2 확인 시나리오

1. 시민 로그인 후 `도로에 동물 사체가 있습니다.`를 신고합니다.
2. 분석 결과가 `생활·공공신고`, `동물 사체`, `관할 지자체`인지 확인합니다.
3. 사진을 첨부했다면 신고 완료·시민 상세에서 이미지가 표시되는지 확인합니다.
4. 관할 지자체 계정으로 로그인해 같은 Incident를 열고 상태를 변경합니다.
5. 시민 상세 Timeline에 상태 변경이 반영되는지 확인합니다.
6. 포트홀 신고가 `생활·공공신고`와 `도로관리`로 연결되는지 확인합니다.
7. 기존 복합 교통사고가 `긴급·복합대응`과 기존 기관 조합으로 유지되는지 확인합니다.

MinIO object와 PostgreSQL 데이터는 이름이 `onereport-v2-*`인 로컬 전용 container/volume에만 저장됩니다.
