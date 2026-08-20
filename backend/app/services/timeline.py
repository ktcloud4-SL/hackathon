"""Timeline persistence helpers used inside domain transactions."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import TimelineEvent
from app.schemas.event import EventType, TimelineEventView


async def add_timeline_event(
    session: AsyncSession,
    *,
    incident_id: int,
    event_type: EventType,
    message: str,
    metadata: dict[str, Any] | None = None,
    agency_id: int | None = None,
    actor_user_id: int | None = None,
) -> TimelineEvent:
    event = TimelineEvent(
        incident_id=incident_id,
        agency_id=agency_id,
        actor_user_id=actor_user_id,
        event_type=event_type.value,
        message=message,
        event_metadata=metadata or {},
    )
    session.add(event)
    await session.flush()
    return event


def timeline_view(event: TimelineEvent) -> TimelineEventView:
    return TimelineEventView(
        id=event.id,
        type=EventType(event.event_type),
        message=event.message,
        occurred_at=event.created_at,
        metadata=event.event_metadata,
    )
