"""Rule-based report analysis API schemas."""

from typing import Literal

from pydantic import Field, field_validator

from app.schemas import ApiModel
from app.schemas.auth import AgencyType
from app.schemas.domain import Category, ReportTrack, Severity


class ReportAnalysisRequest(ApiModel):
    description: str = Field(min_length=1, max_length=5000)
    address: str = Field(min_length=1, max_length=500)

    @field_validator("description", "address")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("공백만 입력할 수 없습니다.")
        return normalized


class ReportAnalysisResponse(ApiModel):
    categories: list[Category]
    track: ReportTrack | None
    severity: Severity
    suggested_agencies: list[AgencyType]
    summary: str
    confidence: float = Field(ge=0, le=1)
    reasons: list[str]
    needs_user_confirmation: bool
    analysis_method: Literal["RULE"] = "RULE"
