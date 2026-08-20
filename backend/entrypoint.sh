#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head || {
    echo "Migration failed, checking if retry needed..."
    sleep 2
    alembic upgrade head
}

echo "Seeding demo accounts..."
python seed.py || echo "Seed skipped or failed non-critically"

echo "Starting OneReport FastAPI application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
