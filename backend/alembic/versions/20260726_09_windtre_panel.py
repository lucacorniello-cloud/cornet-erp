"""WindTre operational panel register

Revision ID: 20260726_09
Revises: 20260726_08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_09"
down_revision = "20260726_08"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "windtre_panel_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL")),
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("template_key", sa.String(length=80), nullable=False),
        sa.Column("template_title", sa.String(length=255), nullable=False),
        sa.Column("recipient", sa.String(length=255)),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("form_data", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("response_date", sa.Date()),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ATTESA"),
        sa.Column("operator_uid", sa.String(length=255), nullable=False, server_default="local-user"),
    )
    op.create_index("ix_windtre_panel_customer", "windtre_panel_requests", ["customer_id"])
    op.create_index("ix_windtre_panel_customer_name", "windtre_panel_requests", ["customer_name"])
    op.create_index("ix_windtre_panel_template", "windtre_panel_requests", ["template_key"])
    op.create_index("ix_windtre_panel_sent_at", "windtre_panel_requests", ["sent_at"])
    op.create_index("ix_windtre_panel_status", "windtre_panel_requests", ["status"])


def downgrade():
    op.drop_index("ix_windtre_panel_status", table_name="windtre_panel_requests")
    op.drop_index("ix_windtre_panel_sent_at", table_name="windtre_panel_requests")
    op.drop_index("ix_windtre_panel_template", table_name="windtre_panel_requests")
    op.drop_index("ix_windtre_panel_customer_name", table_name="windtre_panel_requests")
    op.drop_index("ix_windtre_panel_customer", table_name="windtre_panel_requests")
    op.drop_table("windtre_panel_requests")
