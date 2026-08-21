"""OneReport SQLAlchemy domain models."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.schemas.auth import AgencyType, UserRole


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


PK_TYPE = BigInteger().with_variant(Integer, "sqlite")
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")


class Agency(Base):
    __tablename__ = "agencies"
    __table_args__ = (
        CheckConstraint(
            "code IN ('POLICE', 'FIRE', 'KEPCO', 'ROAD', 'GAS', 'LOCAL_GOV')",
            name="ck_agencies_code",
        ),
    )

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="agency")
    incident_assignments: Mapped[list["IncidentAgency"]] = relationship(
        back_populates="agency"
    )


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "(role = 'AGENCY' AND agency_id IS NOT NULL) OR "
            "(role IN ('CITIZEN', 'ADMIN') AND agency_id IS NULL)",
            name="ck_users_role_agency",
        ),
    )

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    agency_id: Mapped[int | None] = mapped_column(
        ForeignKey("agencies.id"), nullable=True
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    agency: Mapped[Agency | None] = relationship(back_populates="users", lazy="joined")
    reports: Mapped[list["Report"]] = relationship(back_populates="reporter")

    @property
    def user_role(self) -> UserRole:
        return UserRole(self.role)

    @property
    def agency_type(self) -> AgencyType | None:
        return AgencyType(self.agency.code) if self.agency else None


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    reporter_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    image_object_key: Mapped[str | None] = mapped_column(String(1024))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    reporter: Mapped[User] = relationship(back_populates="reports")
    incident: Mapped["Incident"] = relationship(
        back_populates="report", uselist=False, cascade="all, delete-orphan"
    )


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN', 'RESPONDING', 'RESOLVED', 'CLOSED')",
            name="ck_incidents_status",
        ),
        CheckConstraint(
            "severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
            name="ck_incidents_severity",
        ),
    )

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id"), unique=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="OPEN")
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    categories: Mapped[list[str]] = mapped_column(JSON_TYPE, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    report: Mapped[Report] = relationship(back_populates="incident")
    agencies: Mapped[list["IncidentAgency"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan"
    )
    timeline: Mapped[list["TimelineEvent"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan"
    )


class IncidentAgency(Base):
    __tablename__ = "incident_agencies"
    __table_args__ = (
        UniqueConstraint("incident_id", "agency_id", name="uq_incident_agency"),
        CheckConstraint(
            "status IN ('ASSIGNED', 'RECEIVED', 'DISPATCHED', 'ARRIVED', "
            "'IN_PROGRESS', 'COMPLETED')",
            name="ck_incident_agencies_status",
        ),
    )

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    incident_id: Mapped[int] = mapped_column(
        ForeignKey("incidents.id"), nullable=False, index=True
    )
    agency_id: Mapped[int] = mapped_column(
        ForeignKey("agencies.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="ASSIGNED"
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    in_progress_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    incident: Mapped[Incident] = relationship(back_populates="agencies")
    agency: Mapped[Agency] = relationship(back_populates="incident_assignments")


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    incident_id: Mapped[int] = mapped_column(
        ForeignKey("incidents.id"), nullable=False, index=True
    )
    agency_id: Mapped[int | None] = mapped_column(ForeignKey("agencies.id"))
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    event_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSON_TYPE, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )

    incident: Mapped[Incident] = relationship(back_populates="timeline")
    agency: Mapped[Agency | None] = relationship()
    actor: Mapped[User | None] = relationship()


__all__ = [
    "Agency",
    "Base",
    "Incident",
    "IncidentAgency",
    "Report",
    "TimelineEvent",
    "User",
]
