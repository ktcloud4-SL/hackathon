from app.schemas.auth import AgencyType
from app.schemas.domain import Category, ReportTrack
from app.services.routing import derive_report_track, route_categories


def test_routing_deduplicates_agencies_and_preserves_rule_order() -> None:
    assert route_categories(
        [
            Category.TRAFFIC_ACCIDENT,
            Category.ROAD_DAMAGE,
            Category.HUMAN_INJURY,
            Category.FIRE_RISK,
        ]
    ) == [AgencyType.POLICE, AgencyType.ROAD, AgencyType.FIRE]


def test_animal_carcass_routes_only_to_local_government() -> None:
    assert route_categories([Category.ANIMAL_CARCASS]) == [AgencyType.LOCAL_GOV]


def test_report_track_is_derived_with_emergency_priority() -> None:
    assert derive_report_track([]) is None
    assert derive_report_track([Category.ROAD_DAMAGE]) is ReportTrack.CIVIC
    assert derive_report_track([Category.ANIMAL_CARCASS]) is ReportTrack.CIVIC
    assert derive_report_track(
        [Category.ANIMAL_CARCASS, Category.HUMAN_INJURY]
    ) is ReportTrack.EMERGENCY
