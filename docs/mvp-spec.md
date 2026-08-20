# OneReport MVP 명세 v1.2

## 서비스 정의

**한 번의 신고를 상황에 필요한 기관으로 연결합니다.**

OneReport는 시민이 담당 기관을 직접 찾지 않아도 신고 내용을 분석하고, 복합 상황을 하나의 Incident로 묶어 필요한 기관의 대응 상태와 Timeline을 공유하는 Coordination Layer입니다.

현재 PoC는 경찰(112), 소방·구급(119), 한국전력, 도로관리, 가스안전 5개 대표 기관을 대상으로 시민·기관·관리자 화면과 Backend/DB 흐름을 실제로 연결합니다. 다만 실제 112·119 및 각 기관의 운영 시스템으로 신고를 전달하거나 출동을 지시하지는 않습니다. 화면의 기관 대응은 OneReport 내부 Demo 데이터와 사용자의 상태 변경으로 시연합니다.

장기적으로는 지자체, 상하수도, 환경, 교통시설, 복지, 생활민원과 기타 공공기관·공기업까지 연결하는 공공 신고 Single Entry Point를 지향합니다. 이 확장 대상은 현재 연동 기관을 의미하지 않습니다.

## 사용자

- `CITIZEN`: 회원가입·로그인, 신고, 자신의 Incident·사진·Timeline 조회
- `AGENCY`: 소속 기관 Incident 조회, 사진 확인, 상태 변경, 추가 기관 요청
- `ADMIN`: 전체 조회, 사진 확인, Severity 변경, 기관 수동 추가, Incident 종료

각 Dashboard는 실제 FastAPI와 PostgreSQL 데이터를 사용합니다. Mock인 것은 기관 Dashboard 자체가 아니라 외부 공공기관 시스템과 실제 출동 연계입니다.

## Domain

```text
Report = 시민의 원본 신고와 선택 사진
Incident = 공동대응 단위이며 확정 Category를 JSON 배열로 저장
IncidentAgency = 참여 기관과 대응 상태
TimelineEvent = 주요 변경 기록
```

PoC에서는 Report 1건당 Incident 1건을 생성하며 모든 ID는 숫자형 `BIGINT`로 통일합니다. 사진은 한 장을 S3에 저장하고 DB에는 object key만 보관합니다. 조회 응답은 짧은 수명의 Presigned URL을 제공합니다.

세부 필드와 FK 제약은 [ERD](erd.md)를 기준으로 합니다.

## Category와 Agency

```text
Category:
TRAFFIC_ACCIDENT | HUMAN_INJURY | ELECTRIC_DAMAGE |
FIRE_RISK | ROAD_DAMAGE | GAS_RISK

Agency:
POLICE | FIRE | KEPCO | ROAD | GAS
```

`WATER`, `WATER_DAMAGE`, `OTHER`는 현재 PoC에서 제외합니다. 향후 기관 확장은 enum 추가만으로 끝내지 않고 기관·관할·역량과 Routing 규칙을 DB 기반으로 관리하는 방향을 검토합니다.

## 자동분석과 Routing

신고 생성 전에 `POST /api/analyze-report`가 설명과 주소를 규칙 기반으로 분석합니다.

- 복수 Category와 Severity 추천
- 기존 Routing 규칙을 재사용한 추천 기관
- 상황 요약, 분석 근거, confidence, 사용자 확인 필요 여부 반환
- 시민 UI에서 요약·긴급도·추천 기관·핵심 근거와 Category 표시
- 시민이 Category를 확인·수정한 뒤 `POST /api/reports`로 확정값 제출
- 미분류 또는 분석 요청 실패 시 Category 직접 선택으로 fallback

현재 구현은 외부 LLM이 아닌 설명 가능한 Keyword/phrase Rule입니다. 향후 LLM 또는 고도화된 분류기를 도입하더라도 추천 결과를 사용자가 확인하고, 실패 시 수동 선택이 가능한 현재 경계를 유지합니다.

| Category | Agency |
| --- | --- |
| `TRAFFIC_ACCIDENT` | `POLICE`, `ROAD` |
| `HUMAN_INJURY` | `FIRE` |
| `ELECTRIC_DAMAGE` | `KEPCO` |
| `FIRE_RISK` | `FIRE` |
| `ROAD_DAMAGE` | `ROAD` |
| `GAS_RISK` | `GAS` |

이 표가 현재 Routing의 Source of Truth이며 중복 기관은 한 번만 배정합니다.

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

PoC에서는 별도 SupportRequest 테이블과 수락·거절 단계를 만들지 않습니다.

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
Frontend → Backend 명령: REST API
Backend → Frontend 변경 알림: SSE
```

- 신고 초기 결과: `POST /api/reports` 응답
- Incident 상세 변경: Incident SSE
- 기관·관리자 목록: polling
- SSE 재연결: Incident REST 상세 재조회
- SSE 인증: JWT HttpOnly Cookie; URL에 JWT를 넣지 않음

## PoC 완료 흐름

```text
시민 신고 작성·사진 선택
→ 규칙 기반 분석과 사용자 Category 확인
→ Report·Incident 생성 및 기관 자동 배정
→ 실제 API 기반 시민·기관·관리자 화면 확인
→ 기관 상태 변경
→ SSE 실시간 반영과 Timeline
→ 추가 기관 배정
→ 모든 기관 COMPLETED
→ RESOLVED
→ Admin CLOSED
```

이 흐름은 OneReport 내부 서비스와 Demo 계정으로 검증합니다. 실제 공공기관 접수번호, 출동 위치·ETA, CCTV·IoT·공공데이터 연계는 향후 범위입니다.
