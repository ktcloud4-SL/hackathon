# OneReport Backend

Python 3.12와 FastAPI를 사용하는 MVP Backend입니다.

## 실행

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
cp .env.example .env
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

테스트는 `./.venv/bin/pytest -q`로 실행합니다.

## 현재 구현 범위

- JWT HttpOnly Cookie 기반 시민 회원가입·로그인·로그아웃·현재 사용자 조회
- Incident 단위 SSE 인증, 권한 확인, heartbeat, broadcast
- 공통 API 오류 응답과 credential CORS
- Application Default Credentials 기반 Google Cloud Storage Adapter
- 선택 기능인 공공데이터 연동의 No-op 및 best-effort 경계
- PostgreSQL/SQLAlchemy 기반 User, Agency, Report, Incident, IncidentAgency, TimelineEvent
- 사용자 선택 Category JSON 저장과 기관 Routing, 기관 상태 전이, 지원 요청, 관리자 종료
- 상태 변경과 Timeline의 단일 transaction 및 commit 이후 SSE publish

DB adapter는 기존 인증의 `UserRepository`와 SSE 접근 제어의
`IncidentAccessChecker` 인터페이스를 구현합니다. 현재 Broker는 해커톤용 단일
Backend 프로세스를 전제로 합니다.

Cloud Storage는 `STORAGE_BUCKET`이 설정된 경우에만 초기화하며 DB에는 반환된
`object_key`만 저장합니다. 버킷 생성과 IAM 권한 부여는 Backend 범위에 포함하지
않습니다.
