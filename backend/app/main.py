"""OneReport FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.errors import AppError
from app.db.database import create_database
from app.db.repositories import (
    SQLAlchemyIncidentAccessRepository,
    SQLAlchemyUserRepository,
)
from app.integrations.public_data import NoopIncidentContextProvider
from app.integrations.s3 import S3ObjectStorage
from app.routers.analysis import router as analysis_router
from app.routers.auth import router as auth_router
from app.routers.agencies import router as agencies_router
from app.routers.events import router as events_router
from app.routers.incidents import router as incidents_router
from app.routers.reports import router as reports_router
from app.services.incident_access import IncidentAccessService
from app.services.sse import SSEBroker


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    engine, session_factory = create_database(settings.database_url)
    app.state.database_engine = engine
    app.state.session_factory = session_factory
    if not hasattr(app.state, "user_repository"):
        app.state.user_repository = SQLAlchemyUserRepository(session_factory)
    if not hasattr(app.state, "incident_access_checker"):
        app.state.incident_access_checker = IncidentAccessService(
            SQLAlchemyIncidentAccessRepository(session_factory)
        )
    app.state.sse_broker = SSEBroker(settings.sse_heartbeat_seconds)
    app.state.incident_context_provider = NoopIncidentContextProvider()
    if settings.s3_bucket:
        app.state.object_storage = S3ObjectStorage(
            bucket_name=settings.s3_bucket,
            aws_region=settings.aws_region,
            object_prefix=settings.s3_prefix,
            presigned_url_expire_seconds=settings.s3_presigned_url_expire_seconds,
        )
    try:
        yield
    finally:
        await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title="OneReport API", version="1.1", lifespan=lifespan)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(analysis_router, prefix="/api")
    application.include_router(auth_router, prefix="/api")
    application.include_router(reports_router, prefix="/api")
    application.include_router(incidents_router, prefix="/api")
    application.include_router(agencies_router, prefix="/api")
    application.include_router(events_router, prefix="/api")

    @application.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.code, "message": exc.message},
        )

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "code": "VALIDATION_ERROR",
                "message": "요청 입력값을 확인해 주세요.",
                "details": jsonable_encoder(exc.errors()),
            },
        )

    @application.get("/api/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()
