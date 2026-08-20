import pytest

from app.schemas.auth import UserRole
from app.services.auth import UserAuthRecord
from app.services.incident_access import IncidentAccessService
from tests.fakes import agency_user


class FakeIncidentAccessRepository:
    def __init__(
        self,
        *,
        reporter_user_ids: set[int] | None = None,
        assigned_user_ids: set[int] | None = None,
    ) -> None:
        self.reporter_user_ids = reporter_user_ids or set()
        self.assigned_user_ids = assigned_user_ids or set()

    async def is_reporter(self, *, incident_id: int, user_id: int) -> bool:
        return incident_id == 42 and user_id in self.reporter_user_ids

    async def is_assigned_agency_user(
        self, *, incident_id: int, user_id: int
    ) -> bool:
        return incident_id == 42 and user_id in self.assigned_user_ids


def _user(user_id: int, role: UserRole, *, is_active: bool = True) -> UserAuthRecord:
    return UserAuthRecord(
        id=user_id,
        email=f"user-{user_id}@example.com",
        password_hash="unused",
        name="테스트 사용자",
        role=role,
        is_active=is_active,
    )


@pytest.mark.asyncio
async def test_admin_can_view_any_incident() -> None:
    service = IncidentAccessService(FakeIncidentAccessRepository())

    assert await service.can_view(_user(1, UserRole.ADMIN), 999)


@pytest.mark.asyncio
async def test_citizen_can_view_only_reported_incident() -> None:
    service = IncidentAccessService(
        FakeIncidentAccessRepository(reporter_user_ids={2})
    )

    assert await service.can_view(_user(2, UserRole.CITIZEN), 42)
    assert not await service.can_view(_user(3, UserRole.CITIZEN), 42)


@pytest.mark.asyncio
async def test_agency_user_needs_incident_assignment() -> None:
    service = IncidentAccessService(
        FakeIncidentAccessRepository(assigned_user_ids={10})
    )

    assert await service.can_view(agency_user(user_id=10), 42)
    assert not await service.can_view(agency_user(user_id=11), 42)


@pytest.mark.asyncio
async def test_inactive_user_is_always_denied() -> None:
    service = IncidentAccessService(
        FakeIncidentAccessRepository(reporter_user_ids={2})
    )

    assert not await service.can_view(
        _user(2, UserRole.CITIZEN, is_active=False), 42
    )
