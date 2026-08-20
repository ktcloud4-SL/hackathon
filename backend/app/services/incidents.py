"""Core Report/Incident workflow and transactional state changes."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.errors import AppError, ForbiddenError, ResourceConflictError
from app.integrations.storage import ObjectStorage
from app.models import Agency, Incident, IncidentAgency, Report, TimelineEvent
from app.schemas.auth import AgencyType, UserRole
from app.schemas.domain import (
    AgencyAssignmentView,
    AgencyIncidentItem,
    AgencyStatus,
    Category,
    IncidentDetail,
    IncidentStatus,
    IncidentSummary,
    MyReportItem,
    ReportCreatedResponse,
    ReportView,
    Severity,
    SupportResponse,
)
from app.schemas.event import EventType
from app.services.auth import UserAuthRecord
from app.services.event_publisher import (
    IncidentEventPublication,
    IncidentEventPublisher,
)
from app.services.routing import route_categories
from app.services.timeline import add_timeline_event, timeline_view


AGENCY_STATUS_ORDER = list(AgencyStatus)
STATUS_TIMESTAMP_FIELD: dict[AgencyStatus, str] = {
    AgencyStatus.RECEIVED: "received_at",
    AgencyStatus.DISPATCHED: "dispatched_at",
    AgencyStatus.ARRIVED: "arrived_at",
    AgencyStatus.IN_PROGRESS: "in_progress_at",
    AgencyStatus.COMPLETED: "completed_at",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _not_found(resource: str) -> AppError:
    return AppError(404, "RESOURCE_NOT_FOUND", f"{resource}을(를) 찾을 수 없습니다.")


def report_view(
    report: Report,
    object_storage: ObjectStorage | None = None,
) -> ReportView:
    image_url = None
    if report.image_object_key is not None and object_storage is not None:
        image_url = object_storage.create_download_url(report.image_object_key)
    return ReportView(
        id=report.id,
        description=report.description,
        address=report.address,
        latitude=report.latitude,
        longitude=report.longitude,
        image_url=image_url,
        created_at=report.created_at,
    )


def incident_summary(incident: Incident) -> IncidentSummary:
    return IncidentSummary(
        id=incident.id,
        status=IncidentStatus(incident.status),
        severity=Severity(incident.severity),
        categories=[Category(value) for value in incident.categories],
        created_at=incident.created_at,
        updated_at=incident.updated_at,
    )


def assignment_view(assignment: IncidentAgency) -> AgencyAssignmentView:
    return AgencyAssignmentView(
        agency_type=AgencyType(assignment.agency.code),
        status=AgencyStatus(assignment.status),
        assigned_at=assignment.assigned_at,
        updated_at=assignment.updated_at,
    )


def incident_detail(
    incident: Incident,
    object_storage: ObjectStorage | None = None,
) -> IncidentDetail:
    return IncidentDetail(
        **incident_summary(incident).model_dump(),
        report=report_view(incident.report, object_storage),
        agencies=[assignment_view(item) for item in incident.agencies],
        timeline=[
            timeline_view(event)
            for event in sorted(incident.timeline, key=lambda item: item.id)
        ],
        resolved_at=incident.resolved_at,
        closed_at=incident.closed_at,
    )


class IncidentService:
    def __init__(
        self,
        session: AsyncSession,
        publisher: IncidentEventPublisher,
        object_storage: ObjectStorage | None = None,
    ) -> None:
        self._session = session
        self._publisher = publisher
        self._object_storage = object_storage

    async def _load_incident(
        self, incident_id: int, *, for_update: bool = False
    ) -> Incident:
        statement = (
            select(Incident)
            .options(
                joinedload(Incident.report),
                selectinload(Incident.agencies).joinedload(IncidentAgency.agency),
                selectinload(Incident.timeline),
            )
            .where(Incident.id == incident_id)
        )
        if for_update:
            statement = statement.with_for_update(of=Incident)
        incident = await self._session.scalar(statement)
        if incident is None:
            raise _not_found("Incident")
        return incident

    async def create_report(
        self,
        *,
        reporter_user_id: int,
        description: str,
        address: str,
        latitude: float,
        longitude: float,
        categories: list[Category],
        severity: Severity,
        image_object_key: str | None,
    ) -> ReportCreatedResponse:
        unique_categories = list(dict.fromkeys(categories))
        if not unique_categories:
            raise AppError(422, "CLASSIFICATION_REQUIRED", "사고 유형을 선택해 주세요.")
        agency_types = route_categories(unique_categories)

        async with self._session.begin():
            agencies = list(
                (
                    await self._session.scalars(
                        select(Agency).where(
                            Agency.code.in_([item.value for item in agency_types])
                        )
                    )
                ).all()
            )
            by_code = {AgencyType(item.code): item for item in agencies}
            missing = [item.value for item in agency_types if item not in by_code]
            if missing:
                raise AppError(
                    503,
                    "AGENCY_SEED_REQUIRED",
                    f"기관 Seed Data가 없습니다: {', '.join(missing)}",
                )

            report = Report(
                reporter_user_id=reporter_user_id,
                description=description.strip(),
                address=address.strip(),
                latitude=latitude,
                longitude=longitude,
                image_object_key=image_object_key,
            )
            incident = Incident(
                report=report,
                status=IncidentStatus.OPEN.value,
                severity=severity.value,
                categories=[item.value for item in unique_categories],
            )
            self._session.add(incident)
            await self._session.flush()

            await add_timeline_event(
                self._session,
                incident_id=incident.id,
                actor_user_id=reporter_user_id,
                event_type=EventType.REPORT_CREATED,
                message="시민 신고가 접수되었습니다.",
            )
            await add_timeline_event(
                self._session,
                incident_id=incident.id,
                event_type=EventType.INCIDENT_CREATED,
                message="공동 대응 Incident가 생성되었습니다.",
            )
            await add_timeline_event(
                self._session,
                incident_id=incident.id,
                event_type=EventType.INCIDENT_CLASSIFIED,
                message="사용자가 선택한 사고 유형이 저장되었습니다.",
                metadata={"categories": [item.value for item in unique_categories]},
            )

            assignments: list[IncidentAgency] = []
            for agency_type in agency_types:
                agency = by_code[agency_type]
                assignment = IncidentAgency(incident=incident, agency=agency)
                self._session.add(assignment)
                assignments.append(assignment)
                await self._session.flush()
                await add_timeline_event(
                    self._session,
                    incident_id=incident.id,
                    agency_id=agency.id,
                    event_type=EventType.AGENCY_ASSIGNED,
                    message=f"{agency.name} 기관이 자동 배정되었습니다.",
                    metadata={
                        "agencyType": agency_type.value,
                        "status": AgencyStatus.ASSIGNED.value,
                    },
                )
            await self._session.flush()

            # Initial events are returned in the POST response and intentionally not
            # SSE-published. Build the response before commit so a URL generation
            # failure rolls back the DB transaction and lets the router remove S3 data.
            response = ReportCreatedResponse(
                report=report_view(report, self._object_storage),
                incident=incident_summary(incident),
                agencies=[assignment_view(item) for item in assignments],
            )

        return response

    async def get_detail(self, incident_id: int) -> IncidentDetail:
        return incident_detail(
            await self._load_incident(incident_id), self._object_storage
        )

    async def list_my_reports(self, reporter_user_id: int) -> list[MyReportItem]:
        reports = list(
            (
                await self._session.scalars(
                    select(Report)
                    .options(joinedload(Report.incident))
                    .where(Report.reporter_user_id == reporter_user_id)
                    .order_by(Report.created_at.desc())
                )
            ).all()
        )
        return [
            MyReportItem(
                **report_view(report, self._object_storage).model_dump(),
                incident=incident_summary(report.incident),
            )
            for report in reports
        ]

    async def list_incidents(
        self,
        *,
        status: IncidentStatus | None = None,
        severity: Severity | None = None,
    ) -> list[IncidentDetail]:
        statement = (
            select(Incident)
            .options(
                joinedload(Incident.report),
                selectinload(Incident.agencies).joinedload(IncidentAgency.agency),
                selectinload(Incident.timeline),
            )
            .order_by(Incident.created_at.desc())
        )
        if status:
            statement = statement.where(Incident.status == status.value)
        if severity:
            statement = statement.where(Incident.severity == severity.value)
        return [
            incident_detail(item, self._object_storage)
            for item in (await self._session.scalars(statement)).all()
        ]

    async def list_agency_incidents(
        self,
        *,
        agency_type: AgencyType,
        incident_status: IncidentStatus | None = None,
        agency_status: AgencyStatus | None = None,
        severity: Severity | None = None,
    ) -> list[AgencyIncidentItem]:
        statement = (
            select(IncidentAgency)
            .join(IncidentAgency.agency)
            .join(IncidentAgency.incident)
            .options(
                joinedload(IncidentAgency.agency),
                joinedload(IncidentAgency.incident).joinedload(Incident.report),
            )
            .where(Agency.code == agency_type.value)
            .order_by(IncidentAgency.assigned_at.desc())
        )
        if incident_status:
            statement = statement.where(Incident.status == incident_status.value)
        if agency_status:
            statement = statement.where(IncidentAgency.status == agency_status.value)
        if severity:
            statement = statement.where(Incident.severity == severity.value)
        assignments = (await self._session.scalars(statement)).all()
        return [
            AgencyIncidentItem(
                id=item.incident.id,
                incident_status=IncidentStatus(item.incident.status),
                agency_status=AgencyStatus(item.status),
                severity=Severity(item.incident.severity),
                categories=[Category(value) for value in item.incident.categories],
                description=item.incident.report.description,
                address=item.incident.report.address,
                assigned_at=item.assigned_at,
                updated_at=max(item.updated_at, item.incident.updated_at),
            )
            for item in assignments
        ]

    async def update_agency_status(
        self,
        *,
        incident_id: int,
        agency_type: AgencyType,
        new_status: AgencyStatus,
        actor: UserAuthRecord,
    ) -> IncidentDetail:
        if actor.role is UserRole.AGENCY and actor.agency_type is not agency_type:
            raise ForbiddenError("자신의 기관 상태만 변경할 수 있습니다.")

        publications: list[IncidentEventPublication] = []
        async with self._session.begin():
            incident = await self._load_incident(incident_id, for_update=True)
            assignment = next(
                (
                    item
                    for item in incident.agencies
                    if item.agency.code == agency_type.value
                ),
                None,
            )
            if assignment is None:
                raise _not_found("IncidentAgency")

            previous = AgencyStatus(assignment.status)
            expected_index = AGENCY_STATUS_ORDER.index(previous) + 1
            if (
                expected_index >= len(AGENCY_STATUS_ORDER)
                or AGENCY_STATUS_ORDER[expected_index] is not new_status
            ):
                expected = (
                    AGENCY_STATUS_ORDER[expected_index].value
                    if expected_index < len(AGENCY_STATUS_ORDER)
                    else "없음"
                )
                raise AppError(
                    400,
                    "INVALID_STATUS_TRANSITION",
                    f"{previous.value} 상태에서는 {expected}로만 변경할 수 있습니다.",
                )

            now = _now()
            assignment.status = new_status.value
            assignment.updated_at = now
            setattr(assignment, STATUS_TIMESTAMP_FIELD[new_status], now)
            incident.updated_at = now
            if (
                new_status is AgencyStatus.RECEIVED
                and incident.status == IncidentStatus.OPEN.value
            ):
                incident.status = IncidentStatus.RESPONDING.value

            metadata = {
                "agencyType": agency_type.value,
                "previousStatus": previous.value,
                "status": new_status.value,
                "incidentStatus": incident.status,
            }
            changed = await add_timeline_event(
                self._session,
                incident_id=incident.id,
                agency_id=assignment.agency_id,
                actor_user_id=actor.id,
                event_type=EventType.AGENCY_STATUS_CHANGED,
                message=f"{assignment.agency.name} 대응 상태가 {new_status.value}(으)로 변경되었습니다.",
                metadata=metadata,
            )
            publications.append(
                IncidentEventPublication(timeline_event=timeline_view(changed))
            )

            if all(item.status == AgencyStatus.COMPLETED.value for item in incident.agencies):
                incident.status = IncidentStatus.RESOLVED.value
                incident.resolved_at = now
                incident.updated_at = now
                resolved = await add_timeline_event(
                    self._session,
                    incident_id=incident.id,
                    actor_user_id=actor.id,
                    event_type=EventType.INCIDENT_RESOLVED,
                    message="모든 참여 기관의 대응이 완료되어 Incident가 해결되었습니다.",
                    metadata={"incidentStatus": IncidentStatus.RESOLVED.value},
                )
                publications.append(
                    IncidentEventPublication(timeline_event=timeline_view(resolved))
                )

        await self._publisher.publish_committed_many(
            incident_id=incident_id, publications=publications
        )
        return await self.get_detail(incident_id)

    async def request_support(
        self,
        *,
        incident_id: int,
        target: AgencyType,
        reason: str,
        actor: UserAuthRecord,
    ) -> SupportResponse:
        if actor.role is not UserRole.AGENCY or actor.agency_type is None:
            raise ForbiddenError("기관 사용자만 추가 지원을 요청할 수 있습니다.")
        publications: list[IncidentEventPublication] = []
        async with self._session.begin():
            incident = await self._load_incident(incident_id, for_update=True)
            if incident.status in {IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value}:
                raise ResourceConflictError(
                    "INCIDENT_NOT_ACTIVE", "종료된 Incident에는 기관을 추가할 수 없습니다."
                )
            if not any(
                item.agency.code == actor.agency_type.value
                for item in incident.agencies
            ):
                raise ForbiddenError("참여 중인 기관만 추가 지원을 요청할 수 있습니다.")
            if any(item.agency.code == target.value for item in incident.agencies):
                raise ResourceConflictError(
                    "AGENCY_ALREADY_ASSIGNED", "이미 참여 중인 기관입니다."
                )
            agency = await self._session.scalar(
                select(Agency).where(Agency.code == target.value)
            )
            if agency is None:
                raise _not_found("Agency")

            support = await add_timeline_event(
                self._session,
                incident_id=incident.id,
                actor_user_id=actor.id,
                event_type=EventType.SUPPORT_REQUESTED,
                message=f"{target.value} 기관에 추가 지원을 요청했습니다.",
                metadata={
                    "requesterAgencyType": actor.agency_type.value,
                    "targetAgencyType": target.value,
                    "reason": reason.strip(),
                    "requestedAt": _now().isoformat(),
                },
            )
            publications.append(
                IncidentEventPublication(timeline_event=timeline_view(support))
            )
            assignment = IncidentAgency(incident_id=incident.id, agency=agency)
            self._session.add(assignment)
            await self._session.flush()
            assigned = await add_timeline_event(
                self._session,
                incident_id=incident.id,
                agency_id=agency.id,
                actor_user_id=actor.id,
                event_type=EventType.AGENCY_ASSIGNED,
                message=f"{agency.name} 기관이 추가 배정되었습니다.",
                metadata={
                    "agencyType": target.value,
                    "status": AgencyStatus.ASSIGNED.value,
                },
            )
            publications.append(
                IncidentEventPublication(timeline_event=timeline_view(assigned))
            )

        await self._publisher.publish_committed_many(
            incident_id=incident_id, publications=publications
        )
        return SupportResponse(
            incident_id=incident_id,
            requester_agency_type=actor.agency_type,
            target_agency_type=target,
            status=AgencyStatus.ASSIGNED,
        )

    async def add_agency(
        self, *, incident_id: int, agency_type: AgencyType, actor_user_id: int
    ) -> IncidentDetail:
        async with self._session.begin():
            incident = await self._load_incident(incident_id, for_update=True)
            if incident.status in {IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value}:
                raise ResourceConflictError(
                    "INCIDENT_NOT_ACTIVE", "종료된 Incident에는 기관을 추가할 수 없습니다."
                )
            if any(item.agency.code == agency_type.value for item in incident.agencies):
                raise ResourceConflictError(
                    "AGENCY_ALREADY_ASSIGNED", "이미 참여 중인 기관입니다."
                )
            agency = await self._session.scalar(
                select(Agency).where(Agency.code == agency_type.value)
            )
            if agency is None:
                raise _not_found("Agency")
            self._session.add(IncidentAgency(incident_id=incident.id, agency=agency))
            assigned = await add_timeline_event(
                self._session,
                incident_id=incident.id,
                agency_id=agency.id,
                actor_user_id=actor_user_id,
                event_type=EventType.AGENCY_ASSIGNED,
                message=f"관리자가 {agency.name} 기관을 배정했습니다.",
                metadata={
                    "agencyType": agency_type.value,
                    "status": AgencyStatus.ASSIGNED.value,
                },
            )
            publication = IncidentEventPublication(timeline_event=timeline_view(assigned))
        await self._publisher.publish_committed(
            incident_id=incident_id, publication=publication
        )
        return await self.get_detail(incident_id)

    async def change_severity(
        self, *, incident_id: int, severity: Severity, actor_user_id: int
    ) -> IncidentDetail:
        async with self._session.begin():
            incident = await self._load_incident(incident_id, for_update=True)
            previous = incident.severity
            incident.severity = severity.value
            incident.updated_at = _now()
            event = await add_timeline_event(
                self._session,
                incident_id=incident.id,
                actor_user_id=actor_user_id,
                event_type=EventType.SEVERITY_CHANGED,
                message=f"Severity가 {severity.value}(으)로 변경되었습니다.",
                metadata={"previousSeverity": previous, "severity": severity.value},
            )
            publication = IncidentEventPublication(timeline_event=timeline_view(event))
        await self._publisher.publish_committed(
            incident_id=incident_id, publication=publication
        )
        return await self.get_detail(incident_id)

    async def close(self, *, incident_id: int, actor_user_id: int) -> IncidentDetail:
        async with self._session.begin():
            incident = await self._load_incident(incident_id, for_update=True)
            if incident.status != IncidentStatus.RESOLVED.value:
                raise AppError(
                    400,
                    "INVALID_STATUS_TRANSITION",
                    "RESOLVED Incident만 CLOSED로 변경할 수 있습니다.",
                )
            now = _now()
            incident.status = IncidentStatus.CLOSED.value
            incident.closed_at = now
            incident.updated_at = now
            event = await add_timeline_event(
                self._session,
                incident_id=incident.id,
                actor_user_id=actor_user_id,
                event_type=EventType.INCIDENT_CLOSED,
                message="관리자가 Incident를 종료했습니다.",
                metadata={"incidentStatus": IncidentStatus.CLOSED.value},
            )
            publication = IncidentEventPublication(timeline_event=timeline_view(event))
        await self._publisher.publish_committed(
            incident_id=incident_id, publication=publication
        )
        return await self.get_detail(incident_id)
