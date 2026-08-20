"""Authentication service independent from the concrete database model."""

from dataclasses import dataclass
from typing import Protocol

from app.core.errors import InvalidCredentialsError, ResourceConflictError
from app.schemas.auth import AgencyType, RegisterRequest, UserRole


@dataclass(frozen=True, slots=True)
class UserAuthRecord:
    id: int
    email: str
    password_hash: str
    name: str
    role: UserRole
    agency_type: AgencyType | None = None
    is_active: bool = True

    def __post_init__(self) -> None:
        if self.role is UserRole.AGENCY and self.agency_type is None:
            raise ValueError("AGENCY 사용자는 agency_type이 필요합니다.")
        if self.role is not UserRole.AGENCY and self.agency_type is not None:
            raise ValueError("AGENCY가 아닌 사용자는 agency_type을 가질 수 없습니다.")


class DuplicateEmailError(Exception):
    """Raised by a repository when an email uniqueness constraint fails."""


class UserRepository(Protocol):
    async def get_by_email(self, email: str) -> UserAuthRecord | None: ...

    async def get_by_id(self, user_id: int) -> UserAuthRecord | None: ...

    async def create_citizen(
        self,
        *,
        email: str,
        password_hash: str,
        name: str,
    ) -> UserAuthRecord: ...


class AuthService:
    def __init__(self, repository: UserRepository) -> None:
        self._repository = repository

    async def register(self, request: RegisterRequest) -> UserAuthRecord:
        from app.core.security import hash_password

        email = request.email.lower()
        if await self._repository.get_by_email(email):
            raise ResourceConflictError("EMAIL_ALREADY_EXISTS", "이미 등록된 이메일입니다.")

        try:
            return await self._repository.create_citizen(
                email=email,
                password_hash=hash_password(request.password),
                name=request.name,
            )
        except DuplicateEmailError as exc:
            raise ResourceConflictError(
                "EMAIL_ALREADY_EXISTS", "이미 등록된 이메일입니다."
            ) from exc

    async def authenticate(self, email: str, password: str) -> UserAuthRecord:
        from app.core.security import consume_dummy_password_check, verify_password

        user = await self._repository.get_by_email(email.lower())
        if user is None:
            consume_dummy_password_check(password)
            raise InvalidCredentialsError()

        if not user.is_active or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        return user
