"""Citizen Report endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status

from app.core.dependencies import CurrentUser, get_incident_service
from app.core.errors import AppError, ForbiddenError, ServiceNotReadyError
from app.integrations.storage import ObjectStorage
from app.schemas.auth import UserRole
from app.schemas.domain import (
    Category,
    MyReportList,
    ReportCreatedResponse,
    Severity,
)
from app.services.incidents import IncidentService


router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    request: Request,
    current_user: CurrentUser,
    service: Annotated[IncidentService, Depends(get_incident_service)],
    description: Annotated[str, Form(min_length=1, max_length=5000)],
    address: Annotated[str, Form(min_length=1, max_length=500)],
    latitude: Annotated[float, Form(ge=-90, le=90)],
    longitude: Annotated[float, Form(ge=-180, le=180)],
    categories: Annotated[list[Category] | None, Form()] = None,
    category_hint: Annotated[Category | None, Form(alias="categoryHint")] = None,
    severity: Annotated[Severity, Form()] = Severity.MEDIUM,
    image: Annotated[UploadFile | None, File()] = None,
) -> ReportCreatedResponse:
    if current_user.role is not UserRole.CITIZEN:
        raise ForbiddenError("시민 사용자만 신고할 수 있습니다.")

    image_object_key: str | None = None
    storage: ObjectStorage | None = None
    if image is not None:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise AppError(422, "INVALID_IMAGE", "이미지 파일만 업로드할 수 있습니다.")
        storage = getattr(request.app.state, "object_storage", None)
        if storage is None:
            raise ServiceNotReadyError("ObjectStorage")
        content = await image.read()
        if len(content) > 10 * 1024 * 1024:
            raise AppError(422, "IMAGE_TOO_LARGE", "이미지는 10MB 이하여야 합니다.")
        stored = await storage.upload(
            content=content,
            filename=image.filename or "report-image",
            content_type=image.content_type,
        )
        image_object_key = stored.object_key

    try:
        return await service.create_report(
            reporter_user_id=current_user.id,
            description=description,
            address=address,
            latitude=latitude,
            longitude=longitude,
            categories=(categories or []) + ([category_hint] if category_hint else []),
            severity=severity,
            image_object_key=image_object_key,
        )
    except Exception:
        if storage is not None and image_object_key is not None:
            await storage.delete(image_object_key)
        raise


@router.get("/me", response_model=MyReportList)
async def my_reports(
    current_user: CurrentUser,
    service: Annotated[IncidentService, Depends(get_incident_service)],
) -> MyReportList:
    if current_user.role is not UserRole.CITIZEN:
        raise ForbiddenError("시민 사용자만 자신의 신고를 조회할 수 있습니다.")
    items = await service.list_my_reports(current_user.id)
    return MyReportList(items=items, total=len(items))
