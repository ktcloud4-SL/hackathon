"""SQLAlchemy adapters for the existing authentication/access protocols."""

from sqlalchemy import exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import joinedload

from app.models import Agency, Incident, IncidentAgency, Report, User
from app.schemas.auth import UserRole
from app.services.auth import DuplicateEmailError, UserAuthRecord


def to_auth_record(user: User) -> UserAuthRecord:
    return UserAuthRecord(
        id=user.id,
        email=user.email,
        password_hash=user.password_hash,
        name=user.name,
        role=UserRole(user.role),
        agency_type=user.agency_type,
        is_active=user.is_active,
    )


class SQLAlchemyUserRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def get_by_email(self, email: str) -> UserAuthRecord | None:
        async with self._session_factory() as session:
            user = await session.scalar(
                select(User)
                .options(joinedload(User.agency))
                .where(User.email == email.lower())
            )
            return to_auth_record(user) if user else None

    async def get_by_id(self, user_id: int) -> UserAuthRecord | None:
        async with self._session_factory() as session:
            user = await session.scalar(
                select(User)
                .options(joinedload(User.agency))
                .where(User.id == user_id)
            )
            return to_auth_record(user) if user else None

    async def create_citizen(
        self, *, email: str, password_hash: str, name: str
    ) -> UserAuthRecord:
        async with self._session_factory() as session:
            user = User(
                email=email.lower(),
                password_hash=password_hash,
                name=name,
                role=UserRole.CITIZEN.value,
            )
            session.add(user)
            try:
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise DuplicateEmailError from exc
            await session.refresh(user)
            return to_auth_record(user)


class SQLAlchemyIncidentAccessRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def is_reporter(self, *, incident_id: int, user_id: int) -> bool:
        async with self._session_factory() as session:
            return bool(
                await session.scalar(
                    select(
                        exists().where(
                            Incident.id == incident_id,
                            Incident.report_id == Report.id,
                            Report.reporter_user_id == user_id,
                        )
                    )
                )
            )

    async def is_assigned_agency_user(
        self, *, incident_id: int, user_id: int
    ) -> bool:
        async with self._session_factory() as session:
            return bool(
                await session.scalar(
                    select(
                        exists().where(
                            IncidentAgency.incident_id == incident_id,
                            IncidentAgency.agency_id == Agency.id,
                            User.id == user_id,
                            User.agency_id == Agency.id,
                        )
                    )
                )
            )
