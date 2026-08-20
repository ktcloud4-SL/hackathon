# OneReport SSE 이벤트 계약 v1.1

Frontend → Backend 명령은 REST, Backend → Frontend Incident 변경 알림은 SSE를 사용합니다.

## 연결

```http
GET /api/incidents/{incidentId}/events
Accept: text/event-stream
```

```http
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

로그인 시 설정된 JWT HttpOnly Cookie로 인증합니다. URL에 JWT를 넣지 않습니다.

- 시민: 자신이 신고한 Incident
- 기관: 자신의 기관이 참여한 Incident
- 관리자: 모든 Incident

## 초기 상태

```text
POST /api/reports
  ↓
초기 Incident 전체 정보 응답
  ↓
SSE 연결
  ↓
이후 변경만 수신
```

`INCIDENT_CREATED`, `INCIDENT_CLASSIFIED`, 초기 `AGENCY_ASSIGNED`는 Timeline에는 저장하지만 신고 직후 SSE로 다시 보내지 않습니다.

연결이 끊겼다가 다시 연결되면 `GET /api/incidents/{incidentId}`를 호출하여 서버 상태와 동기화합니다.

## Event 형식

```text
event: agency-status-changed
id: 15
data: {"type":"AGENCY_STATUS_CHANGED","incidentId":42,"occurredAt":"2026-08-20T17:04:00+09:00","data":{},"timelineEvent":{}}

```

`id`에는 `TimelineEvent.id`를 사용합니다.

## Event Type

| `event` | `data.type` | 발생 시점 |
| --- | --- | --- |
| `agency-assigned` | `AGENCY_ASSIGNED` | 지원 요청 또는 관리자 작업으로 기관이 추가됨 |
| `agency-status-changed` | `AGENCY_STATUS_CHANGED` | 기관 상태가 변경됨 |
| `support-requested` | `SUPPORT_REQUESTED` | 기관이 추가 지원을 요청함 |
| `severity-changed` | `SEVERITY_CHANGED` | 관리자가 Severity를 변경함 |
| `incident-resolved` | `INCIDENT_RESOLVED` | 모든 기관이 `COMPLETED`가 됨 |
| `incident-closed` | `INCIDENT_CLOSED` | 관리자가 Incident를 종료함 |

첫 기관이 `RECEIVED`가 되어 Incident가 `RESPONDING`으로 바뀌면 `AGENCY_STATUS_CHANGED.data.incidentStatus`에 함께 전달합니다.

## 기관 상태 변경 예시

```text
event: agency-status-changed
id: 15
data: {"type":"AGENCY_STATUS_CHANGED","incidentId":42,"occurredAt":"2026-08-20T17:04:00+09:00","data":{"agencyType":"FIRE","previousStatus":"RECEIVED","status":"DISPATCHED","incidentStatus":"RESPONDING"},"timelineEvent":{"id":15,"type":"AGENCY_STATUS_CHANGED","message":"119가 출동을 시작했습니다.","occurredAt":"2026-08-20T17:04:00+09:00","metadata":{}}}

```

## 추가 기관 요청

지원 요청은 즉시 기관 배정으로 이어집니다.

```text
SUPPORT_REQUESTED
→ AGENCY_ASSIGNED
```

`SUPPORT_REQUESTED`의 필드명은 다음으로 통일합니다.

```json
{
  "requesterAgencyType": "FIRE",
  "targetAgencyType": "GAS",
  "reason": "현장에서 가스 냄새가 발견되었습니다."
}
```

## 목록 화면

Incident SSE는 이미 알고 있는 Incident 상세 변경만 전달합니다.

- 기관 목록: `GET /api/agencies/me/incidents` 3~5초 polling
- 관리자 목록: `GET /api/incidents` 3~5초 polling
- Incident 상세: 해당 Incident SSE 연결

## Frontend 처리

1. REST 응답을 초기 상태로 사용합니다.
2. `timelineEvent.id`로 중복 이벤트를 제거합니다.
3. 기관, Incident 상태, Severity와 Timeline을 갱신합니다.
4. 재연결하면 Incident 상세를 다시 조회합니다.
5. 알 수 없는 이벤트는 무시하고 로그만 남깁니다.
