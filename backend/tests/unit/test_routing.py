from app.schemas.auth import AgencyType
from app.schemas.domain import Category
from app.services.routing import route_categories


def test_routing_deduplicates_agencies_and_preserves_rule_order() -> None:
    assert route_categories(
        [
            Category.TRAFFIC_ACCIDENT,
            Category.ROAD_DAMAGE,
            Category.HUMAN_INJURY,
            Category.FIRE_RISK,
        ]
    ) == [AgencyType.POLICE, AgencyType.ROAD, AgencyType.FIRE]
