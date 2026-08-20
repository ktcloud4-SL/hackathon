# OneReport MVP ERD

현재 PoC의 최소 데이터 모델입니다. API Enum과 상태 규칙은 [API 계약](api-contract.md)을 따릅니다.

## 관계

```text
Agency 1 ── N User
User 1 ── N Report
Report 1 ── 1 Incident
Incident 1 ── N IncidentAgency N ── 1 Agency
Incident 1 ── N TimelineEvent
```

## 테이블

### `agencies`

```text
id          BIGINT PK
code        VARCHAR UNIQUE NOT NULL
name        VARCHAR NOT NULL
```

기관은 `POLICE`, `FIRE`, `KEPCO`, `ROAD`, `GAS`를 Seed Data로 생성합니다.

### `users`

```text
id            BIGINT PK
agency_id     BIGINT FK agencies.id NULL
email         VARCHAR UNIQUE NOT NULL
password_hash VARCHAR NOT NULL
name          VARCHAR NOT NULL
role          VARCHAR NOT NULL
created_at    TIMESTAMPTZ NOT NULL
CHECK (
  (role = 'AGENCY' AND agency_id IS NOT NULL) OR
  (role IN ('CITIZEN', 'ADMIN') AND agency_id IS NULL)
)
```

`AGENCY` 사용자는 `agency_id`가 필수이고 `CITIZEN`, `ADMIN`은 `NULL`입니다. 사용자에 기관 Code를 중복 저장하지 않습니다.

### `reports`

```text
id                BIGINT PK
reporter_user_id  BIGINT FK users.id NOT NULL
description       TEXT NOT NULL
address           VARCHAR NOT NULL
latitude          DOUBLE PRECISION NOT NULL
longitude         DOUBLE PRECISION NOT NULL
image_object_key  VARCHAR NULL
created_at        TIMESTAMPTZ NOT NULL
```

MVP는 사진 한 장만 지원하므로 별도 Attachment 테이블을 만들지 않습니다.

### `incidents`

```text
id          BIGINT PK
report_id   BIGINT FK reports.id UNIQUE NOT NULL
status      VARCHAR NOT NULL
severity    VARCHAR NOT NULL
created_at  TIMESTAMPTZ NOT NULL
updated_at  TIMESTAMPTZ NOT NULL
categories  JSONB NOT NULL
resolved_at TIMESTAMPTZ NULL
closed_at   TIMESTAMPTZ NULL
```

`report_id`의 UNIQUE 제약으로 Report와 Incident의 1:1 관계를 보장합니다.

Category는 최근 단순화 결정에 따라 별도 테이블 없이 `incidents.categories` JSON 배열로 저장합니다.

### `incident_agencies`

```text
id           BIGINT PK
incident_id  BIGINT FK incidents.id NOT NULL
agency_id    BIGINT FK agencies.id NOT NULL
status       VARCHAR NOT NULL DEFAULT 'ASSIGNED'
assigned_at  TIMESTAMPTZ NOT NULL
updated_at   TIMESTAMPTZ NOT NULL
received_at  TIMESTAMPTZ NULL
dispatched_at TIMESTAMPTZ NULL
arrived_at   TIMESTAMPTZ NULL
in_progress_at TIMESTAMPTZ NULL
completed_at TIMESTAMPTZ NULL
UNIQUE (incident_id, agency_id)
```

동일 Incident에 같은 기관이 두 번 배정되는 것을 DB UNIQUE 제약과 `409` 응답으로 방지합니다.

### `timeline_events`

```text
id             BIGINT PK
incident_id    BIGINT FK incidents.id NOT NULL
actor_user_id  BIGINT FK users.id NULL
agency_id      BIGINT FK agencies.id NULL
type           VARCHAR NOT NULL
message        TEXT NOT NULL
metadata       JSONB NOT NULL DEFAULT '{}'
occurred_at    TIMESTAMPTZ NOT NULL
```

시스템이 생성한 이벤트는 `actor_user_id`가 `NULL`입니다. 특정 기관이 없는 신고 접수·Incident 생성 이벤트는 `agency_id`가 `NULL`입니다. `metadata`는 이벤트별 부가 정보만 저장하고 현재 상태는 `incidents`와 `incident_agencies`를 기준으로 조회합니다.

```json
{
  "agencyType": "FIRE",
  "previousStatus": "RECEIVED",
  "status": "DISPATCHED",
  "incidentStatus": "RESPONDING"
}
```

```json
{
  "requesterAgencyType": "FIRE",
  "targetAgencyType": "GAS",
  "reason": "현장에서 가스 냄새가 발견되었습니다."
}
```

`metadata` 필드명은 API와 동일한 camelCase를 사용합니다.
