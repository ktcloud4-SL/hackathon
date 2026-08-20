"""Object storage boundary consumed by the Report service."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class StoredObject:
    object_key: str


class ObjectStorage(Protocol):
    async def upload(
        self,
        *,
        content: bytes,
        filename: str,
        content_type: str,
    ) -> StoredObject: ...

    async def delete(self, object_key: str) -> None: ...
