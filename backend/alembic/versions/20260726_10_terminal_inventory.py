"""terminal inventory GA and CB

Revision ID: 20260726_10
Revises: 20260726_09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_10"
down_revision = "20260726_09"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "terminal_inventory_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel", sa.String(length=10), nullable=False),
        sa.Column("model", sa.String(length=255), nullable=False),
        sa.Column("gsi_code", sa.String(length=100), nullable=False),
        sa.Column("pieces", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skip_availability", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_terminal_inventory_items_channel", "terminal_inventory_items", ["channel"])
    op.create_index("ix_terminal_inventory_items_model", "terminal_inventory_items", ["model"])
    op.create_index("ix_terminal_inventory_items_gsi_code", "terminal_inventory_items", ["gsi_code"])
    op.create_table(
        "terminal_inventory_metadata",
        sa.Column("channel", sa.String(length=10), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("sheet_name", sa.String(length=255), nullable=True),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("channel"),
    )


def downgrade():
    op.drop_table("terminal_inventory_metadata")
    op.drop_index("ix_terminal_inventory_items_gsi_code", table_name="terminal_inventory_items")
    op.drop_index("ix_terminal_inventory_items_model", table_name="terminal_inventory_items")
    op.drop_index("ix_terminal_inventory_items_channel", table_name="terminal_inventory_items")
    op.drop_table("terminal_inventory_items")
