"""Authentication, repository, and SSE dependencies."""

from collections.abc import AsyncIterator, Callable
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings, get_settings
from app.core.errors import (
    AuthenticationRequiredError,
    ForbiddenError,
    ServiceNotReadyError,
)
from app.core.security import decode_access_token
from app.integrations.public_data import IncidentContextProvider
from app.integrations.storage import ObjectStorage
from app.schemas.auth import UserRole
from app.services.auth import AuthService, UserAuthRecord, UserRepository
from app.services.event_publisher import (
    IncidentEventPublisher,
    SSEIncidentEventPublisher,
)
from app.services.incident_access import IncidentAccessChecker
from app.services.incidents import IncidentService
from app.services.sse import SSEBroker


def get_user_repository(request: Request) -> UserRepository:
    repository = getattr(request.app.state, "user_repository", None)
    if repository is None:
        raise ServiceNotReadyError("UserRepository")
    return repository


def get_auth_service(
    repository: Annotated[UserRepository, Depends(get_user_repository)],
) -> AuthService:
    return AuthService(repository)


async def get_current_user(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    repository: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserAuthRecord:
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise AuthenticationRequiredError()

    claims = decode_access_token(token, settings)
    try:
        user_id = int(claims.sub)
    except ValueError as exc:
        raise AuthenticationRequiredError("인증 정보의 사용자 ID가 올바르지 않습니다.") from exc

    user = await repository.get_by_id(user_id)
    if user is None or not user.is_active:
        raise AuthenticationRequiredError()
    return user


CurrentUser = Annotated[UserAuthRecord, Depends(get_current_user)]


def require_roles(*roles: UserRole) -> Callable[[CurrentUser], UserAuthRecord]:
    async def dependency(current_user: CurrentUser) -> UserAuthRecord:
        if current_user.role not in roles:
            raise ForbiddenError()
        return current_user

    return dependency


def get_sse_broker(request: Request) -> SSEBroker:
    broker = getattr(request.app.state, "sse_broker", None)
    if broker is None:
        raise ServiceNotReadyError("SSEBroker")
    return broker


def get_incident_event_publisher(
    broker: Annotated[SSEBroker, Depends(get_sse_broker)],
) -> IncidentEventPublisher:
    return SSEIncidentEventPublisher(broker)


def get_incident_access_checker(request: Request) -> IncidentAccessChecker:
    checker = getattr(request.app.state, "incident_access_checker", None)
    if checker is None:
        raise ServiceNotReadyError("IncidentAccessChecker")
    return checker


def get_object_storage(request: Request) -> ObjectStorage:
    object_storage = getattr(request.app.state, "object_storage", None)
    if object_storage is None:
        raise ServiceNotReadyError("ObjectStorage")
    return object_storage


def get_incident_context_provider(request: Request) -> IncidentContextProvider:
    provider = getattr(request.app.state, "incident_context_provider", None)
    if provider is None:
        raise ServiceNotReadyError("IncidentContextProvider")
    return provider


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    session_factory: async_sessionmaker[AsyncSession] | None = getattr(
        request.app.state, "session_factory", None
    )
    if session_factory is None:
        raise ServiceNotReadyError("Database")
    async with session_factory() as session:
        yield session


def get_incident_service(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    publisher: Annotated[
        IncidentEventPublisher, Depends(get_incident_event_publisher)
    ],
) -> IncidentService:
    return IncidentService(
        session,
        publisher,
        object_storage=getattr(request.app.state, "object_storage", None),
    )
