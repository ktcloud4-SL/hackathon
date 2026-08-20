"""Contract-level tests for the standalone deployed API smoke script."""

from __future__ import annotations

import importlib.util
import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import ModuleType
from urllib.parse import urlsplit

import pytest


def _load_script() -> ModuleType:
    path = Path(__file__).resolve().parents[3] / "scripts" / "demo-smoke.py"
    spec = importlib.util.spec_from_file_location("demo_smoke", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


smoke = _load_script()


class DemoApiHandler(BaseHTTPRequestHandler):
    fire_status = "ASSIGNED"
    gas_assigned = False
    severity = "MEDIUM"

    def log_message(self, _format: str, *_args: object) -> None:
        return

    def _json_body(self) -> dict[str, object]:
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def _send(self, status: int, payload: dict[str, object], cookie: str | None = None) -> None:
        encoded = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        if cookie:
            self.send_header("Set-Cookie", f"access_token={cookie}; HttpOnly; Path=/")
        self.end_headers()
        self.wfile.write(encoded)

    def _agencies(self) -> list[dict[str, str]]:
        items = [{"agencyType": "FIRE", "status": type(self).fire_status}]
        if type(self).gas_assigned:
            items.append({"agencyType": "GAS", "status": "ASSIGNED"})
        return items

    def _detail(self) -> dict[str, object]:
        return {"id": 321, "severity": type(self).severity, "agencies": self._agencies()}

    def do_GET(self) -> None:  # noqa: N802
        path = urlsplit(self.path).path
        if path == "/api/health":
            self._send(200, {"status": "ok"})
        elif path == "/api/auth/me":
            cookie = self.headers.get("Cookie", "")
            role = "CITIZEN" if "citizen" in cookie else "ADMIN" if "admin" in cookie else "AGENCY"
            email = {
                "CITIZEN": "citizen@onereport.com",
                "ADMIN": "admin@onereport.com",
                "AGENCY": "fire@onereport.com",
            }[role]
            self._send(200, {"email": email, "role": role})
        elif path == "/api/incidents/321":
            self._send(200, self._detail())
        elif path == "/api/incidents/321/timeline":
            self._send(
                200,
                {
                    "items": [
                        {
                            "type": "AGENCY_STATUS_CHANGED",
                            "metadata": {"agencyType": "FIRE", "status": type(self).fire_status},
                        }
                    ],
                    "total": 1,
                },
            )
        elif path == "/api/incidents":
            self._send(200, {"items": [self._detail()], "total": 1})
        else:
            self._send(404, {"message": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlsplit(self.path).path
        if path == "/api/auth/login":
            body = self._json_body()
            email = str(body["email"])
            if email.startswith("citizen"):
                user = {"email": email, "role": "CITIZEN", "agencyType": None}
                cookie = "citizen"
            elif email.startswith("fire"):
                user = {"email": email, "role": "AGENCY", "agencyType": "FIRE"}
                cookie = "fire"
            else:
                user = {"email": email, "role": "ADMIN", "agencyType": None}
                cookie = "admin"
            self._send(200, {"user": user}, cookie)
        elif path == "/api/reports":
            length = int(self.headers["Content-Length"])
            body = self.rfile.read(length)
            assert b"FIRE_RISK" in body
            self._send(
                201,
                {
                    "report": {"id": 123},
                    "incident": {"id": 321},
                    "agencies": [{"agencyType": "FIRE", "status": "ASSIGNED"}],
                },
            )
        elif path == "/api/incidents/321/support":
            assert self._json_body()["targetAgencyType"] == "GAS"
            type(self).gas_assigned = True
            self._send(200, {"targetAgencyType": "GAS", "status": "ASSIGNED"})
        else:
            self._send(404, {"message": "not found"})

    def do_PATCH(self) -> None:  # noqa: N802
        path = urlsplit(self.path).path
        body = self._json_body()
        if path == "/api/incidents/321/agencies/FIRE/status":
            type(self).fire_status = str(body["status"])
            self._send(200, self._detail())
        elif path == "/api/incidents/321/severity":
            type(self).severity = str(body["severity"])
            self._send(200, self._detail())
        else:
            self._send(404, {"message": "not found"})


@pytest.fixture
def demo_api() -> str:
    DemoApiHandler.fire_status = "ASSIGNED"
    DemoApiHandler.gas_assigned = False
    DemoApiHandler.severity = "MEDIUM"
    server = ThreadingHTTPServer(("127.0.0.1", 0), DemoApiHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def test_smoke_flow_uses_cookie_auth_and_current_api_contract(
    demo_api: str, capsys: pytest.CaptureFixture[str]
) -> None:
    smoke.run_smoke(smoke.SmokeConfig(base_url=demo_api, password="test-password"))

    output = capsys.readouterr().out
    assert "[PASS] Timeline FIRE DISPATCHED event verified" in output
    assert "[PASS] GAS support assignment verified" in output
    assert "[PASS] Admin severity: HIGH" in output
    assert "FINAL: PASS" in output
    assert DemoApiHandler.fire_status == "DISPATCHED"
    assert DemoApiHandler.gas_assigned is True
    assert DemoApiHandler.severity == "HIGH"


def test_main_returns_nonzero_and_prints_failure_for_unreachable_server(
    capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    def fail(_config: object) -> None:
        raise smoke.SmokeFailure("API health: HTTP 503")

    monkeypatch.setattr(smoke, "run_smoke", fail)
    result = smoke.main(["--base-url", "http://example.test", "--password", "secret"])

    assert result == 1
    error = capsys.readouterr().err
    assert "[FAIL] API health: HTTP 503" in error
    assert "FINAL: FAIL" in error
