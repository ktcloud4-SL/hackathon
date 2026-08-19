# 기여 가이드

이 저장소는 `main`을 항상 통합 가능한 상태로 유지합니다. 모든 기능 변경은 기능 브랜치와 Pull Request를 통해 반영합니다.

## 브랜치

작업은 최신 `main`에서 기능 단위 브랜치를 생성해 진행합니다.

```text
feat/<기능명>      # 신규 기능
fix/<수정내용>      # 버그 수정
infra/<변경내용>    # Docker, Terraform, Nginx, CI/CD
docs/<문서명>       # 문서 변경
chore/<정리내용>    # 설정 및 의존성 정리
```

예시:

```text
feat/report-routing
fix/ws-reconnect
infra/docker-compose
docs/api-contract
```

## 커밋

커밋 메시지는 아래 형식으로 작성합니다.

```text
<type>(<scope>): <변경 내용>
```

```text
feat(report): 신고 생성 시 Incident 생성
fix(agency): 기관 상태 전이 검증 수정
infra(nginx): WebSocket proxy 설정 추가
docs: API 계약 문서 갱신
```

사용할 `type`은 `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `infra`입니다.

## Pull Request

1. 기능 단위로 Pull Request를 만듭니다.
2. 자동으로 표시되는 PR 템플릿을 작성합니다.
3. 로컬 실행 또는 Docker Compose 실행으로 변경 사항을 확인합니다.
4. API, WebSocket, 환경변수 변경이 있다면 관련 문서를 함께 갱신합니다.
5. 작성자는 검증을 마친 뒤 직접 Squash merge할 수 있습니다.

PR 제목 예시:

```text
[BE] 신고 생성 및 자동 기관 배정
[FE] 시민 Incident 실시간 상황 화면
[OPS] Nginx WebSocket proxy 설정
```

## main 브랜치

- `main`에 직접 push하지 않습니다.
- 모든 변경은 Pull Request를 통해 반영합니다.
- Pull Request는 Squash merge만 사용합니다.
- merge 후 원격 기능 브랜치는 자동 삭제됩니다.
- `docker-compose.yml`, `.env.example`, `infra/`, `.github/workflows/`, API/WebSocket 계약, DB migration 변경은 팀 채팅에 공유합니다.

## 소통

- 15분 이상 막힌 작업은 팀 채팅에 즉시 공유합니다.
- 다른 담당자에게 영향을 주는 API·DB·WebSocket 형식 변경은 구현 전에 공유합니다.
