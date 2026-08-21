import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


def test_analyze_report_response_schema(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "integration-test-secret-at-least-32-bytes")
    get_settings.cache_clear()


def test_analyze_report_returns_confirmable_public_report_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("JWT_SECRET", "integration-test-secret-at-least-32-bytes")
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/analyze-report",
            json={
                "description": "공원 벤치가 부서져 튀어나온 부분 때문에 위험합니다.",
                "address": "서울특별시 중구",
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "categories": ["OTHER_CIVIC"],
        "track": "CIVIC",
        "severity": "LOW",
        "suggestedAgencies": ["LOCAL_GOV"],
        "summary": "구체 유형에 정확히 일치하지 않는 생활·공공신고로 분석했습니다.",
        "confidence": 0.35,
        "reasons": ["관할 기관에서 신고 내용을 확인한 뒤 담당부서로 연결합니다."],
        "needsUserConfirmation": True,
        "analysisMethod": "RULE",
    }
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/analyze-report",
            json={
                "description": "차량이 전봇대를 들이받았고 사람이 다쳤으며 전선에서 불꽃이 납니다.",
                "address": "서울특별시 강남구 테헤란로 1",
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "categories": [
            "TRAFFIC_ACCIDENT",
            "HUMAN_INJURY",
            "ELECTRIC_DAMAGE",
            "FIRE_RISK",
        ],
        "track": "EMERGENCY",
        "severity": "HIGH",
        "suggestedAgencies": ["POLICE", "ROAD", "FIRE", "KEPCO"],
        "summary": "교통사고, 인명 피해, 전기 설비 파손, 화재 위험 요소가 함께 감지된 복합 상황입니다.",
        "confidence": 0.95,
        "reasons": [
            "들이받 표현에서 교통사고 가능성을 감지했습니다.",
            "다쳤 표현에서 인명 피해 가능성을 감지했습니다.",
            "전봇대, 전선 표현에서 전기 설비 파손 가능성을 감지했습니다.",
            "불꽃 표현에서 화재 위험 가능성을 감지했습니다.",
        ],
        "needsUserConfirmation": False,
        "analysisMethod": "RULE",
    }
    get_settings.cache_clear()
