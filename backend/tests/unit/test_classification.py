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
def test_ambiguous_words_do_not_trigger_specific_incident_categories(
    description: str,
) -> None:
    result = analyze_report(description=description, address="서울특별시 중구")

    assert result.categories == [Category.OTHER_CIVIC]
    assert result.suggested_agencies == [AgencyType.LOCAL_GOV]
    assert result.needs_user_confirmation is True
    assert result.track is ReportTrack.CIVIC


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
    ("description", "category"),
    [
        ("차가 부딪혔어요.", Category.TRAFFIC_ACCIDENT),
        ("차량끼리 충돌했어요.", Category.TRAFFIC_ACCIDENT),
        ("사람이 다쳤어요.", Category.HUMAN_INJURY),
        ("숨을 잘 못 쉬어요.", Category.HUMAN_INJURY),
        ("전기가 튀고 스파크가 나요.", Category.ELECTRIC_DAMAGE),
        ("합선된 것 같아요.", Category.ELECTRIC_DAMAGE),
        ("연기가 많이 나고 타는 냄새가 나요.", Category.FIRE_RISK),
        ("도로가 파이고 보도블록이 깨졌어요.", Category.ROAD_DAMAGE),
        ("아스팔트가 꺼져 도로에 구멍이 났어요.", Category.ROAD_DAMAGE),
        ("가스 배관이 깨져 가스 누출이 의심돼요.", Category.GAS_RISK),
        ("죽은 고양이가 도로에 있어요.", Category.ANIMAL_CARCASS),
        ("죽은 개가 방치돼 있어요.", Category.ANIMAL_CARCASS),
    ],
)
def test_analyzes_common_colloquial_phrases(
    description: str,
    category: Category,
) -> None:
    result = analyze_report(description=description, address="서울특별시 중구")

    assert category in result.categories
    assert Category.OTHER_CIVIC not in result.categories


@pytest.mark.parametrize(
    "description",
    [
        "공원에서 동물을 발견했습니다.",
        "사체라는 단어가 적힌 안내판이 훼손됐습니다.",
        "가스레인지가 오래됐습니다.",
        "불꽃놀이 소리가 너무 시끄럽습니다.",
        "전기요금이 너무 많이 나왔습니다.",
        "차를 사고 싶습니다.",
    ],
)
def test_common_words_do_not_create_false_positive_categories(description: str) -> None:
    result = analyze_report(description=description, address="서울특별시 중구")

    assert result.categories == [Category.OTHER_CIVIC]
    assert result.track is ReportTrack.CIVIC
    assert result.suggested_agencies == [AgencyType.LOCAL_GOV]


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


@pytest.mark.parametrize(
    "description",
    [
        "공원 벤치가 부서져 튀어나온 부분 때문에 위험합니다.",
        "놀이터 그네가 고장 나 아이들이 이용하기 위험합니다.",
        "골목에 쓰레기가 며칠째 쌓여 악취가 납니다.",
    ],
)
def test_general_public_report_uses_civic_fallback(description: str) -> None:
    result = analyze_report(
        description=description,
        address="서울특별시 중구",
    )

    assert result.categories == [Category.OTHER_CIVIC]
    assert result.suggested_agencies == [AgencyType.LOCAL_GOV]
    assert result.severity is Severity.LOW
    assert result.needs_user_confirmation is True
    assert result.track is ReportTrack.CIVIC
    assert result.analysis_method == "RULE"


@pytest.mark.parametrize("description", ["안녕하세요", "테스트", "ㅋㅋㅋ"])
def test_obviously_insufficient_text_does_not_claim_a_civic_match(
    description: str,
) -> None:
    result = analyze_report(description=description, address="서울특별시 중구")

    assert result.categories == []
    assert result.suggested_agencies == []
    assert result.confidence == 0.0
    assert result.reasons == []
    assert result.needs_user_confirmation is True
    assert result.track is None


def test_category_and_agency_results_are_deduplicated() -> None:
    result = analyze_report(
        description="차량과 자동차가 충돌한 교통사고로 도로에 낙하물이 있습니다.",
        address="서울특별시 중구",
    )

    assert result.categories == [Category.TRAFFIC_ACCIDENT, Category.ROAD_DAMAGE]
    assert len(result.categories) == len(set(result.categories))
    assert result.suggested_agencies == route_categories(result.categories)


def test_specific_category_takes_priority_over_other_civic() -> None:
    result = analyze_report(
        description="도로에 큰 포트홀이 생겨 차량이 지나가기 위험합니다.",
        address="서울특별시 중구",
    )

    assert result.categories == [Category.ROAD_DAMAGE]
    assert Category.OTHER_CIVIC not in result.categories


def test_emergency_category_takes_priority_over_animal_carcass() -> None:
    result = analyze_report(
        description="도로에 동물 사체가 있고 사람이 다쳤습니다.",
        address="서울특별시 중구",
    )

    assert result.categories == [Category.HUMAN_INJURY, Category.ANIMAL_CARCASS]
    assert result.track is ReportTrack.EMERGENCY
    assert result.suggested_agencies == [AgencyType.FIRE, AgencyType.LOCAL_GOV]
