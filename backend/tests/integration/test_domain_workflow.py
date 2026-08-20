from collections.abc import AsyncIterator, Iterable

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.database import Base
from app.models import Agency, TimelineEvent, User
from app.schemas.auth import AgencyType, UserRole
from app.schemas.domain import AgencyStatus, Category, IncidentStatus, Severity
from app.services.auth import UserAuthRecord
from app.services.event_publisher import (
    IncidentEventPublication,
    IncidentEventPublisher,
)
from app.services.incidents import IncidentService


class RecordingPublisher(IncidentEventPublisher):
    def __init__(
        self, session_factory: async_sessionmaker[AsyncSession] | None = None
    ) -> None:
        self.events: list[IncidentEventPublication] = []
        self._session_factory = session_factory

    async def publish_committed(
        self, *, incident_id: int, publication: IncidentEventPublication
    ) -> int:
        assert incident_id > 0
        if self._session_factory is not None:
            async with self._session_factory() as session:
                stored = await session.get(
                    TimelineEvent, publication.timeline_event.id
                )
                assert stored is not None, "SSE publication happened before commit"
        self.events.append(publication)
        return 0

    async def publish_committed_many(
        self,
        *,
        incident_id: int,
        publications: Iterable[IncidentEventPublication],
    ) -> int:
        for publication in publications:
            await self.publish_committed(
                incident_id=incident_id, publication=publication
            )
        return 0


@pytest_asyncio.fixture
async def database() -> AsyncIterator[tuple[AsyncEngine, async_sessionmaker[AsyncSession]]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add_all(
            [
                Agency(code=agency_type.value, name=agency_type.value)
                for agency_type in AgencyType
            ]
        )
        citizen = User(
            email="citizen@example.com",
            password_hash="unused",
            name="시민",
            role=UserRole.CITIZEN.value,
        )
        session.add(citizen)
        await session.commit()
    try:
        yield engine, factory
    finally:
        await engine.dispose()


async def _create_incident(
    factory: async_sessionmaker[AsyncSession], publisher: RecordingPublisher
) -> int:
    async with factory() as session:
        citizen_id = await session.scalar(
            select(User.id).where(User.email == "citizen@example.com")
        )
    assert citizen_id is not None
    async with factory() as session:
        created = await IncidentService(session, publisher).create_report(
            reporter_user_id=citizen_id,
            description="차량 충돌과 인명 피해",
            address="서울시 강남구",
            latitude=37.5,
            longitude=127.0,
            categories=[Category.TRAFFIC_ACCIDENT, Category.HUMAN_INJURY],
            severity=Severity.HIGH,
            image_object_key=None,
        )
    assert [item.agency_type for item in created.agencies] == [
        AgencyType.POLICE,
        AgencyType.ROAD,
        AgencyType.FIRE,
    ]
    assert publisher.events == []  # Initial state is returned, not SSE-published.
    return created.incident.id


@pytest.mark.asyncio
async def test_full_workflow_resolves_after_every_agency_completes(
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    _, factory = database
    publisher = RecordingPublisher(factory)
    incident_id = await _create_incident(factory, publisher)

    for agency_type in (AgencyType.POLICE, AgencyType.ROAD, AgencyType.FIRE):
        actor = UserAuthRecord(
            id=100 + list(AgencyType).index(agency_type),
            email=f"{agency_type.value.lower()}@example.com",
            password_hash="unused",
            name=agency_type.value,
            role=UserRole.AGENCY,
            agency_type=agency_type,
        )
        for new_status in list(AgencyStatus)[1:]:
            async with factory() as session:
                detail = await IncidentService(session, publisher).update_agency_status(
                    incident_id=incident_id,
                    agency_type=agency_type,
                    new_status=new_status,
                    actor=actor,
                )

    assert detail.status is IncidentStatus.RESOLVED
    assert detail.resolved_at is not None
    assert publisher.events[-1].timeline_event.type.value == "INCIDENT_RESOLVED"

    admin = UserAuthRecord(
        id=999,
        email="admin@example.com",
        password_hash="unused",
        name="관리자",
        role=UserRole.ADMIN,
    )
    async with factory() as session:
        closed = await IncidentService(session, publisher).close(
            incident_id=incident_id, actor_user_id=admin.id
        )
    assert closed.status is IncidentStatus.CLOSED
    assert closed.closed_at is not None


@pytest.mark.asyncio
async def test_support_request_adds_assignment_and_publishes_in_order(
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    _, factory = database
    publisher = RecordingPublisher(factory)
    incident_id = await _create_incident(factory, publisher)
    actor = UserAuthRecord(
        id=10,
        email="fire@example.com",
        password_hash="unused",
        name="소방",
        role=UserRole.AGENCY,
        agency_type=AgencyType.FIRE,
    )

    async with factory() as session:
        response = await IncidentService(session, publisher).request_support(
            incident_id=incident_id,
            target=AgencyType.GAS,
            reason="가스 냄새",
            actor=actor,
        )
    async with factory() as session:
        stored_types = list(
            await session.scalars(
                select(TimelineEvent.event_type)
                .where(TimelineEvent.incident_id == incident_id)
                .order_by(TimelineEvent.id)
            )
        )

    assert response.status is AgencyStatus.ASSIGNED
    assert [event.timeline_event.type.value for event in publisher.events] == [
        "SUPPORT_REQUESTED",
        "AGENCY_ASSIGNED",
    ]
    assert stored_types[-2:] == ["SUPPORT_REQUESTED", "AGENCY_ASSIGNED"]
