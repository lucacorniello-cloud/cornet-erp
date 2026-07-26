"""operator report brands

Revision ID: 20260726_19
Revises: 20260726_18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_19"
down_revision = "20260726_18"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "operator_brands",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operator", sa.String(80), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("logo_path", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("operator", name="uq_operator_brands_operator"),
    )
    op.create_index("ix_operator_brands_operator", "operator_brands", ["operator"])
    op.create_index("ix_operator_brands_is_active", "operator_brands", ["is_active"])


def downgrade():
    op.drop_index("ix_operator_brands_is_active", table_name="operator_brands")
    op.drop_index("ix_operator_brands_operator", table_name="operator_brands")
    op.drop_table("operator_brands")
