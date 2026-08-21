"""Authentication request, response, and token schemas."""

from enum import Enum

from pydantic import EmailStr, Field, field_validator

from app.schemas import ApiModel


class UserRole(str, Enum):
    CITIZEN = "CITIZEN"
    AGENCY = "AGENCY"
    ADMIN = "ADMIN"


class AgencyType(str, Enum):
    POLICE = "POLICE"
    FIRE = "FIRE"
    KEPCO = "KEPCO"
    ROAD = "ROAD"
    GAS = "GAS"
    LOCAL_GOV = "LOCAL_GOV"


class RegisterRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("이름을 입력해 주세요.")
        return normalized


class LoginRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserPublic(ApiModel):
    id: int
    email: EmailStr
    name: str
    role: UserRole
    agency_type: AgencyType | None = None


class AuthResponse(ApiModel):
    user: UserPublic


class TokenClaims(ApiModel):
    sub: str
    role: UserRole
    agency_type: AgencyType | None = None
    iat: int
    exp: int
