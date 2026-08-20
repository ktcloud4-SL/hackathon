"""Role-based Incident visibility independent from database models."""

from typing import Protocol

from app.schemas.auth import UserRole
from app.services.auth import UserAuthRecord


class IncidentAccessRepository(Protocol):
    async def is_reporter(self, *, incident_id: int, user_id: int) -> bool: ...

    async def is_assigned_agency_user(
        self, *, incident_id: int, user_id: int
    ) -> bool: ...


class IncidentAccessChecker(Protocol):
    async def can_view(self, user: UserAuthRecord, incident_id: int) -> bool: ...


class IncidentAccessService:
    """Apply the citizen, agency, and admin visibility rules from the API contract."""

    def __init__(self, repository: IncidentAccessRepository) -> None:
        self._repository = repository

    async def can_view(self, user: UserAuthRecord, incident_id: int) -> bool:
        if not user.is_active:
            return False
        if user.role is UserRole.ADMIN:
            return True
        if user.role is UserRole.CITIZEN:
            return await self._repository.is_reporter(
                incident_id=incident_id,
                user_id=user.id,
            )
        if user.role is UserRole.AGENCY:
            return await self._repository.is_assigned_agency_user(
                incident_id=incident_id,
                user_id=user.id,
            )
        return False
