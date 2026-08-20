#!/usr/bin/env python3
"""Run the deployed OneReport demo API flow without external dependencies."""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import uuid
from dataclasses import dataclass
from http.cookiejar import CookieJar
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener


class SmokeFailure(RuntimeError):
    """Raised when a smoke-test assertion or HTTP request fails."""


@dataclass(frozen=True)
class SmokeConfig:
    base_url: str
    password: str
    citizen_email: str = "citizen@onereport.com"
    fire_email: str = "fire@onereport.com"
    admin_email: str = "admin@onereport.com"
    timeout: float = 10.0
    include_optional: bool = True


@dataclass(frozen=True)
class MultipartFile:
    field_name: str
    filename: str
    content_type: str
    content: bytes


SMOKE_DESCRIPTION = (
    "차량이 전봇대를 들이받았고 사람이 다쳤으며 전선에서 불꽃이 납니다."
)
SMOKE_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB99Y9ZQAAAABJRU5ErkJggg=="
)


class ApiClient:
    def __init__(self, base_url: str, timeout: float) -> None:
        normalized = base_url.rstrip("/")
        if normalized.endswith("/api"):
            normalized = normalized[:-4]
        self.base_url = normalized
        self.timeout = timeout
        self.opener = build_opener(HTTPCookieProcessor(CookieJar()))

    def request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
        form_fields: list[tuple[str, str]] | None = None,
        form_files: list[MultipartFile] | None = None,
        expected_status: int = 200,
    ) -> Any:
        headers = {
            "Accept": "application/json",
            "User-Agent": "OneReport-Demo-Smoke/1.0",
        }
        body: bytes | None = None
        if json_body is not None:
            body = json.dumps(json_body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif form_fields is not None or form_files is not None:
            body, content_type = _multipart_body(form_fields or [], form_files or [])
            headers["Content-Type"] = content_type

        request = Request(
            f"{self.base_url}/api{path}", data=body, headers=headers, method=method
        )
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                payload = response.read()
                if response.status != expected_status:
                    raise SmokeFailure(
                        f"{method} {path}: expected HTTP {expected_status}, got {response.status}"
                    )
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            raise SmokeFailure(
                f"{method} {path}: HTTP {exc.code}; response={detail or '<empty>'}"
            ) from exc
        except URLError as exc:
            raise SmokeFailure(f"{method} {path}: connection failed: {exc.reason}") from exc

        if not payload:
            return None
        try:
            return json.loads(payload)
        except json.JSONDecodeError as exc:
            raise SmokeFailure(f"{method} {path}: response is not valid JSON") from exc

    def get_bytes(self, url: str, *, label: str) -> tuple[bytes, str]:
        request = Request(
            url,
            headers={
                "Accept": "image/*",
                "User-Agent": "OneReport-Demo-Smoke/1.0",
            },
            method="GET",
        )
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                payload = response.read()
                if response.status != 200:
                    raise SmokeFailure(
                        f"{label}: expected HTTP 200, got {response.status}"
                    )
                return payload, response.headers.get("Content-Type", "")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            raise SmokeFailure(
                f"{label}: HTTP {exc.code}; response={detail or '<empty>'}"
            ) from exc
        except URLError as exc:
            raise SmokeFailure(f"{label}: connection failed: {exc.reason}") from exc


def _multipart_body(
    fields: list[tuple[str, str]], files: list[MultipartFile]
) -> tuple[bytes, str]:
    boundary = f"----OneReportSmoke{uuid.uuid4().hex}"
    chunks: list[bytes] = []
    for name, value in fields:
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                value.encode("utf-8"),
                b"\r\n",
            ]
        )
    for file in files:
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                (
                    f'Content-Disposition: form-data; name="{file.field_name}"; '
                    f'filename="{file.filename}"\r\n'
                ).encode(),
                f"Content-Type: {file.content_type}\r\n\r\n".encode(),
                file.content,
                b"\r\n",
            ]
        )
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise SmokeFailure(message)


def _pass(message: str) -> None:
    print(f"[PASS] {message}")


def _login(client: ApiClient, email: str, password: str, role: str) -> dict[str, Any]:
    response = client.request(
        "POST", "/auth/login", json_body={"email": email, "password": password}
    )
    user = response.get("user", {})
    _require(user.get("email") == email, f"Login returned an unexpected user for {email}")
    _require(user.get("role") == role, f"Login returned role {user.get('role')}, expected {role}")
    return user


