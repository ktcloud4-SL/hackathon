"""Report analysis endpoints."""

from fastapi import APIRouter

from app.schemas.analysis import ReportAnalysisRequest, ReportAnalysisResponse
from app.services.classification import analyze_report


router = APIRouter(tags=["analysis"])


@router.post("/analyze-report", response_model=ReportAnalysisResponse)
async def analyze_report_route(
    body: ReportAnalysisRequest,
) -> ReportAnalysisResponse:
    return analyze_report(description=body.description, address=body.address)
