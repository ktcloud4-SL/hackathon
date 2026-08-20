"""Test-only environment defaults loaded before application imports."""

import os


os.environ.setdefault(
    "JWT_SECRET", "one-report-pytest-secret-at-least-32-bytes"
)
os.environ.setdefault("S3_BUCKET", "")