def run_smoke(config: SmokeConfig) -> None:
    health_client = ApiClient(config.base_url, config.timeout)
    health = health_client.request("GET", "/health")
    _require(health == {"status": "ok"}, f"Unexpected health response: {health}")
    _pass("API health")

    citizen = ApiClient(config.base_url, config.timeout)
    _login(citizen, config.citizen_email, config.password, "CITIZEN")
    _pass("Citizen login")

    me = citizen.request("GET", "/auth/me")
    _require(
        me.get("email") == config.citizen_email,
        "Citizen auth cookie was not retained",
    )
    _require(me.get("role") == "CITIZEN", "Authenticated user is not a citizen")
    _pass("Citizen authentication")

    analysis = citizen.request(
        "POST",
        "/analyze-report",
        json_body={
            "description": SMOKE_DESCRIPTION,
            "address": "서울특별시 중구 세종대로 110",
        },
    )
    _require(
        analysis.get("analysisMethod") == "RULE",
        f"Report analysis method is not RULE: {analysis.get('analysisMethod')}",
    )
    categories = analysis.get("categories")
    _require(
        isinstance(categories, list)
        and len(categories) > 1
        and all(isinstance(category, str) for category in categories),
        f"Report analysis did not detect multiple categories: {categories}",
    )
    suggested_agencies = analysis.get("suggestedAgencies")
    _require(
        isinstance(suggested_agencies, list)
        and bool(suggested_agencies)
        and all(isinstance(agency, str) for agency in suggested_agencies),
        f"Report analysis returned no suggested agencies: {suggested_agencies}",
    )
    _require(
        analysis.get("needsUserConfirmation") is False,
        "Report analysis unexpectedly requires user confirmation",
    )
    severity = analysis.get("severity")
    _require(
        isinstance(severity, str) and bool(severity),
        "Report analysis has no severity",
    )
    _pass("Report analysis: RULE")
    _pass(f"Categories: {', '.join(categories)}")
    _pass(f"Suggested agencies: {', '.join(suggested_agencies)}")

    created = citizen.request(
        "POST",
        "/reports",
        form_fields=[
            ("description", SMOKE_DESCRIPTION),
            ("address", "서울특별시 중구 세종대로 110"),
            ("latitude", "37.5665"),
            ("longitude", "126.9780"),
            *(("categories", category) for category in categories),
            ("severity", severity),
        ],
        form_files=[
            MultipartFile(
                field_name="image",
                filename="demo-smoke.png",
                content_type="image/png",
                content=SMOKE_PNG,
            )
        ],
        expected_status=201,
    )
    incident_id = created.get("incident", {}).get("id")
    _require(
        isinstance(incident_id, int) and incident_id > 0,
        "Report response has no incident ID",
    )
    _pass(f"Report created: incident #{incident_id}")

    created_agencies = created.get("agencies", [])
    assigned_types = [item.get("agencyType") for item in created_agencies]
    _require(
        set(assigned_types) == set(suggested_agencies),
        "Incident routing does not match analysis: "
        f"assigned={assigned_types}, suggested={suggested_agencies}",
    )
    _pass("Incident routing matches analysis")
    _pass(f"Agencies assigned: {', '.join(assigned_types)}")

    created_image_url = created.get("report", {}).get("imageUrl")
    _require(
        isinstance(created_image_url, str) and bool(created_image_url),
        "Report response has no presigned image URL",
    )
    _pass("S3 image uploaded")

    detail = citizen.request("GET", f"/incidents/{incident_id}")
    _require(
        detail.get("id") == incident_id,
        "Incident detail ID does not match created incident",
    )
    detail_assigned_types = [
        item.get("agencyType") for item in detail.get("agencies", [])
    ]
    _require(
        set(detail_assigned_types) == set(suggested_agencies),
        "Incident detail routing does not match analysis: "
        f"assigned={detail_assigned_types}, suggested={suggested_agencies}",
    )
    _require(
        any(item.get("agencyType") == "FIRE" for item in detail.get("agencies", [])),
        "Incident detail does not contain FIRE assignment",
    )
    detail_image_url = detail.get("report", {}).get("imageUrl")
    _require(
        isinstance(detail_image_url, str) and bool(detail_image_url),
        "Incident detail has no presigned image URL",
    )
    image_content, image_content_type = citizen.get_bytes(
        detail_image_url,
        label="Presigned image GET",
    )
    _require(bool(image_content), "Presigned image GET returned an empty body")
    _require(
        image_content_type.lower().startswith("image/"),
        f"Presigned image Content-Type is not an image: {image_content_type or '<missing>'}",
    )
    _pass(f"Presigned image GET 200 ({image_content_type})")
    _pass("Citizen incident lookup")

    fire = ApiClient(config.base_url, config.timeout)
    fire_user = _login(fire, config.fire_email, config.password, "AGENCY")
    _require(fire_user.get("agencyType") == "FIRE", "Demo FIRE account is not linked to FIRE")
    _pass("FIRE login")

    for status in ("RECEIVED", "DISPATCHED"):
        updated = fire.request(
            "PATCH",
            f"/incidents/{incident_id}/agencies/FIRE/status",
            json_body={"status": status},
        )
        fire_assignment = next(
            (item for item in updated.get("agencies", []) if item.get("agencyType") == "FIRE"),
            None,
        )
        _require(
            fire_assignment is not None and fire_assignment.get("status") == status,
            f"FIRE status did not change to {status}",
        )
        _pass(f"FIRE status: {status}")

    timeline = fire.request("GET", f"/incidents/{incident_id}/timeline")
    events = timeline.get("items", [])
    _require(timeline.get("total") == len(events), "Timeline total does not match item count")
    _require(
        any(
            event.get("type") == "AGENCY_STATUS_CHANGED"
            and event.get("metadata", {}).get("agencyType") == "FIRE"
            and event.get("metadata", {}).get("status") == "DISPATCHED"
            for event in events
        ),
        "Timeline has no FIRE DISPATCHED status event",
    )
    _pass("Timeline FIRE DISPATCHED event verified")

    if config.include_optional:
        support = fire.request(
            "POST",
            f"/incidents/{incident_id}/support",
            json_body={
                "targetAgencyType": "GAS",
                "reason": "발표 전 자동 점검용 가스기관 지원 요청입니다.",
            },
        )
        _require(support.get("targetAgencyType") == "GAS", "Support response target is not GAS")
        _require(support.get("status") == "ASSIGNED", "GAS support was not assigned")
        supported_detail = fire.request("GET", f"/incidents/{incident_id}")
        _require(
            any(
                item.get("agencyType") == "GAS" and item.get("status") == "ASSIGNED"
                for item in supported_detail.get("agencies", [])
            ),
            "Incident detail does not contain assigned GAS support",
        )
        _pass("GAS support assignment verified")

    admin = ApiClient(config.base_url, config.timeout)
    _login(admin, config.admin_email, config.password, "ADMIN")
    _pass("Admin login")

    incident_list = admin.request("GET", "/incidents")
    _require(
        any(item.get("id") == incident_id for item in incident_list.get("items", [])),
        f"Admin incident list does not contain #{incident_id}",
    )
    admin_detail = admin.request("GET", f"/incidents/{incident_id}")
    _require(admin_detail.get("id") == incident_id, "Admin incident lookup returned another incident")
    _pass("Admin incident lookup")

    if config.include_optional:
        severity_detail = admin.request(
            "PATCH",
            f"/incidents/{incident_id}/severity",
            json_body={"severity": "HIGH"},
        )
        _require(severity_detail.get("severity") == "HIGH", "Severity did not change to HIGH")
        _pass("Admin severity: HIGH")

    print("\nFINAL: PASS")


