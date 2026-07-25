"""terminal catalogs GA and CB

Revision ID: 20260726_08
Revises: 20260726_07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_08"
down_revision = "20260726_07"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "terminal_catalog_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("channel", sa.String(length=8), nullable=False),
        sa.Column("brand", sa.String(length=120)),
        sa.Column("model", sa.String(length=240), nullable=False),
        sa.Column("memory", sa.String(length=80)),
        sa.Column("gsi_code", sa.String(length=120), nullable=False),
        sa.Column("product_type", sa.String(length=32), nullable=False),
        sa.Column("offer_name", sa.String(length=240)),
        sa.Column("customer_band", sa.String(length=32)),
        sa.Column("list_price_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("standard_installment_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("kasko_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("kasko_premium_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("upfront_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("monthly_installment_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("final_installment_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("discount_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("promotion_name", sa.String(length=240)),
        sa.Column("promotion_id", sa.String(length=120)),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_terminal_catalog_channel", "terminal_catalog_items", ["channel"])
    op.create_index("ix_terminal_catalog_model", "terminal_catalog_items", ["model"])
    op.create_index("ix_terminal_catalog_gsi", "terminal_catalog_items", ["gsi_code"])
    op.create_index("ix_terminal_catalog_type", "terminal_catalog_items", ["product_type"])
    op.create_index("ix_terminal_catalog_band", "terminal_catalog_items", ["customer_band"])

    op.create_table(
        "terminal_catalog_metadata",
        sa.Column("channel", sa.String(length=8), primary_key=True, nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("sheet_name", sa.String(length=255)),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("terminal_catalog_metadata")
    op.drop_index("ix_terminal_catalog_band", table_name="terminal_catalog_items")
    op.drop_index("ix_terminal_catalog_type", table_name="terminal_catalog_items")
    op.drop_index("ix_terminal_catalog_gsi", table_name="terminal_catalog_items")
    op.drop_index("ix_terminal_catalog_model", table_name="terminal_catalog_items")
    op.drop_index("ix_terminal_catalog_channel", table_name="terminal_catalog_items")
    op.drop_table("terminal_catalog_items")
