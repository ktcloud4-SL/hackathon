"""Deterministic Category-to-Agency routing rules."""

from collections.abc import Iterable

from app.schemas.auth import AgencyType
from app.schemas.domain import Category, ReportTrack


AGENCIES_BY_CATEGORY: dict[Category, tuple[AgencyType, ...]] = {
    Category.TRAFFIC_ACCIDENT: (AgencyType.POLICE, AgencyType.ROAD),
    Category.HUMAN_INJURY: (AgencyType.FIRE,),
    Category.ELECTRIC_DAMAGE: (AgencyType.KEPCO,),
    Category.FIRE_RISK: (AgencyType.FIRE,),
    Category.ROAD_DAMAGE: (AgencyType.ROAD,),
    Category.GAS_RISK: (AgencyType.GAS,),
    Category.ANIMAL_CARCASS: (AgencyType.LOCAL_GOV,),
}

EMERGENCY_CATEGORIES: frozenset[Category] = frozenset(
    {
        Category.TRAFFIC_ACCIDENT,
        Category.HUMAN_INJURY,
        Category.ELECTRIC_DAMAGE,
        Category.FIRE_RISK,
        Category.GAS_RISK,
    }
)

CIVIC_CATEGORIES: frozenset[Category] = frozenset(
    {Category.ROAD_DAMAGE, Category.ANIMAL_CARCASS}
)


def derive_report_track(categories: Iterable[Category]) -> ReportTrack | None:
    """Derive a report track from final categories, with emergency taking priority."""

    detected = set(categories)
    if detected & EMERGENCY_CATEGORIES:
        return ReportTrack.EMERGENCY
    if detected and detected <= CIVIC_CATEGORIES:
        return ReportTrack.CIVIC
    return None


def route_categories(categories: Iterable[Category]) -> list[AgencyType]:
    """Return agencies once each, preserving category/rule order."""

    result: list[AgencyType] = []
    seen: set[AgencyType] = set()
    for category in categories:
        for agency_type in AGENCIES_BY_CATEGORY[category]:
            if agency_type not in seen:
                seen.add(agency_type)
                result.append(agency_type)
    return result
