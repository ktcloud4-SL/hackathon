from datetime import datetime, timezone

import pytest

from app.schemas.event import (
    EventType,
    SSEEnvelope,
    SSEMessage,
    TimelineEventView,
)
from app.services.sse import SSEBroker, encode_sse


def _message() -> SSEMessage:
    occurred_at = datetime(2026, 8, 20, 17, 4, tzinfo=timezone.utc)
    timeline_event = TimelineEventView(
        id=15,
        type=EventType.AGENCY_STATUS_CHANGED,
        message="119가 출동을 시작했습니다.",
        occurred_at=occurred_at,
        metadata={"agencyType": "FIRE"},
    )
    envelope = SSEEnvelope(
        type=EventType.AGENCY_STATUS_CHANGED,
        incident_id=42,
        occurred_at=occurred_at,
        data={
            "agencyType": "FIRE",
            "previousStatus": "RECEIVED",
            "status": "DISPATCHED",
            "incidentStatus": "RESPONDING",
        },
        timeline_event=timeline_event,
    )
    return SSEMessage(event="agency-status-changed", id=15, data=envelope)


def test_encode_sse_uses_contract_field_names() -> None:
    encoded = encode_sse(_message())

    assert encoded.startswith("event: agency-status-changed\nid: 15\n")
    assert '"incidentId":42' in encoded
    assert '"timelineEvent"' in encoded


@pytest.mark.asyncio
async def test_publish_targets_only_incident_subscribers() -> None:
    broker = SSEBroker()
    message = _message()

    async with broker.subscribe(42) as queue:
        assert await broker.publish(99, message) == 0
        assert queue.empty()
        assert await broker.publish(42, message) == 1
        assert await queue.get() == message
