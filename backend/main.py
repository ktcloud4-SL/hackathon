import asyncio
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI(
    title="OneReport Backend API Skeleton",
    version="1.0.0",
    description="OneReport Coordination Layer Backend Skeleton"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "OneReport Backend API",
        "version": "1.0.0",
        "status": "online"
    }

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "onereport-backend",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

@app.get("/api/incidents/{incident_id}/events")
async def incident_events_stream(incident_id: int):
    """
    Mock SSE stream for testing Nginx unbuffered streaming & client connectivity.
    """
    async def event_generator():
        count = 0
        while True:
            count += 1
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            data = (
                f"event: ping\n"
                f"id: {count}\n"
                f'data: {{"type": "PING", "incidentId": {incident_id}, "count": {count}, "timestamp": "{now_iso}"}}\n\n'
            )
            yield data
            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
