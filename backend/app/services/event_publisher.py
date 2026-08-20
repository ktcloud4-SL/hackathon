"""Domain-facing Incident event publisher backed by SSE for the MVP."""

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any, Protocol

from app.schemas.event import EventType, SSEEnvelope, SSEMessage, TimelineEventView
from app.services.sse import SSEBroker


EVENT_NAME_BY_TYPE: dict[EventType, str] = {
    EventType.AGENCY_ASSIGNED: "agency-assigned",
    EventType.AGENCY_STATUS_CHANGED: "agency-status-changed",
    EventType.SUPPORT_REQUESTED: "support-requested",
    EventType.SEVERITY_CHANGED: "severity-changed",
    EventType.INCIDENT_RESOLVED: "incident-resolved",
    EventType.INCIDENT_CLOSED: "incident-closed",
}


@dataclass(frozen=True, slots=True)
class IncidentEventPublication:
    timeline_event: TimelineEventView
    data: Mapping[str, Any] | None = None


class IncidentEventPublisher(Protocol):
    async def publish_committed(
        self,
        *,
        incident_id: int,
        publication: IncidentEventPublication,
    ) -> int: ...

    async def publish_committed_many(
        self,
        *,
        incident_id: int,
        publications: Iterable[IncidentEventPublication],
    ) -> int: ...


def build_sse_message(
    incident_id: int,
    publication: IncidentEventPublication,
) -> SSEMessage:
    timeline_event = publication.timeline_event
    event_data = dict(
        publication.data
        if publication.data is not None
        else timeline_event.metadata
    )
    return SSEMessage(
        event=EVENT_NAME_BY_TYPE[timeline_event.type],
        id=timeline_event.id,
        data=SSEEnvelope(
            type=timeline_event.type,
            incident_id=incident_id,
            occurred_at=timeline_event.occurred_at,
            data=event_data,
            timeline_event=timeline_event,
        ),
    )


class SSEIncidentEventPublisher:
    """Publish Timeline events only after their database transaction commits."""

    def __init__(self, broker: SSEBroker) -> None:
        self._broker = broker

    async def publish_committed(
        self,
        *,
        incident_id: int,
        publication: IncidentEventPublication,
    ) -> int:
        return await self._broker.publish(
            incident_id,
            build_sse_message(incident_id, publication),
        )

    async def publish_committed_many(
        self,
        *,
        incident_id: int,
        publications: Iterable[IncidentEventPublication],
    ) -> int:
        delivered = 0
        for publication in publications:
            delivered += await self.publish_committed(
                incident_id=incident_id,
                publication=publication,
            )
        return delivered
