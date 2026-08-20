import pytest
from collections.abc import Iterator

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from tests.fakes import FakeUserRepository, StaticIncidentAccessChecker


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("JWT_SECRET", "integration-test-secret-at-least-32-bytes")
    monkeypatch.setenv("AUTH_COOKIE_SECURE", "false")
    get_settings.cache_clear()

    app = create_app()
    app.state.user_repository = FakeUserRepository()
    app.state.incident_access_checker = StaticIncidentAccessChecker(allowed=False)

    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()


def test_cookie_login_me_and_logout(client: TestClient) -> None:
    register_response = client.post(
        "/api/auth/register",
        json={
            "email": "citizen@example.com",
            "password": "password1234",
            "name": "홍길동",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/auth/login",
        json={"email": "citizen@example.com", "password": "password1234"},
    )
    assert login_response.status_code == 200
    assert "accessToken" not in login_response.json()
    assert "HttpOnly" in login_response.headers["set-cookie"]

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "citizen@example.com"

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_sse_access_uses_domain_access_checker(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={
            "email": "citizen@example.com",
            "password": "password1234",
            "name": "홍길동",
        },
    )
    client.post(
        "/api/auth/login",
        json={"email": "citizen@example.com", "password": "password1234"},
    )

    response = client.get("/api/incidents/42/events")

    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_blank_name_uses_common_validation_error(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "email": "citizen@example.com",
            "password": "password1234",
            "name": "   ",
        },
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
