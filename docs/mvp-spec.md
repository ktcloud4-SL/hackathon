# OneReport MVP 명세 v1.1

## 서비스 정의

**한 번의 신고, 하나의 Incident, 여러 기관의 공동대응.**

OneReport는 복합사고를 하나의 Incident로 관리하고 필요한 기관을 자동 배정하여 기관별 대응 상태와 Timeline을 공유하는 Coordination Layer입니다.

MVP는 실제 112·119·전력기관 시스템에 신고하지 않습니다. 모든 기관 화면과 대응 상태는 Mock입니다.

## 사용자

- `CITIZEN`: 신고, 자신의 Incident와 Timeline 조회
- `AGENCY`: 소속 기관 Incident 조회, 상태 변경, 추가 기관 요청
- `ADMIN`: 전체 조회, Severity 변경, 기관 수동 추가, Incident 종료

## Domain

```text
Report = 시민의 원본 신고
Incident = 공동대응 단위
IncidentCategory = 사고·위험 유형
IncidentAgency = 참여 기관과 대응 상태
TimelineEvent = 주요 변경 기록
```

MVP에서는 Report 1건당 Incident 1건을 생성하며 모든 ID는 숫자형 `BIGINT`로 통일합니다.

세부 필드와 FK 제약은 [ERD](erd.md)를 기준으로 합니다.

## Category와 Agency

```text
Category:
TRAFFIC_ACCIDENT | HUMAN_INJURY | ELECTRIC_DAMAGE |
FIRE_RISK | ROAD_DAMAGE | GAS_RISK

Agency:
POLICE | FIRE | KEPCO | ROAD | GAS
```

`WATER`, `WATER_DAMAGE`, `OTHER`는 MVP에서 제외합니다.

## 분류와 Routing

AI가 아니라 키워드 Rule로 복수 Category를 분류합니다. 분류 결과가 없으면 시민이 `categoryHint`를 선택해 다시 요청합니다.

| Category | Agency |
| --- | --- |
| `TRAFFIC_ACCIDENT` | `POLICE`, `ROAD` |
| `HUMAN_INJURY` | `FIRE` |
| `ELECTRIC_DAMAGE` | `KEPCO` |
| `FIRE_RISK` | `FIRE` |
| `ROAD_DAMAGE` | `ROAD` |
| `GAS_RISK` | `GAS` |

이 표가 Routing의 Source of Truth이며 중복 기관은 한 번만 배정합니다.

## 상태

기관 상태는 단계를 건너뛸 수 없습니다.

```text
ASSIGNED → RECEIVED → DISPATCHED → ARRIVED → IN_PROGRESS → COMPLETED
```

```text
Incident 생성                 → OPEN
기관 하나 이상 RECEIVED       → RESPONDING
참여 기관 전부 COMPLETED       → RESOLVED
Admin 종료                    → CLOSED
```

## 추가 기관 요청

MVP에서는 별도 SupportRequest 테이블과 수락·거절 단계를 만들지 않습니다.

```text
POST /api/incidents/{id}/support
→ 요청 기관은 로그인 정보에서 결정
→ 대상 IncidentAgency를 ASSIGNED로 생성
→ Timeline 저장
→ SSE 전파
```

이미 참여한 기관을 요청하면 `409`를 반환합니다.

## 통신 구조

```text
Frontend → Backend 명령
REST API

Backend → Frontend 변경 알림
SSE
```

- 신고 초기 결과: `POST /api/reports` 응답
- Incident 상세 변경: Incident SSE
- 기관·관리자 목록: 3~5초 polling
- SSE 재연결: Incident REST 상세 재조회

SSE 인증은 JWT HttpOnly Cookie를 사용하며 URL에 JWT를 넣지 않습니다.

## MVP 완료 기준

```text
시민 신고
→ Incident 생성·분류·기관 배정
→ Mock 기관 Dashboard 확인
→ 기관 상태 변경
→ SSE 실시간 반영과 Timeline
→ 추가 기관 배정
→ 모든 기관 COMPLETED
→ RESOLVED
→ Admin CLOSED
```
