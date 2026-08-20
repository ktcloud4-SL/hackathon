"""In-process Incident SSE subscription and broadcast service."""

import asyncio
import json
from collections import defaultdict
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from fastapi import Request

from app.schemas.event import SSEMessage


def encode_sse(message: SSEMessage) -> str:
    payload = json.dumps(
        message.data.model_dump(by_alias=True, mode="json"),
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return f"event: {message.event}\nid: {message.id}\ndata: {payload}\n\n"


class SSEBroker:
    """Single-process broker used by the MVP's one Backend replica."""

    def __init__(self, heartbeat_seconds: float = 15.0, queue_size: int = 100) -> None:
        self._heartbeat_seconds = heartbeat_seconds
        self._queue_size = queue_size
        self._subscribers: dict[int, set[asyncio.Queue[SSEMessage]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    @asynccontextmanager
    async def subscribe(
        self, incident_id: int
    ) -> AsyncIterator[asyncio.Queue[SSEMessage]]:
        queue: asyncio.Queue[SSEMessage] = asyncio.Queue(maxsize=self._queue_size)
        async with self._lock:
            self._subscribers[incident_id].add(queue)
        try:
            yield queue
        finally:
            async with self._lock:
                subscribers = self._subscribers.get(incident_id)
                if subscribers is not None:
                    subscribers.discard(queue)
                    if not subscribers:
                        self._subscribers.pop(incident_id, None)

    async def publish(self, incident_id: int, message: SSEMessage) -> int:
        async with self._lock:
            subscribers = tuple(self._subscribers.get(incident_id, ()))

        for queue in subscribers:
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            queue.put_nowait(message)
        return len(subscribers)

    async def stream(self, request: Request, incident_id: int) -> AsyncIterator[str]:
        async with self.subscribe(incident_id) as queue:
            while True:
                if await request.is_disconnected():
                    return
                try:
                    message = await asyncio.wait_for(
                        queue.get(), timeout=self._heartbeat_seconds
                    )
                except TimeoutError:
                    yield ": heartbeat\n\n"
                    continue
                yield encode_sse(message)
