# API 계약 초안

이 문서는 해커톤 구현을 위한 Frontend–Backend 계약입니다. 구현 중 변경이 필요하면 Frontend와 Backend 담당자가 먼저 합의한 뒤 이 문서를 함께 수정합니다.

## 공통

- Base URL: `/api`
- 인증: 로그인 후 받은 JWT를 `Authorization: Bearer <accessToken>` 헤더로 전달합니다.
- 시간: ISO 8601 형식(`2026-08-19T17:10:00+09:00`)을 사용합니다.
- ID: 숫자형 `id`를 사용합니다.

### 역할

| 역할 | 권한 |
| --- | --- |
| `CITIZEN` | 신고 생성, 본인 Incident 조회 |
| `AGENCY` | 소속 기관 Incident 조회, 상태 변경, 추가 기관 요청 |
| `ADMIN` | Severity 변경, Incident 종료 |

### Enum

```text
AgencyType: POLICE | FIRE | KEPCO | ROAD | GAS

AgencyStatus:
ASSIGNED → RECEIVED → DISPATCHED → ARRIVED → IN_PROGRESS → COMPLETED

IncidentStatus: OPEN | RESPONDING | RESOLVED | CLOSED
Severity: LOW | MEDIUM | HIGH | CRITICAL

IncidentCategory:
TRAFFIC_ACCIDENT | HUMAN_INJURY | ELECTRIC_DAMAGE |
FIRE_RISK | ROAD_DAMAGE | GAS_RISK
```

## 인증

### `POST /auth/register`

시민 계정을 생성합니다.

```json
{
  "email": "citizen@example.com",
  "password": "password1234",
  "name": "홍길동"
}
```

### `POST /auth/login`

```json
{
  "email": "fire@example.com",
  "password": "password1234"
}
```

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": 2,
    "name": "119 상황실",
    "role": "AGENCY",
    "agencyType": "FIRE"
  }
}
```

### `GET /users/me`

현재 로그인 사용자를 반환합니다.

## 신고 및 자동 배정

### `POST /reports`

시민 신고를 생성하고, 검증 → Incident 생성 → 자동 분류 → Severity 계산 → 기관 배정을 한 요청 안에서 처리합니다.

- Content-Type: `multipart/form-data`
- `image`는 해커톤 범위에서 한 장만 지원합니다.

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `description` | 예 | 상황 설명 |
| `address` | 예 | 주소 |
| `latitude` | 예 | 위도 |
| `longitude` | 예 | 경도 |
| `image` | 아니오 | 신고 사진 |
| `categoryHint` | 아니오 | 자동 분류가 부족할 때 시민이 선택한 분류 |

응답 예시:

```json
{
  "report": {
    "id": 101,
    "description": "차량이 전봇대를 들이받았고 사람이 다쳤습니다.",
    "address": "서울시 강남구 테헤란로 1",
    "imageUrl": "https://bucket.example/reports/101.jpg"
  },
  "incident": {
    "id": 42,
    "status": "OPEN",
    "severity": "CRITICAL",
    "categories": ["TRAFFIC_ACCIDENT", "HUMAN_INJURY", "ELECTRIC_DAMAGE"],
    "createdAt": "2026-08-19T17:01:00+09:00"
  },
  "classification": {
    "requiresManualSelection": false
  },
  "agencies": [
    { "agencyType": "POLICE", "status": "ASSIGNED" },
    { "agencyType": "FIRE", "status": "ASSIGNED" },
    { "agencyType": "KEPCO", "status": "ASSIGNED" },
    { "agencyType": "ROAD", "status": "ASSIGNED" }
  ]
}
```

자동 분류 결과가 하나도 없고 `categoryHint`도 없으면 Backend는 Report와 Incident를 저장하지 않고 `422`로 응답합니다.

```json
{
  "requiresManualSelection": true,
  "allowedCategories": ["TRAFFIC_ACCIDENT", "HUMAN_INJURY", "ELECTRIC_DAMAGE", "FIRE_RISK", "ROAD_DAMAGE", "GAS_RISK"]
}
```

Frontend는 시민에게 `categoryHint` 선택 UI를 보여준 뒤 같은 신고를 다시 요청합니다.

## Incident 조회

### `GET /incidents/{incidentId}`

시민, 관련 기관, 관리자가 사건 상세와 Timeline을 조회합니다.

```json
{
  "id": 42,
  "status": "RESPONDING",
  "severity": "CRITICAL",
  "categories": ["TRAFFIC_ACCIDENT", "HUMAN_INJURY"],
  "report": {
    "description": "차량이 전봇대를 들이받았습니다.",
    "address": "서울시 강남구 테헤란로 1",
    "latitude": 37.4981,
    "longitude": 127.0276,
    "imageUrl": "https://bucket.example/reports/101.jpg"
  },
  "agencies": [
    { "agencyType": "POLICE", "status": "ASSIGNED" },
    { "agencyType": "FIRE", "status": "DISPATCHED" }
  ],
  "timeline": [
    {
      "id": 1,
      "type": "REPORT_SUBMITTED",
      "message": "신고가 접수되었습니다.",
      "occurredAt": "2026-08-19T17:01:00+09:00",
      "metadata": {}
    }
  ]
}
```

## 기관 Dashboard 및 상태 변경

### `GET /agencies/me/incidents`

현재 로그인한 기관에 배정된 Incident 목록을 반환합니다.

선택 Query: `status=ASSIGNED`

```json
[
  {
    "id": 42,
    "description": "차량이 전봇대를 들이받았습니다.",
    "severity": "CRITICAL",
    "agencyStatus": "ASSIGNED",
    "createdAt": "2026-08-19T17:01:00+09:00"
  }
]
```

### `PATCH /incidents/{incidentId}/agencies/{agencyType}/status`

소속 기관만 자신의 상태를 다음 단계로 변경할 수 있습니다.

```json
{
  "status": "RECEIVED"
}
```

응답:

```json
{
  "incidentId": 42,
  "agencyType": "FIRE",
  "previousStatus": "ASSIGNED",
  "status": "RECEIVED",
  "incidentStatus": "RESPONDING",
  "changedAt": "2026-08-19T17:02:00+09:00"
}
```

유효하지 않은 상태 전이는 `400`, 권한 없는 기관은 `403`으로 응답합니다. 마지막 기관이 `COMPLETED`가 되면 Incident는 자동으로 `RESOLVED`가 됩니다.

## 추가 기관 요청

### `POST /incidents/{incidentId}/support`

기관이 현장 대응 중 추가 기관을 요청합니다. 별도 `SupportRequest` 테이블은 만들지 않고 TimelineEvent를 남긴 뒤 `IncidentAgency`를 `ASSIGNED` 상태로 생성합니다.

```json
{
  "targetAgencyType": "GAS",
  "reason": "현장에서 가스 냄새가 발견되었습니다."
}
```

```json
{
  "incidentId": 42,
  "requestAgencyType": "FIRE",
  "targetAgencyType": "GAS",
  "status": "ASSIGNED",
  "requestedAt": "2026-08-19T17:10:00+09:00"
}
```

## 관리자 작업

### `PATCH /incidents/{incidentId}/severity`

```json
{ "severity": "HIGH" }
```

### `POST /incidents/{incidentId}/close`

`RESOLVED` Incident만 `CLOSED`로 변경합니다.

```json
{ "status": "CLOSED" }
```

## 상태 확인

### `GET /health`

```json
{ "status": "ok" }
```
