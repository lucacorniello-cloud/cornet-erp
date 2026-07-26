"""post activation configuration rules

Revision ID: 20260726_18
Revises: 20260726_17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_18"
down_revision = "20260726_17"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "post_activation_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operator", sa.String(80), nullable=False, server_default="WINDTRE"),
        sa.Column("item_type", sa.String(30), nullable=False),
        sa.Column("item_key", sa.String(255), nullable=False),
        sa.Column("item_name", sa.String(500), nullable=False),
        sa.Column("can_deactivate", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("default_action_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("operator", "item_type", "item_key", name="uq_post_activation_rule_item"),
    )
    for column in ("operator", "item_type", "can_deactivate", "is_active"):
        op.create_index(f"ix_post_activation_rules_{column}", "post_activation_rules", [column])


def downgrade():
    for column in ("is_active", "can_deactivate", "item_type", "operator"):
        op.drop_index(f"ix_post_activation_rules_{column}", table_name="post_activation_rules")
    op.drop_table("post_activation_rules")
