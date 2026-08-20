# OneReport

**한 번의 신고, 하나의 Incident, 여러 기관의 공동대응.**

OneReport는 시민의 복합사고 신고를 하나의 Incident로 관리하고, Rule 기반 분류에 따라 필요한 기관을 자동 배정한 뒤 기관별 대응 상태와 Timeline을 공유하는 공동대응 플랫폼입니다.

MVP는 실제 112·119·전력기관 시스템에 신고를 전달하지 않습니다. 경찰, 소방, 전력기관, 도로관리기관, 가스기관은 모두 Mock 기관 화면으로 제공되며, OneReport는 기존 기관 시스템을 대체하지 않는 Coordination Layer를 검증합니다.

## Communication

- Frontend → Backend 명령: REST API
- Backend → Frontend Incident 변경 알림: SSE
- 신고 직후 초기 상태: `POST /api/reports` 응답
- 기관·관리자 Incident 목록: 3~5초 polling
- SSE 재연결: Incident REST 상세 재조회

## Structure

- `frontend/` — 시민·기관·관리자 화면
- `backend/` — API, DB, Routing, Timeline, SSE
- `infra/` — Terraform, Nginx, 배포 설정
- `docs/` — MVP, API, SSE 계약
- `scripts/` — Demo Reset 등 공통 운영 명령

## Docs

- [Contributing](CONTRIBUTING.md)
- [MVP Specification](docs/mvp-spec.md)
- [ERD](docs/erd.md)
- [API Contract](docs/api-contract.md)
- [SSE Events](docs/sse-events.md)
