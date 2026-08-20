from datetime import timedelta

import pytest

from app.core.config import Settings
from app.core.errors import AuthenticationRequiredError
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from tests.fakes import agency_user


def test_password_hash_round_trip() -> None:
    password_hash = hash_password("password1234")

    assert password_hash != "password1234"
    assert verify_password("password1234", password_hash)
    assert not verify_password("wrong-password", password_hash)


def test_access_token_round_trip() -> None:
    settings = Settings(jwt_secret="unit-test-secret-at-least-32-bytes")

    token = create_access_token(agency_user(), settings)
    claims = decode_access_token(token, settings)

    assert claims.sub == "10"
    assert claims.role.value == "AGENCY"
    assert claims.agency_type is not None
    assert claims.agency_type.value == "FIRE"


def test_expired_access_token_is_rejected() -> None:
    settings = Settings(jwt_secret="unit-test-secret-at-least-32-bytes")
    token = create_access_token(
        agency_user(), settings, expires_delta=timedelta(seconds=-1)
    )

    with pytest.raises(AuthenticationRequiredError):
        decode_access_token(token, settings)
