"""Add the LOCAL_GOV agency for public-report V2.

Revision ID: 20260821_0002
Revises: 20260820_0001
"""

from alembic import op
import sqlalchemy as sa


revision = "20260821_0002"
down_revision = "20260820_0001"
branch_labels = None
depends_on = None


AGENCY_CODE_CHECK_V2 = (
    "code IN ('POLICE', 'FIRE', 'KEPCO', 'ROAD', 'GAS', 'LOCAL_GOV')"
)
AGENCY_CODE_CHECK_V1 = "code IN ('POLICE', 'FIRE', 'KEPCO', 'ROAD', 'GAS')"


def upgrade() -> None:
    op.drop_constraint("ck_agencies_code", "agencies", type_="check")
    op.create_check_constraint(
        "ck_agencies_code",
        "agencies",
        AGENCY_CODE_CHECK_V2,
    )
    op.execute(
        sa.text(
            """
            INSERT INTO agencies (code, name)
            VALUES ('LOCAL_GOV', '관할 지자체')
            ON CONFLICT (code) DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM agencies
            WHERE code = 'LOCAL_GOV'
              AND NOT EXISTS (
                  SELECT 1 FROM users WHERE users.agency_id = agencies.id
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM incident_agencies
                  WHERE incident_agencies.agency_id = agencies.id
              )
            """
        )
    )
    op.drop_constraint("ck_agencies_code", "agencies", type_="check")
    op.create_check_constraint(
        "ck_agencies_code",
        "agencies",
        AGENCY_CODE_CHECK_V1,
    )
