"""Incident SSE endpoint."""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Request
from fastapi.responses import StreamingResponse

from app.core.dependencies import (
    CurrentUser,
    get_incident_access_checker,
    get_sse_broker,
)
from app.core.errors import ForbiddenError
from app.services.incident_access import IncidentAccessChecker
from app.services.sse import SSEBroker


router = APIRouter(prefix="/incidents", tags=["events"])


@router.get("/{incidentId}/events")
async def incident_events(
    incident_id: Annotated[int, Path(alias="incidentId", gt=0)],
    request: Request,
    current_user: CurrentUser,
    broker: Annotated[SSEBroker, Depends(get_sse_broker)],
    access_checker: Annotated[
        IncidentAccessChecker, Depends(get_incident_access_checker)
    ],
) -> StreamingResponse:
    if not await access_checker.can_view(current_user, incident_id):
        raise ForbiddenError()

    return StreamingResponse(
        broker.stream(request, incident_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
