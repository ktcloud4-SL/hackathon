"""Report and Incident API schemas."""

from datetime import datetime
from enum import Enum

from pydantic import Field

from app.schemas import ApiModel
from app.schemas.auth import AgencyType
from app.schemas.event import TimelineEventView


class Category(str, Enum):
    TRAFFIC_ACCIDENT = "TRAFFIC_ACCIDENT"
    HUMAN_INJURY = "HUMAN_INJURY"
    ELECTRIC_DAMAGE = "ELECTRIC_DAMAGE"
    FIRE_RISK = "FIRE_RISK"
    ROAD_DAMAGE = "ROAD_DAMAGE"
    GAS_RISK = "GAS_RISK"
    ANIMAL_CARCASS = "ANIMAL_CARCASS"
    OTHER_CIVIC = "OTHER_CIVIC"


class ReportTrack(str, Enum):
    EMERGENCY = "EMERGENCY"
    CIVIC = "CIVIC"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, Enum):
    OPEN = "OPEN"
    RESPONDING = "RESPONDING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class AgencyStatus(str, Enum):
    ASSIGNED = "ASSIGNED"
    RECEIVED = "RECEIVED"
    DISPATCHED = "DISPATCHED"
    ARRIVED = "ARRIVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class ReportView(ApiModel):
    id: int
    description: str
    address: str
    latitude: float
    longitude: float
    image_url: str | None = None
    created_at: datetime


class IncidentSummary(ApiModel):
    id: int
    status: IncidentStatus
    severity: Severity
    categories: list[Category]
    track: ReportTrack
    created_at: datetime
    updated_at: datetime


class AgencyAssignmentView(ApiModel):
    agency_type: AgencyType
    status: AgencyStatus
    assigned_at: datetime
    updated_at: datetime


class ReportCreatedResponse(ApiModel):
    report: ReportView
    incident: IncidentSummary
    agencies: list[AgencyAssignmentView]


class IncidentDetail(IncidentSummary):
    report: ReportView
    agencies: list[AgencyAssignmentView]
    timeline: list[TimelineEventView]
    resolved_at: datetime | None = None
    closed_at: datetime | None = None


class MyReportItem(ReportView):
    incident: IncidentSummary


class MyReportList(ApiModel):
    items: list[MyReportItem]
    total: int


class IncidentList(ApiModel):
    items: list[IncidentDetail]
    total: int


class AgencyIncidentItem(ApiModel):
    id: int
    incident_status: IncidentStatus
    agency_status: AgencyStatus
    severity: Severity
    categories: list[Category]
    track: ReportTrack
    description: str
    address: str
    assigned_at: datetime
    updated_at: datetime


class AgencyIncidentList(ApiModel):
    items: list[AgencyIncidentItem]
    total: int


class AgencyStatusUpdate(ApiModel):
    status: AgencyStatus


class SupportRequest(ApiModel):
    target_agency_type: AgencyType
    reason: str = Field(min_length=1, max_length=1000)


class SupportResponse(ApiModel):
    incident_id: int
    requester_agency_type: AgencyType
    target_agency_type: AgencyType
    status: AgencyStatus


class SeverityUpdate(ApiModel):
    severity: Severity


class AgencyAddRequest(ApiModel):
    agency_type: AgencyType

