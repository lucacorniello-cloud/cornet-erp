"""post activation option tasks

Revision ID: 20260726_17
Revises: 20260726_16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_17"
down_revision = "20260726_16"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "post_activation_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pdc_import_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("incentive_pdc_imports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("item_key", sa.String(255), nullable=False),
        sa.Column("item_type", sa.String(30), nullable=False, server_default="OPTION"),
        sa.Column("item_name", sa.String(500), nullable=False),
        sa.Column("customer_code", sa.String(120), nullable=True),
        sa.Column("contract_code", sa.String(120), nullable=True),
        sa.Column("asset_number", sa.String(120), nullable=True),
        sa.Column("activation_date", sa.Date(), nullable=False),
        sa.Column("action_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(30), nullable=False, server_default="REVIEW"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("completed_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pdc_import_id", "item_key", name="uq_post_activation_task_item"),
    )
    for column in (
        "pdc_import_id", "customer_id", "customer_code", "contract_code",
        "activation_date", "action_required", "status", "due_date",
    ):
        op.create_index(f"ix_post_activation_tasks_{column}", "post_activation_tasks", [column])


def downgrade():
    for column in (
        "due_date", "status", "action_required", "activation_date",
        "contract_code", "customer_code", "customer_id", "pdc_import_id",
    ):
        op.drop_index(f"ix_post_activation_tasks_{column}", table_name="post_activation_tasks")
    op.drop_table("post_activation_tasks")
