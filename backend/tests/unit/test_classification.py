import pytest

from app.schemas.auth import AgencyType
from app.schemas.domain import Category, Severity
from app.services.classification import analyze_report
from app.services.routing import route_categories


@pytest.mark.parametrize(
    "description",
    [
        "불법 주정차 차량을 신고합니다.",
        "생활에 너무 불편합니다.",
        "건물 구조가 위험해 보입니다.",
        "행사가 연기되었습니다.",
        "가스레인지가 고장났습니다.",
    ],
)
def test_ambiguous_words_do_not_trigger_incident_categories(description: str) -> None:
    result = analyze_report(description=description, address="서울특별시 중구")

    assert result.categories == []
    assert result.suggested_agencies == []
    assert result.needs_user_confirmation is True


def test_analyzes_compound_traffic_injury_electric_and_fire_report() -> None:
    result = analyze_report(
        description="차량이 전봇대를 들이받았고 사람이 다쳤으며 전선에서 불꽃이 납니다.",
        address="서울특별시 강남구 테헤란로 1",
    )

    assert result.categories == [
        Category.TRAFFIC_ACCIDENT,
        Category.HUMAN_INJURY,
        Category.ELECTRIC_DAMAGE,
        Category.FIRE_RISK,
    ]
    assert result.severity is Severity.HIGH
    assert result.suggested_agencies == [
        AgencyType.POLICE,
        AgencyType.ROAD,
        AgencyType.FIRE,
        AgencyType.KEPCO,
    ]
    assert result.needs_user_confirmation is False


def test_analyzes_road_damage() -> None:
    result = analyze_report(
        description="도로에 큰 포트홀이 생겼습니다.",
        address="서울특별시 중구",
    )

    assert result.categories == [Category.ROAD_DAMAGE]
    assert result.severity is Severity.LOW
    assert result.suggested_agencies == [AgencyType.ROAD]


def test_analyzes_gas_risk() -> None:
    result = analyze_report(
        description="가스 냄새가 심하게 납니다.",
        address="서울특별시 중구",
    )

    assert result.categories == [Category.GAS_RISK]
    assert result.severity is Severity.MEDIUM
    assert result.suggested_agencies == [AgencyType.GAS]


def test_analyzes_unconscious_person_as_human_injury() -> None:
    result = analyze_report(
        description="사람이 쓰러져 의식이 없습니다.",
        address="서울특별시 중구",
    )

    assert result.categories == [Category.HUMAN_INJURY]
    assert result.severity is Severity.MEDIUM
    assert result.suggested_agencies == [AgencyType.FIRE]


def test_unclassified_report_requires_manual_confirmation() -> None:
    result = analyze_report(
        description="무슨 상황인지 잘 모르겠습니다.",
        address="서울특별시 중구",
    )

    assert result.categories == []
    assert result.suggested_agencies == []
    assert result.confidence == 0.0
    assert result.reasons == []
    assert result.needs_user_confirmation is True
    assert result.analysis_method == "RULE"


def test_category_and_agency_results_are_deduplicated() -> None:
    result = analyze_report(
        description="차량과 자동차가 충돌한 교통사고로 도로에 낙하물이 있습니다.",
        address="서울특별시 중구",
    )

    assert result.categories == [Category.TRAFFIC_ACCIDENT, Category.ROAD_DAMAGE]
    assert len(result.categories) == len(set(result.categories))
    assert result.suggested_agencies == route_categories(result.categories)
