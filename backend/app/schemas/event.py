"""Timeline and SSE event schemas."""

from datetime import datetime
from enum import Enum
from typing import Any

from app.schemas import ApiModel


class EventType(str, Enum):
    REPORT_CREATED = "REPORT_CREATED"
    INCIDENT_CREATED = "INCIDENT_CREATED"
    INCIDENT_CLASSIFIED = "INCIDENT_CLASSIFIED"
    AGENCY_ASSIGNED = "AGENCY_ASSIGNED"
    AGENCY_STATUS_CHANGED = "AGENCY_STATUS_CHANGED"
    SUPPORT_REQUESTED = "SUPPORT_REQUESTED"
    SEVERITY_CHANGED = "SEVERITY_CHANGED"
    INCIDENT_RESOLVED = "INCIDENT_RESOLVED"
    INCIDENT_CLOSED = "INCIDENT_CLOSED"


class TimelineEventView(ApiModel):
    id: int
    type: EventType
    message: str
    occurred_at: datetime
    metadata: dict[str, Any]


class TimelineEventList(ApiModel):
    items: list[TimelineEventView]
    total: int


class SSEEnvelope(ApiModel):
    type: EventType
    incident_id: int
    occurred_at: datetime
    data: dict[str, Any]
    timeline_event: TimelineEventView


class SSEMessage(ApiModel):
    event: str
    id: int
    data: SSEEnvelope