def parse_args(argv: list[str] | None = None) -> SmokeConfig:
    parser = argparse.ArgumentParser(
        description="Run the OneReport deployed API demo smoke test."
    )
    parser.add_argument("--base-url", required=True, help="Service origin, e.g. http://localhost")
    parser.add_argument(
        "--password",
        default=os.getenv("ONEREPORT_DEMO_PASSWORD"),
        help="Demo password (default: ONEREPORT_DEMO_PASSWORD)",
    )
    parser.add_argument(
        "--citizen-email",
        default=os.getenv("ONEREPORT_CITIZEN_EMAIL", "citizen@onereport.com"),
    )
    parser.add_argument(
        "--fire-email", default=os.getenv("ONEREPORT_FIRE_EMAIL", "fire@onereport.com")
    )
    parser.add_argument(
        "--admin-email", default=os.getenv("ONEREPORT_ADMIN_EMAIL", "admin@onereport.com")
    )
    parser.add_argument("--timeout", type=float, default=10.0)
    parser.add_argument(
        "--skip-optional",
        action="store_true",
        help="Skip GAS support assignment and admin severity change",
    )
    args = parser.parse_args(argv)
    if not args.password:
        parser.error("set ONEREPORT_DEMO_PASSWORD or pass --password")
    if args.timeout <= 0:
        parser.error("--timeout must be greater than zero")
    return SmokeConfig(
        base_url=args.base_url,
        password=args.password,
        citizen_email=args.citizen_email,
        fire_email=args.fire_email,
        admin_email=args.admin_email,
        timeout=args.timeout,
        include_optional=not args.skip_optional,
    )


def main(argv: list[str] | None = None) -> int:
    try:
        run_smoke(parse_args(argv))
    except SmokeFailure as exc:
        print(f"[FAIL] {exc}", file=sys.stderr)
        print("\nFINAL: FAIL", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("[FAIL] Interrupted", file=sys.stderr)
        print("\nFINAL: FAIL", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"[FAIL] Unexpected error: {exc}", file=sys.stderr)
        print("\nFINAL: FAIL", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
