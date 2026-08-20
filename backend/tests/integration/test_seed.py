from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import seed as seed_module
from app.core.security import hash_password, verify_password
from app.models import Agency, User


DEMO_PASSWORD = "Password123!"
EXPECTED_ACCOUNTS = {
    "citizen@onereport.com": ("CITIZEN", None),
    "police@onereport.com": ("AGENCY", "POLICE"),
    "fire@onereport.com": ("AGENCY", "FIRE"),
    "kepco@onereport.com": ("AGENCY", "KEPCO"),
    "road@onereport.com": ("AGENCY", "ROAD"),
    "gas@onereport.com": ("AGENCY", "GAS"),
    "admin@onereport.com": ("ADMIN", None),
}


async def _create_seed_database(database_path: Path) -> str:
    database_url = f"sqlite+aiosqlite:///{database_path.as_posix()}"
    engine = create_async_engine(database_url)
    async with engine.begin() as connection:
        await connection.execute(
            text(
                """
                CREATE TABLE agencies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code VARCHAR(32) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL
                )
                """
            )
        )
        await connection.execute(
            text(
                """
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agency_id INTEGER REFERENCES agencies(id),
                    email VARCHAR(320) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    role VARCHAR(20) NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add_all(
            [
                Agency(code=code, name=name)
                for code, name in {
                    "POLICE": "경찰",
                    "FIRE": "소방",
                    "KEPCO": "한국전력",
                    "ROAD": "도로관리기관",
                    "GAS": "가스안전기관",
                }.items()
            ]
        )
        await session.commit()
    await engine.dispose()
    return database_url


async def _load_users(database_url: str) -> list[User]:
    engine = create_async_engine(database_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        users = list((await session.scalars(select(User).order_by(User.email))).all())
    await engine.dispose()
    return users


@pytest.mark.asyncio
async def test_seed_creates_all_demo_accounts_with_agencies_and_password(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    database_url = await _create_seed_database(tmp_path / "seed.db")
    monkeypatch.setattr(
        seed_module,
        "get_settings",
        lambda: SimpleNamespace(database_url=database_url),
    )

    await seed_module.seed()

    users = await _load_users(database_url)
    assert len(users) == 7
    assert {user.email for user in users} == set(EXPECTED_ACCOUNTS)
    for user in users:
        expected_role, expected_agency = EXPECTED_ACCOUNTS[user.email]
        assert user.role == expected_role
        assert (user.agency.code if user.agency else None) == expected_agency
        assert verify_password(DEMO_PASSWORD, user.password_hash)


@pytest.mark.asyncio
async def test_seed_is_idempotent_and_updates_an_existing_demo_account(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    database_url = await _create_seed_database(tmp_path / "seed-existing.db")
    engine = create_async_engine(database_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        fire_agency_id = await session.scalar(
            select(Agency.id).where(Agency.code == "FIRE")
        )
        existing = User(
            email="police@onereport.com",
            name="기존 이름",
            password_hash=hash_password("OldPassword123!"),
            role="AGENCY",
            agency_id=fire_agency_id,
        )
        session.add(existing)
        await session.commit()
        existing_id = existing.id
    await engine.dispose()
    monkeypatch.setattr(
        seed_module,
        "get_settings",
        lambda: SimpleNamespace(database_url=database_url),
    )

    await seed_module.seed()
    await seed_module.seed()

    engine = create_async_engine(database_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        user_count = await session.scalar(select(func.count()).select_from(User))
        police_accounts = list(
            (
                await session.scalars(
                    select(User).where(User.email == "police@onereport.com")
                )
            ).all()
        )
        assert user_count == 7
        assert len(police_accounts) == 1
        police = police_accounts[0]
        assert police.id == existing_id
        assert police.name == "경찰청 상황실"
        assert police.role == "AGENCY"
        assert police.agency is not None
        assert police.agency.code == "POLICE"
        assert verify_password(DEMO_PASSWORD, police.password_hash)
        assert not verify_password("OldPassword123!", police.password_hash)
    await engine.dispose()
