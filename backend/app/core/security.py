"""Password hashing and JWT helpers."""

from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from pwdlib import PasswordHash

from app.core.config import Settings
from app.core.errors import AuthenticationRequiredError
from app.schemas.auth import TokenClaims
from app.services.auth import UserAuthRecord


_password_hash = PasswordHash.recommended()
_dummy_password_hash = _password_hash.hash("one-report-dummy-password")


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _password_hash.verify(password, password_hash)


def consume_dummy_password_check(password: str) -> None:
    """Keep unknown-user login timing close to a normal password check."""

    _password_hash.verify(password, _dummy_password_hash)


def create_access_token(
    user: UserAuthRecord,
    settings: Settings,
    expires_delta: timedelta | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {
        "sub": str(user.id),
        "role": user.role.value,
        "agencyType": user.agency_type.value if user.agency_type else None,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(
        payload,
        settings.jwt_secret.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str, settings: Settings) -> TokenClaims:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "iat", "exp"]},
        )
        return TokenClaims.model_validate(payload)
    except (InvalidTokenError, ValidationError, ValueError) as exc:
        raise AuthenticationRequiredError("유효하지 않거나 만료된 인증 정보입니다.") from exc
