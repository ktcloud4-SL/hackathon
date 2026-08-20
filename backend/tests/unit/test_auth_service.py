import pytest

from app.core.errors import InvalidCredentialsError, ResourceConflictError
from app.core.security import hash_password
from app.schemas.auth import AgencyType, RegisterRequest, UserRole
from app.services.auth import AuthService, UserAuthRecord
from tests.fakes import FakeUserRepository


@pytest.mark.asyncio
async def test_register_and_authenticate_citizen() -> None:
    repository = FakeUserRepository()
    service = AuthService(repository)

    registered = await service.register(
        RegisterRequest(
            email="Citizen@Example.com",
            password="password1234",
            name="홍길동",
        )
    )
    authenticated = await service.authenticate(
        "citizen@example.com", "password1234"
    )

    assert registered.email == "citizen@example.com"
    assert authenticated.id == registered.id


@pytest.mark.asyncio
async def test_duplicate_email_is_rejected() -> None:
    service = AuthService(FakeUserRepository())
    request = RegisterRequest(
        email="citizen@example.com", password="password1234", name="홍길동"
    )
    await service.register(request)

    with pytest.raises(ResourceConflictError) as exc_info:
        await service.register(request)

    assert exc_info.value.code == "EMAIL_ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_unknown_user_login_is_rejected() -> None:
    service = AuthService(FakeUserRepository())

    with pytest.raises(InvalidCredentialsError):
        await service.authenticate("missing@example.com", "password1234")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("role", "agency_type"),
    [
        (UserRole.AGENCY, AgencyType.FIRE),
        (UserRole.ADMIN, None),
    ],
)
async def test_seeded_agency_and_admin_users_can_authenticate(
    role: UserRole,
    agency_type: AgencyType | None,
) -> None:
    repository = FakeUserRepository()
    repository.add(
        UserAuthRecord(
            id=10,
            email=f"{role.value.lower()}@example.com",
            password_hash=hash_password("password1234"),
            name="테스트 사용자",
            role=role,
            agency_type=agency_type,
        )
    )
    service = AuthService(repository)

    user = await service.authenticate(
        f"{role.value.lower()}@example.com", "password1234"
    )

    assert user.role is role
    assert user.agency_type is agency_type


def test_agency_user_requires_agency_type() -> None:
    with pytest.raises(ValueError):
        UserAuthRecord(
            id=10,
            email="agency@example.com",
            password_hash="unused",
            name="기관 사용자",
            role=UserRole.AGENCY,
        )
