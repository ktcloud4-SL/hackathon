"""Public incident-context data boundary."""

import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

from app.integrations.errors import PublicDataUnavailableError


logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class IncidentContext:
    source: str
    type: str
    summary: str
    metadata: dict[str, Any] = field(default_factory=dict)


class IncidentContextProvider(Protocol):
    async def get_context(
        self,
        *,
        latitude: float,
        longitude: float,
    ) -> list[IncidentContext]: ...


class NoopIncidentContextProvider:
    async def get_context(
        self,
        *,
        latitude: float,
        longitude: float,
    ) -> list[IncidentContext]:
        del latitude, longitude
        return []


class BestEffortIncidentContextProvider:
    """Keep optional context failures from blocking Incident creation."""

    def __init__(self, provider: IncidentContextProvider) -> None:
        self._provider = provider

    async def get_context(
        self,
        *,
        latitude: float,
        longitude: float,
    ) -> list[IncidentContext]:
        try:
            return await self._provider.get_context(
                latitude=latitude,
                longitude=longitude,
            )
        except PublicDataUnavailableError as exc:
            logger.warning("Optional Incident context unavailable: %s", exc)
            return []
