import pytest

from app.schemas.auth import AgencyType
from app.schemas.domain import Category, ReportTrack, Severity
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
    assert result.track is None


@pytest.mark.parametrize(
    "description",
    [
        "도로에 동물 사체가 있어 통행에 불편하고 위험합니다.",
        "도로 위 로드킬을 신고합니다.",
        "길가에 죽은 동물이 있습니다.",
    ],
)
def test_analyzes_animal_carcass_as_civic_report(description: str) -> None:
    result = analyze_report(description=description, address="서울특별시 중구")

    assert result.categories == [Category.ANIMAL_CARCASS]
    assert result.track is ReportTrack.CIVIC
    assert result.severity is Severity.LOW
    assert result.suggested_agencies == [AgencyType.LOCAL_GOV]
    assert result.needs_user_confirmation is False


@pytest.mark.parametrize(
    "description",
    [
        "공원에서 동물을 목격했습니다.",
        "보고서에 사체라는 표현이 있습니다.",
    ],
)
def test_single_animal_or_carcass_words_do_not_trigger_animal_carcass(
    description: str,
) -> None:
    result = analyze_report(description=description, address="서울특별시 중구")

    assert Category.ANIMAL_CARCASS not in result.categories


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
    assert result.track is ReportTrack.EMERGENCY
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
    assert result.track is ReportTrack.CIVIC
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
    assert result.track is None
    assert result.analysis_method == "RULE"


def test_category_and_agency_results_are_deduplicated() -> None:
    result = analyze_report(
        description="차량과 자동차가 충돌한 교통사고로 도로에 낙하물이 있습니다.",
        address="서울특별시 중구",
    )

    assert result.categories == [Category.TRAFFIC_ACCIDENT, Category.ROAD_DAMAGE]
    assert len(result.categories) == len(set(result.categories))
    assert result.suggested_agencies == route_categories(result.categories)


def test_emergency_category_takes_priority_over_animal_carcass() -> None:
    result = analyze_report(
        description="도로에 동물 사체가 있고 사람이 다쳤습니다.",
        address="서울특별시 중구",
    )

    assert result.categories == [Category.HUMAN_INJURY, Category.ANIMAL_CARCASS]
    assert result.track is ReportTrack.EMERGENCY
    assert result.suggested_agencies == [AgencyType.FIRE, AgencyType.LOCAL_GOV]
