# WebSocket 이벤트 계약 초안

기관 상태, 기관 자동 배정, 추가 기관 요청, Incident 종료는 DB 저장과 Timeline 기록 후 즉시 WebSocket으로 공유합니다. NATS·Redis·별도 Worker는 사용하지 않습니다.

## 연결

```text
GET /ws/incidents/{incidentId}?token=<jwt>
```

- 시민: 본인이 신고한 Incident만 구독할 수 있습니다.
- 기관: 본인 기관이 참여한 Incident만 구독할 수 있습니다.
- 관리자: 모든 Incident를 구독할 수 있습니다.

브라우저 WebSocket은 `Authorization` 헤더를 직접 넣기 어려우므로 해커톤에서는 JWT를 query string으로 전달합니다.

## 공통 Envelope

```json
{
  "type": "AGENCY_STATUS_CHANGED",
  "incidentId": 42,
  "occurredAt": "2026-08-19T17:04:00+09:00",
  "data": {},
  "timelineEvent": {
    "id": 8,
    "type": "AGENCY_STATUS_CHANGED",
    "message": "119가 출동을 시작했습니다.",
    "occurredAt": "2026-08-19T17:04:00+09:00",
    "metadata": {}
  }
}
```

- `type`: 아래 Event Type 중 하나
- `incidentId`: 변경이 발생한 Incident ID
- `occurredAt`: 서버가 기록한 이벤트 시간
- `data`: 이벤트별 상세 정보
- `timelineEvent`: 시민/관리자 화면 Timeline에 즉시 추가할 항목

## Event Type

| Type | 발생 시점 | `data` 필수 필드 |
| --- | --- | --- |
| `INCIDENT_CREATED` | Report와 Incident 생성 완료 | `status`, `severity`, `categories` |
| `INCIDENT_CLASSIFIED` | 자동 분류·Severity 계산 완료 | `categories`, `severity`, `requiresManualSelection` |
| `AGENCY_ASSIGNED` | 기관이 최초 또는 추가 배정됨 | `agencyType`, `status` |
| `AGENCY_STATUS_CHANGED` | 기관 상태가 변경됨 | `agencyType`, `previousStatus`, `status` |
| `SUPPORT_REQUESTED` | 기관이 추가 지원을 요청함 | `requestAgencyType`, `targetAgencyType`, `reason` |
| `SEVERITY_CHANGED` | 관리자가 Severity를 변경함 | `previousSeverity`, `severity` |
| `INCIDENT_RESOLVED` | 모든 참여 기관이 `COMPLETED`가 됨 | `status` |
| `INCIDENT_CLOSED` | 관리자가 사건을 종료함 | `previousStatus`, `status` |

## 예시

### 기관 자동 배정

```json
{
  "type": "AGENCY_ASSIGNED",
  "incidentId": 42,
  "occurredAt": "2026-08-19T17:01:00+09:00",
  "data": {
    "agencyType": "FIRE",
    "status": "ASSIGNED"
  },
  "timelineEvent": {
    "id": 3,
    "type": "AGENCY_ASSIGNED",
    "message": "119가 대응기관으로 배정되었습니다.",
    "occurredAt": "2026-08-19T17:01:00+09:00",
    "metadata": { "agencyType": "FIRE" }
  }
}
```

### 추가 기관 요청

```json
{
  "type": "SUPPORT_REQUESTED",
  "incidentId": 42,
  "occurredAt": "2026-08-19T17:10:00+09:00",
  "data": {
    "requestAgencyType": "FIRE",
    "targetAgencyType": "GAS",
    "reason": "현장에서 가스 냄새가 발견되었습니다."
  },
  "timelineEvent": {
    "id": 10,
    "type": "SUPPORT_REQUESTED",
    "message": "119가 가스기관 지원을 요청했습니다.",
    "occurredAt": "2026-08-19T17:10:00+09:00",
    "metadata": {
      "requestAgencyType": "FIRE",
      "targetAgencyType": "GAS",
      "reason": "현장에서 가스 냄새가 발견되었습니다."
    }
  }
}
```

`SUPPORT_REQUESTED` 직후에는 대상 기관에 대한 별도 `AGENCY_ASSIGNED` 이벤트가 이어집니다.

## Frontend 처리 원칙

1. 수신한 `timelineEvent`를 화면 Timeline에 즉시 추가합니다.
2. `AGENCY_ASSIGNED`, `AGENCY_STATUS_CHANGED`는 해당 기관 상태를 즉시 갱신합니다.
3. 연결이 끊겼다가 재연결되면 `GET /api/incidents/{incidentId}`를 다시 호출해 서버 상태를 기준으로 동기화합니다.
4. 알 수 없는 `type`은 무시하고 콘솔에만 기록합니다.
