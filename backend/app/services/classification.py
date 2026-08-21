"""Deterministic keyword-based report analysis."""

from dataclasses import dataclass

from app.schemas.analysis import ReportAnalysisResponse
from app.schemas.domain import Category, Severity
from app.services.routing import derive_report_track, route_categories


@dataclass(frozen=True)
class CategoryRule:
    category: Category
    label: str
    keywords: tuple[str, ...]


CATEGORY_RULES: tuple[CategoryRule, ...] = (
    CategoryRule(
        Category.TRAFFIC_ACCIDENT,
        "교통사고",
        (
            "교통사고",
            "차량 사고",
            "자동차 사고",
            "오토바이 사고",
            "보행자 사고",
            "차량 충돌",
            "자동차 충돌",
            "차가 충돌",
            "추돌",
            "차량 전복",
            "자동차 전복",
            "차가 전복",
            "전복 사고",
            "들이받",
            "차에 치",
            "교통 방해",
        ),
    ),
    CategoryRule(
        Category.HUMAN_INJURY,
        "인명 피해",
        (
            "부상",
            "다쳤",
            "다친",
            "피가 나",
            "피를 흘",
            "출혈",
            "쓰러",
            "의식이 없",
            "의식 없음",
            "의식을 잃",
            "의식 불명",
            "구조 요청",
            "구조가 필요",
            "구조 필요",
            "구조해",
            "갇혔",
            "고립",
        ),
    ),
    CategoryRule(
        Category.ELECTRIC_DAMAGE,
        "전기 설비 파손",
        (
            "전봇대",
            "전선",
            "정전",
            "감전",
            "변압기",
            "전기 시설",
            "전기 설비",
            "전기 사고",
            "전기 위험",
            "전기가 끊",
        ),
    ),
    CategoryRule(
        Category.FIRE_RISK,
        "화재 위험",
        (
            "화재",
            "불꽃",
            "불길이",
            "불이 나",
            "불이 났",
            "불이 붙",
            "불이 번",
            "불났",
            "검은 연기",
            "연기가 나",
            "연기가 보",
            "연기가 자욱",
            "연기 발생",
            "연기 냄새",
            "폭발",
        ),
    ),
    CategoryRule(
        Category.ROAD_DAMAGE,
        "도로 파손",
        (
            "포트홀",
            "싱크홀",
            "도로 파손",
            "도로가 꺼",
            "도로 균열",
            "낙하물",
            "교량 파손",
        ),
    ),
    CategoryRule(
        Category.GAS_RISK,
        "가스 위험",
        (
            "가스 냄새",
            "가스냄새",
            "가스 누출",
            "가스가 새",
            "가스 새",
            "가스 배관",
            "가스관 파손",
            "lpg 누출",
        ),
    ),
    CategoryRule(
        Category.ANIMAL_CARCASS,
        "동물 사체",
        (
            "동물 사체",
            "동물사체",
            "로드킬",
            "죽은 동물",
        ),
    ),
)


def _recommend_severity(categories: list[Category]) -> Severity:
    if not categories:
        return Severity.MEDIUM

    detected = set(categories)
    has_human_with_other_risk = Category.HUMAN_INJURY in detected and len(detected) >= 2
    has_fire_and_gas = {
        Category.FIRE_RISK,
        Category.GAS_RISK,
    }.issubset(detected)
    if has_human_with_other_risk or has_fire_and_gas or len(detected) >= 3:
        return Severity.HIGH

    elevated_categories = {
        Category.HUMAN_INJURY,
        Category.ELECTRIC_DAMAGE,
        Category.FIRE_RISK,
        Category.GAS_RISK,
    }
    if detected & elevated_categories or len(detected) >= 2:
        return Severity.MEDIUM
    return Severity.LOW


def analyze_report(*, description: str, address: str) -> ReportAnalysisResponse:
    """Analyze report text without creating or mutating domain data."""

    del address  # Reserved for future location-aware rules.
    normalized = description.casefold()
    categories: list[Category] = []
    reasons: list[str] = []
    labels: list[str] = []
    matched_keyword_count = 0

    for rule in CATEGORY_RULES:
        matched = [
            keyword for keyword in rule.keywords if keyword.casefold() in normalized
        ]
        if not matched:
            continue
        categories.append(rule.category)
        labels.append(rule.label)
        matched_keyword_count += len(matched)
        reasons.append(
            f"{', '.join(matched[:3])} 표현에서 {rule.label} 가능성을 감지했습니다."
        )

    if not categories:
        return ReportAnalysisResponse(
            categories=[],
            track=None,
            severity=Severity.MEDIUM,
            suggested_agencies=[],
            summary="자동으로 사고 유형을 분류하지 못했습니다. 사고 유형을 직접 확인해 주세요.",
            confidence=0.0,
            reasons=[],
            needs_user_confirmation=True,
        )

    confidence = min(
        0.95,
        0.55 + 0.08 * len(categories) + 0.03 * matched_keyword_count,
    )
    if len(categories) == 1:
        summary = f"{labels[0]} 관련 상황으로 분석했습니다."
    else:
        summary = f"{', '.join(labels)} 요소가 함께 감지된 복합 상황입니다."

    return ReportAnalysisResponse(
        categories=categories,
        track=derive_report_track(categories),
        severity=_recommend_severity(categories),
        suggested_agencies=route_categories(categories),
        summary=summary,
        confidence=round(confidence, 2),
        reasons=reasons,
        needs_user_confirmation=False,
    )
