# OneReport Backend

Python 3.12와 FastAPI를 사용하는 MVP Backend입니다.

## 실행

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
cp .env.example .env
.venv/bin/uvicorn app.main:app --reload
```

테스트는 `./.venv/bin/pytest -q`로 실행합니다.

## 현재 구현 범위

- JWT HttpOnly Cookie 기반 시민 회원가입·로그인·로그아웃·현재 사용자 조회
- Incident 단위 SSE 인증, 권한 확인, heartbeat, broadcast
- 공통 API 오류 응답과 credential CORS
- Application Default Credentials 기반 Google Cloud Storage Adapter
- 선택 기능인 공공데이터 연동의 No-op 및 best-effort 경계

DB 담당 구현은 `UserRepository`와 `IncidentAccessChecker`를 구현해 앱 상태에
연결합니다. 상태 변경 트랜잭션과 Timeline 저장이 끝난 뒤 `SSEBroker.publish()`를
직접 호출하지 않고 `IncidentEventPublisher.publish_committed()`를 호출합니다.
현재 Broker는 해커톤용 단일 Backend 프로세스를 전제로 합니다.

Cloud Storage는 `STORAGE_BUCKET`이 설정된 경우에만 초기화하며 DB에는 반환된
`object_key`만 저장합니다. 버킷 생성과 IAM 권한 부여는 Backend 범위에 포함하지
않습니다.
