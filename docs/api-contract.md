# OneReport API 계약 v1.1

해커톤 MVP의 Frontend–Backend REST 계약입니다. 제품 범위는 [MVP 명세](mvp-spec.md), 데이터 구조는 [ERD](erd.md), 실시간 이벤트는 [SSE 계약](sse-events.md)을 기준으로 합니다.

## 공통

- Base URL: `/api`
- 인증: JWT `HttpOnly` Cookie
- ID: PostgreSQL `BIGSERIAL/BIGINT` 숫자형
- 시간: ISO 8601

목록 API는 `{ "items": [...], "total": 0 }` 형식을 사용하고 기본 정렬은 `createdAt DESC`입니다. MVP에서는 페이지네이션을 적용하지 않습니다.

```text
AgencyType: POLICE | FIRE | KEPCO | ROAD | GAS
AgencyStatus: ASSIGNED → RECEIVED → DISPATCHED → ARRIVED → IN_PROGRESS → COMPLETED
IncidentStatus: OPEN → RESPONDING → RESOLVED → CLOSED
Severity: LOW | MEDIUM | HIGH | CRITICAL
Category: TRAFFIC_ACCIDENT | HUMAN_INJURY | ELECTRIC_DAMAGE |
          FIRE_RISK | ROAD_DAMAGE | GAS_RISK
```

`WATER`, `WATER_DAMAGE`, `OTHER`는 MVP 범위에서 제외합니다.

## Error

```json
{
  "code": "INVALID_STATUS_TRANSITION",
  "message": "ASSIGNED 상태에서는 RECEIVED로만 변경할 수 있습니다."
}
```

| HTTP | 용도 |
| --- | --- |
| `400` | 잘못된 상태 전이 |
| `401` | 인증 필요 |
| `403` | 권한 없음 |
| `404` | 리소스 없음 |
| `409` | 중복 배정 또는 상태 충돌 |
| `422` | 신고 입력 또는 분류 실패 |

