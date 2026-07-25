"""Spedizioni e documenti di trasporto

Revision ID: 20260725_04
Revises: 20260725_03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260725_04"
down_revision = "20260725_03"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("store_settings", sa.Column("partner_logo_path", sa.String(500), nullable=True))
    op.create_table(
        "ddt_shipments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ddt_number", sa.String(40), nullable=False),
        sa.Column("document_date", sa.Date(), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("recipient_name", sa.String(255), nullable=False),
        sa.Column("recipient_address", sa.String(500), nullable=False),
        sa.Column("goods_description", sa.Text(), nullable=False),
        sa.Column("carrier", sa.String(255), nullable=True),
        sa.Column("tracking_number", sa.String(255), nullable=True),
        sa.Column("status", sa.String(40), nullable=False, server_default="IN_PREPARAZIONE"),
        sa.Column("sender_snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ddt_shipments_ddt_number", "ddt_shipments", ["ddt_number"], unique=True)
    op.create_index("ix_ddt_shipments_document_date", "ddt_shipments", ["document_date"])
    op.create_index("ix_ddt_shipments_customer_id", "ddt_shipments", ["customer_id"])
    op.create_index("ix_ddt_shipments_recipient_name", "ddt_shipments", ["recipient_name"])
    op.create_index("ix_ddt_shipments_carrier", "ddt_shipments", ["carrier"])
    op.create_index("ix_ddt_shipments_tracking_number", "ddt_shipments", ["tracking_number"])
    op.create_index("ix_ddt_shipments_status", "ddt_shipments", ["status"])


def downgrade():
    op.drop_table("ddt_shipments")
    op.drop_column("store_settings", "partner_logo_path")
