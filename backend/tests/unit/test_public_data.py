import pytest

from app.integrations.errors import PublicDataUnavailableError
from app.integrations.public_data import (
    BestEffortIncidentContextProvider,
    IncidentContext,
    NoopIncidentContextProvider,
)


class AvailableProvider:
    async def get_context(
        self, *, latitude: float, longitude: float
    ) -> list[IncidentContext]:
        return [
            IncidentContext(
                source="traffic",
                type="ROAD_CONTROL",
                summary=f"{latitude},{longitude}",
            )
        ]


class UnavailableProvider:
    async def get_context(
        self, *, latitude: float, longitude: float
    ) -> list[IncidentContext]:
        raise PublicDataUnavailableError("provider timeout")


@pytest.mark.asyncio
async def test_noop_provider_returns_no_context() -> None:
    provider = NoopIncidentContextProvider()

    assert await provider.get_context(latitude=37.5, longitude=127.0) == []


@pytest.mark.asyncio
async def test_best_effort_provider_preserves_available_context() -> None:
    provider = BestEffortIncidentContextProvider(AvailableProvider())

    contexts = await provider.get_context(latitude=37.5, longitude=127.0)

    assert contexts[0].source == "traffic"


@pytest.mark.asyncio
async def test_best_effort_provider_does_not_block_on_expected_failure() -> None:
    provider = BestEffortIncidentContextProvider(UnavailableProvider())

    assert await provider.get_context(latitude=37.5, longitude=127.0) == []