## 인증

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
```

로그인 성공 시 서버가 `access_token` HttpOnly Cookie를 설정합니다. JWT를 JSON 응답이나 URL에 넣지 않습니다.

## 신고

### `POST /reports`

`multipart/form-data`로 신고를 생성합니다. 사진은 한 장만 지원합니다.

| 필드 | 필수 |
| --- | --- |
| `description` | 예 |
| `address` | 예 |
| `latitude` | 예 |
| `longitude` | 예 |
| `image` | 아니오 |
| `categories` | 예 (같은 필드 반복으로 복수 전달) |
| `categoryHint` | 아니오 (기존 Frontend 호환용 단일 Category) |

Backend는 한 요청에서 검증, 사용자가 선택한 Category 저장, Incident 생성, 기관 배정까지 처리합니다. MVP에서는 자동 분류를 수행하지 않으며 `severity`를 생략하면 `MEDIUM`을 사용합니다.

```json
{
  "report": {
    "id": 101,
    "description": "차량이 전봇대를 들이받았고 사람이 다쳤으며 불꽃이 납니다.",
    "address": "서울시 강남구 테헤란로 1",
    "imageUrl": "https://bucket.example/reports/101.jpg"
  },
  "incident": {
    "id": 42,
    "status": "OPEN",
    "severity": "CRITICAL",
    "categories": ["TRAFFIC_ACCIDENT", "HUMAN_INJURY", "ELECTRIC_DAMAGE", "FIRE_RISK"],
    "createdAt": "2026-08-20T17:01:00+09:00"
  },
  "agencies": [
    { "agencyType": "POLICE", "status": "ASSIGNED" },
    { "agencyType": "ROAD", "status": "ASSIGNED" },
    { "agencyType": "FIRE", "status": "ASSIGNED" },
    { "agencyType": "KEPCO", "status": "ASSIGNED" }
  ]
}
```

`categories`와 호환용 `categoryHint`가 모두 없으면 저장하지 않고 `422`를 반환합니다.

```json
{
  "code": "CLASSIFICATION_REQUIRED",
  "message": "사고 유형을 선택해 주세요."
}
```

### `GET /reports/me`

현재 시민의 신고 목록을 반환합니다.

```json
{
  "items": [
    {
      "id": 101,
      "description": "차량이 전봇대를 들이받았습니다.",
      "address": "서울시 강남구 테헤란로 1",
      "imageUrl": "https://bucket.example/reports/101.jpg",
      "createdAt": "2026-08-20T17:01:00+09:00",
      "incident": {
        "id": 42,
        "status": "RESPONDING",
        "severity": "CRITICAL",
        "categories": ["TRAFFIC_ACCIDENT", "HUMAN_INJURY"]
      }
    }
  ],
  "total": 1
}
```

## Incident 조회

```text
GET /incidents/{incidentId}
GET /incidents/{incidentId}/timeline
```

Incident 상세 응답에는 신고, Category, Severity, 참여 기관 상태, Timeline을 포함합니다.

`GET /incidents/{incidentId}/timeline`은 공통 목록 형식을 사용합니다.

```json
{
  "items": [
    {
      "id": 15,
      "type": "AGENCY_STATUS_CHANGED",
      "message": "소방 대응 상태가 DISPATCHED(으)로 변경되었습니다.",
      "occurredAt": "2026-08-20T17:04:00+09:00",
      "metadata": {
        "agencyType": "FIRE",
        "previousStatus": "RECEIVED",
        "status": "DISPATCHED"
      }
    }
  ],
  "total": 1
}
```

접근 범위:

- 시민: 자신이 신고한 Incident
- 기관: 자신의 기관이 참여한 Incident
- 관리자: 모든 Incident

## 기관 Dashboard

### `GET /agencies/me/incidents`

현재 기관에 배정된 Incident 목록입니다. 신규 Incident 확인을 위해 Frontend가 3~5초 간격으로 polling합니다.

선택 Query는 `incidentStatus`, `agencyStatus`, `severity`입니다.

```json
{
  "items": [
    {
      "id": 42,
      "incidentStatus": "RESPONDING",
      "agencyStatus": "DISPATCHED",
      "severity": "CRITICAL",
      "categories": ["TRAFFIC_ACCIDENT", "HUMAN_INJURY"],
      "description": "차량이 전봇대를 들이받았습니다.",
      "address": "서울시 강남구 테헤란로 1",
      "assignedAt": "2026-08-20T17:01:00+09:00",
      "updatedAt": "2026-08-20T17:04:00+09:00"
    }
  ],
  "total": 1
}
```

### `PATCH /incidents/{incidentId}/agencies/{agencyType}/status`

기관은 자신의 상태를 정확히 다음 단계로만 변경할 수 있습니다.

```json
{ "status": "RECEIVED" }
```

```text
ASSIGNED → DISPATCHED
= 400 INVALID_STATUS_TRANSITION
```

첫 기관이 `RECEIVED`가 되면 Incident는 `RESPONDING`, 모든 참여 기관이 `COMPLETED`가 되면 `RESOLVED`가 됩니다.

## 추가 기관 요청

### `POST /incidents/{incidentId}/support`

별도 SupportRequest 테이블과 수락 단계 없이 대상 기관을 즉시 `ASSIGNED`로 추가합니다.

```json
{
  "targetAgencyType": "GAS",
  "reason": "현장에서 가스 냄새가 발견되었습니다."
}
```

`requesterAgencyType`은 요청 Body가 아니라 로그인한 기관 정보에서 결정합니다.

```json
{
  "incidentId": 42,
  "requesterAgencyType": "FIRE",
  "targetAgencyType": "GAS",
  "status": "ASSIGNED"
}
```

서버는 `SUPPORT_REQUESTED`와 `AGENCY_ASSIGNED` Timeline 및 SSE 이벤트를 순서대로 생성합니다. 이미 참여한 기관이면 `409`를 반환합니다.

## 관리자

### `GET /incidents`

전체 목록은 3~5초 polling하며 선택 Query는 `incidentStatus`, `severity`입니다.

```json
{
  "items": [
    {
      "id": 42,
      "status": "RESPONDING",
      "severity": "CRITICAL",
      "categories": ["TRAFFIC_ACCIDENT", "HUMAN_INJURY"],
      "report": {
        "description": "차량이 전봇대를 들이받았습니다.",
        "address": "서울시 강남구 테헤란로 1"
      },
      "agencies": [
        { "agencyType": "POLICE", "status": "ARRIVED" },
        { "agencyType": "FIRE", "status": "DISPATCHED" }
      ],
      "createdAt": "2026-08-20T17:01:00+09:00",
      "updatedAt": "2026-08-20T17:04:00+09:00"
    }
  ],
  "total": 1
}
```

```text
PATCH /incidents/{incidentId}/severity
POST  /incidents/{incidentId}/agencies
PATCH /incidents/{incidentId}/close
```

- 수동 추가 기관은 `ASSIGNED`로 시작합니다.
- `RESOLVED` Incident만 `CLOSED`로 변경할 수 있습니다.

## SSE

### `GET /incidents/{incidentId}/events`

Incident의 연결 이후 변경을 `text/event-stream`으로 전달합니다. 초기 상태와 재연결 동기화에는 `GET /incidents/{incidentId}`를 사용합니다.

## 상태 확인

```text
GET /health
```
