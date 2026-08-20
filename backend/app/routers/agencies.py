"""Agency dashboard endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_incident_service, require_roles
from app.schemas.auth import UserRole
from app.schemas.domain import (
    AgencyIncidentList,
    AgencyStatus,
    IncidentStatus,
    Severity,
)
from app.services.auth import UserAuthRecord
from app.services.incidents import IncidentService


router = APIRouter(prefix="/agencies", tags=["agencies"])


@router.get("/me/incidents", response_model=AgencyIncidentList)
async def my_agency_incidents(
    current_user: Annotated[UserAuthRecord, Depends(require_roles(UserRole.AGENCY))],
    service: Annotated[IncidentService, Depends(get_incident_service)],
    incident_status: Annotated[IncidentStatus | None, Query(alias="incidentStatus")] = None,
    agency_status: Annotated[AgencyStatus | None, Query(alias="agencyStatus")] = None,
    severity: Severity | None = None,
) -> AgencyIncidentList:
    assert current_user.agency_type is not None
    items = await service.list_agency_incidents(
        agency_type=current_user.agency_type,
        incident_status=incident_status,
        agency_status=agency_status,
        severity=severity,
    )
    return AgencyIncidentList(items=items, total=len(items))
