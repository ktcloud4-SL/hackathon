"""In-memory adapters used only by tests."""

from app.schemas.auth import AgencyType, UserRole
from app.services.auth import DuplicateEmailError, UserAuthRecord


class FakeUserRepository:
    def __init__(self) -> None:
        self._users_by_id: dict[int, UserAuthRecord] = {}
        self._users_by_email: dict[str, UserAuthRecord] = {}
        self._next_id = 1

    async def get_by_email(self, email: str) -> UserAuthRecord | None:
        return self._users_by_email.get(email.lower())

    async def get_by_id(self, user_id: int) -> UserAuthRecord | None:
        return self._users_by_id.get(user_id)

    async def create_citizen(
        self,
        *,
        email: str,
        password_hash: str,
        name: str,
    ) -> UserAuthRecord:
        normalized_email = email.lower()
        if normalized_email in self._users_by_email:
            raise DuplicateEmailError
        user = UserAuthRecord(
            id=self._next_id,
            email=normalized_email,
            password_hash=password_hash,
            name=name,
            role=UserRole.CITIZEN,
        )
        self._next_id += 1
        self.add(user)
        return user

    def add(self, user: UserAuthRecord) -> None:
        self._users_by_id[user.id] = user
        self._users_by_email[user.email.lower()] = user


class StaticIncidentAccessChecker:
    def __init__(self, allowed: bool) -> None:
        self.allowed = allowed

    async def can_view(self, user: UserAuthRecord, incident_id: int) -> bool:
        return self.allowed


def agency_user(*, user_id: int = 10) -> UserAuthRecord:
    return UserAuthRecord(
        id=user_id,
        email="fire@example.com",
        password_hash="unused",
        name="119 상황실",
        role=UserRole.AGENCY,
        agency_type=AgencyType.FIRE,
    )
