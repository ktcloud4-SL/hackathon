from datetime import datetime, timedelta, timezone

import pytest

from app.schemas.event import EventType, TimelineEventView
from app.services.event_publisher import (
    EVENT_NAME_BY_TYPE,
    IncidentEventPublication,
    SSEIncidentEventPublisher,
    build_sse_message,
)
from app.services.sse import SSEBroker


def _timeline_event(
    event_id: int,
    event_type: EventType,
    *,
    offset_seconds: int = 0,
) -> TimelineEventView:
    return TimelineEventView(
        id=event_id,
        type=event_type,
        message=event_type.value,
        occurred_at=datetime(2026, 8, 20, tzinfo=timezone.utc)
        + timedelta(seconds=offset_seconds),
        metadata={"eventId": event_id},
    )


@pytest.mark.parametrize("event_type", list(EventType))
def test_every_event_type_has_a_wire_event_name(event_type: EventType) -> None:
    timeline_event = _timeline_event(1, event_type)

    message = build_sse_message(
        42,
        IncidentEventPublication(timeline_event=timeline_event),
    )

    assert message.event == EVENT_NAME_BY_TYPE[event_type]
    assert message.id == timeline_event.id
    assert message.data.incident_id == 42
    assert message.data.data == timeline_event.metadata


@pytest.mark.asyncio
async def test_support_and_assignment_events_keep_publication_order() -> None:
    broker = SSEBroker()
    publisher = SSEIncidentEventPublisher(broker)
    support_requested = IncidentEventPublication(
        timeline_event=_timeline_event(20, EventType.SUPPORT_REQUESTED),
        data={
            "requesterAgencyType": "FIRE",
            "targetAgencyType": "GAS",
            "reason": "현장에서 가스 냄새가 발견되었습니다.",
        },
    )
    agency_assigned = IncidentEventPublication(
        timeline_event=_timeline_event(
            21,
            EventType.AGENCY_ASSIGNED,
            offset_seconds=1,
        ),
        data={"agencyType": "GAS", "status": "ASSIGNED"},
    )

    async with broker.subscribe(42) as queue:
        delivered = await publisher.publish_committed_many(
            incident_id=42,
            publications=[support_requested, agency_assigned],
        )
        first = await queue.get()
        second = await queue.get()

    assert delivered == 2
    assert first.data.type is EventType.SUPPORT_REQUESTED
    assert second.data.type is EventType.AGENCY_ASSIGNED
    assert first.id < second.id
