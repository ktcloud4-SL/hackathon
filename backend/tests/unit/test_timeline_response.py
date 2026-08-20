from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.routers.incidents import get_timeline
from app.schemas.auth import UserRole
from app.schemas.event import EventType, TimelineEventList, TimelineEventView
from app.services.auth import UserAuthRecord


class AllowIncidentAccess:
    async def can_view(self, user: UserAuthRecord, incident_id: int) -> bool:
        return user.id == 1 and incident_id == 42


class IncidentWithTimeline:
    def __init__(self, event: TimelineEventView) -> None:
        self._event = event

    async def get_detail(self, incident_id: int) -> SimpleNamespace:
        assert incident_id == 42
        return SimpleNamespace(timeline=[self._event])


@pytest.mark.asyncio
async def test_timeline_endpoint_uses_common_list_response() -> None:
    event = TimelineEventView(
        id=15,
        type=EventType.AGENCY_STATUS_CHANGED,
        message="소방 대응 상태가 변경되었습니다.",
        occurred_at=datetime(2026, 8, 20, 17, 4, tzinfo=timezone.utc),
        metadata={"agencyType": "FIRE", "status": "DISPATCHED"},
    )
    user = UserAuthRecord(
        id=1,
        email="citizen@example.com",
        password_hash="unused",
        name="시민",
        role=UserRole.CITIZEN,
    )

    response = await get_timeline(
        incident_id=42,
        current_user=user,
        service=IncidentWithTimeline(event),  # type: ignore[arg-type]
        checker=AllowIncidentAccess(),  # type: ignore[arg-type]
    )

    assert isinstance(response, TimelineEventList)
    assert response.items == [event]
    assert response.total == 1
    assert response.model_dump(by_alias=True, mode="json") == {
        "items": [
            {
                "id": 15,
                "type": "AGENCY_STATUS_CHANGED",
                "message": "소방 대응 상태가 변경되었습니다.",
                "occurredAt": "2026-08-20T17:04:00Z",
                "metadata": {"agencyType": "FIRE", "status": "DISPATCHED"},
            }
        ],
        "total": 1,
    }
