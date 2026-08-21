from importlib import import_module

import pytest


class RecordingOperations:
    def __init__(self) -> None:
        self.dropped: list[tuple[str, str, str | None]] = []
        self.created: list[tuple[str, str, str]] = []
        self.executed: list[str] = []

    def drop_constraint(
        self, name: str, table_name: str, *, type_: str | None = None
    ) -> None:
        self.dropped.append((name, table_name, type_))

    def create_check_constraint(
        self, name: str, table_name: str, condition: str
    ) -> None:
        self.created.append((name, table_name, condition))

    def execute(self, statement: object) -> None:
        self.executed.append(str(statement))


def test_upgrade_extends_agency_constraint_and_inserts_local_government(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    migration = import_module(
        "migrations.versions.20260821_0002_public_report_v2"
    )
    operations = RecordingOperations()
    monkeypatch.setattr(migration, "op", operations)

    migration.upgrade()

    assert migration.down_revision == "20260820_0001"
    assert operations.dropped == [("ck_agencies_code", "agencies", "check")]
    assert operations.created == [
        (
            "ck_agencies_code",
            "agencies",
            migration.AGENCY_CODE_CHECK_V2,
        )
    ]
    assert "LOCAL_GOV" in operations.created[0][2]
    assert "ON CONFLICT (code) DO NOTHING" in operations.executed[0]
