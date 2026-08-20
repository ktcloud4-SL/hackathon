"""Create OneReport core domain tables.

Revision ID: 20260820_0001
Revises:
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260820_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agencies",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("code", sa.String(32), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.CheckConstraint(
            "code IN ('POLICE', 'FIRE', 'KEPCO', 'ROAD', 'GAS')",
            name="ck_agencies_code",
        ),
    )
    op.bulk_insert(
        sa.table(
            "agencies",
            sa.column("code", sa.String),
            sa.column("name", sa.String),
        ),
        [
            {"code": "POLICE", "name": "경찰"},
            {"code": "FIRE", "name": "소방"},
            {"code": "KEPCO", "name": "한국전력"},
            {"code": "ROAD", "name": "도로관리기관"},
            {"code": "GAS", "name": "가스안전기관"},
        ],
    )
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("agency_id", sa.BigInteger(), sa.ForeignKey("agencies.id")),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "(role = 'AGENCY' AND agency_id IS NOT NULL) OR "
            "(role IN ('CITIZEN', 'ADMIN') AND agency_id IS NULL)",
            name="ck_users_role_agency",
        ),
    )
    op.create_table(
        "reports",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "reporter_user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("image_object_key", sa.String(1024)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_reports_reporter_user_id", "reports", ["reporter_user_id"])
    op.create_table(
        "incidents",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "report_id", sa.BigInteger(), sa.ForeignKey("reports.id"), nullable=False, unique=True
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="OPEN"),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("categories", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "status IN ('OPEN', 'RESPONDING', 'RESOLVED', 'CLOSED')",
            name="ck_incidents_status",
        ),
        sa.CheckConstraint(
            "severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
            name="ck_incidents_severity",
        ),
    )
    op.create_table(
        "incident_agencies",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("incident_id", sa.BigInteger(), sa.ForeignKey("incidents.id"), nullable=False),
        sa.Column("agency_id", sa.BigInteger(), sa.ForeignKey("agencies.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ASSIGNED"),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("received_at", sa.DateTime(timezone=True)),
        sa.Column("dispatched_at", sa.DateTime(timezone=True)),
        sa.Column("arrived_at", sa.DateTime(timezone=True)),
        sa.Column("in_progress_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "status IN ('ASSIGNED', 'RECEIVED', 'DISPATCHED', 'ARRIVED', "
            "'IN_PROGRESS', 'COMPLETED')",
            name="ck_incident_agencies_status",
        ),
        sa.UniqueConstraint("incident_id", "agency_id", name="uq_incident_agency"),
    )
    op.create_index("ix_incident_agencies_incident_id", "incident_agencies", ["incident_id"])
    op.create_index("ix_incident_agencies_agency_id", "incident_agencies", ["agency_id"])
    op.create_table(
        "timeline_events",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("incident_id", sa.BigInteger(), sa.ForeignKey("incidents.id"), nullable=False),
        sa.Column("agency_id", sa.BigInteger(), sa.ForeignKey("agencies.id")),
        sa.Column("actor_user_id", sa.BigInteger(), sa.ForeignKey("users.id")),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_timeline_events_incident_id", "timeline_events", ["incident_id"])
    op.create_index("ix_timeline_events_created_at", "timeline_events", ["created_at"])


def downgrade() -> None:
    op.drop_table("timeline_events")
    op.drop_table("incident_agencies")
    op.drop_table("incidents")
    op.drop_table("reports")
    op.drop_table("users")
    op.drop_table("agencies")
