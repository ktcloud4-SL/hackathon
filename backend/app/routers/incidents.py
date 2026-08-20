"""Incident detail and command endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.core.dependencies import (
    CurrentUser,
    get_incident_access_checker,
    get_incident_service,
    require_roles,
)
from app.core.errors import ForbiddenError
from app.schemas.auth import AgencyType, UserRole
from app.schemas.domain import (
    AgencyAddRequest,
    AgencyStatusUpdate,
    IncidentDetail,
    IncidentList,
    IncidentStatus,
    Severity,
    SeverityUpdate,
    SupportRequest,
    SupportResponse,
)
from app.schemas.event import TimelineEventView
from app.services.incident_access import IncidentAccessChecker
from app.services.incidents import IncidentService


router = APIRouter(prefix="/incidents", tags=["incidents"])
AdminUser = Annotated[object, Depends(require_roles(UserRole.ADMIN))]


async def _require_view(
    checker: IncidentAccessChecker, current_user: CurrentUser, incident_id: int
) -> None:
    if not await checker.can_view(current_user, incident_id):
        raise ForbiddenError()


@router.get("", response_model=IncidentList)
async def list_incidents(
    _: Annotated[object, Depends(require_roles(UserRole.ADMIN))],
    service: Annotated[IncidentService, Depends(get_incident_service)],
    incident_status: Annotated[IncidentStatus | None, Query(alias="incidentStatus")] = None,
    severity: Severity | None = None,
) -> IncidentList:
    items = await service.list_incidents(status=incident_status, severity=severity)
    return IncidentList(items=items, total=len(items))


@router.get("/{incidentId}", response_model=IncidentDetail)
async def get_incident(
    incident_id: Annotated[int, Path(alias="incidentId", gt=0)],
    current_user: CurrentUser,
    service: Annotated[IncidentService, Depends(get_incident_service)],
    checker: Annotated[IncidentAccessChecker, Depends(get_incident_access_checker)],
) -> IncidentDetail:
    await _require_view(checker, current_user, incident_id)
    return await service.get_detail(incident_id)


@router.get("/{incidentId}/timeline", response_model=list[TimelineEventView])
async def get_timeline(
    incident_id: Annotated[int, Path(alias="incidentId", gt=0)],
    current_user: CurrentUser,
    service: Annotated[IncidentService, Depends(get_incident_service)],
    checker: Annotated[IncidentAccessChecker, Depends(get_incident_access_checker)],
) -> list[TimelineEventView]:
    await _require_view(checker, current_user, incident_id)
    return (await service.get_detail(incident_id)).timeline


@router.patch("/{incidentId}/agencies/{agencyType}/status", response_model=IncidentDetail)
async def update_agency_status(
    body: AgencyStatusUpdate,
    incident_id: Annotated[int, Path(alias="incidentId", gt=0)],
    agency_type: Annotated[AgencyType, Path(alias="agencyType")],
    current_user: CurrentUser,
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> IncidentDetail:
    if current_user.role is not UserRole.AGENCY:
        raise ForbiddenError("기관 사용자만 대응 상태를 변경할 수 있습니다.")
    return await service.update_agency_status(
        incident_id=incident_id,
        agency_type=agency_type,
        new_status=body.status,
        actor=current_user,
    )


@router.post("/{incidentId}/support", response_model=SupportResponse)
async def request_support(
    body: SupportRequest,
    incident_id: Annotated[int, Path(alias="incidentId", gt=0)],
    current_user: CurrentUser,
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> SupportResponse:
    return await service.request_support(
        incident_id=incident_id,
        target=body.target_agency_type,
        reason=body.reason,
        actor=current_user,
    )


@router.patch("/{incidentId}/severity", response_model=IncidentDetail)
async def change_severity(
    body: SeverityUpdate,
    incident_id: Annotated[int, Path(alias="incidentId", gt=0)],
    current_user: Annotated[
        object, Depends(require_roles(UserRole.ADMIN))
    ],
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> IncidentDetail:
    return await service.change_severity(
        incident_id=incident_id,
        severity=body.severity,
        actor_user_id=current_user.id,  # type: ignore[attr-defined]
    )


@router.post("/{incidentId}/agencies", response_model=IncidentDetail)
async def add_agency(
    body: AgencyAddRequest,
    incident_id: Annotated[int, Path(alias="incidentId", gt=0)],
    current_user: Annotated[
        object, Depends(require_roles(UserRole.ADMIN))
    ],
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> IncidentDetail:
    return await service.add_agency(
        incident_id=incident_id,
        agency_type=body.agency_type,
        actor_user_id=current_user.id,  # type: ignore[attr-defined]
    )


@router.patch("/{incidentId}/close", response_model=IncidentDetail)
async def close_incident(
    incident_id: Annotated[int, Path(alias="incidentId", gt=0)],
    current_user: Annotated[
        object, Depends(require_roles(UserRole.ADMIN))
    ],
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> IncidentDetail:
    return await service.close(
        incident_id=incident_id,
        actor_user_id=current_user.id,  # type: ignore[attr-defined]
    )
