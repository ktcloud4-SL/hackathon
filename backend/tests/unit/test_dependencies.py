import pytest

from app.core.dependencies import require_roles
from app.core.errors import ForbiddenError
from app.schemas.auth import UserRole
from app.services.auth import UserAuthRecord


def _user(role: UserRole) -> UserAuthRecord:
    return UserAuthRecord(
        id=1,
        email="user@example.com",
        password_hash="unused",
        name="테스트 사용자",
        role=role,
    )


@pytest.mark.asyncio
async def test_role_dependency_returns_allowed_user() -> None:
    dependency = require_roles(UserRole.ADMIN)
    user = _user(UserRole.ADMIN)

    assert await dependency(user) is user


@pytest.mark.asyncio
async def test_role_dependency_rejects_other_roles() -> None:
    dependency = require_roles(UserRole.ADMIN)

    with pytest.raises(ForbiddenError):
        await dependency(_user(UserRole.CITIZEN))
