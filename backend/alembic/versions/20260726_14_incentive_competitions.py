"""incentive competitions and activations

Revision ID: 20260726_14
Revises: 20260726_13
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_14"
down_revision = "20260726_13"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "incentive_competitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("operator", sa.String(80), nullable=False, server_default="WINDTRE"),
        sa.Column("market", sa.String(80), nullable=False, server_default="MIXED"),
        sa.Column("dealer_code", sa.String(80), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="DRAFT"),
        sa.Column("source_document", sa.String(500), nullable=True),
        sa.Column("configuration", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("name", "operator", "start_date", "end_date", "status"):
        op.create_index(f"ix_incentive_competitions_{column}", "incentive_competitions", [column])
    op.create_table(
        "incentive_activations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competition_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("incentive_competitions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("activation_date", sa.Date(), nullable=False),
        sa.Column("source_type", sa.String(40), nullable=False, server_default="MANUAL"),
        sa.Column("source_key", sa.String(255), nullable=False),
        sa.Column("seller_name", sa.String(255), nullable=True),
        sa.Column("track", sa.String(40), nullable=False),
        sa.Column("offer", sa.String(255), nullable=True),
        sa.Column("asset_number", sa.String(120), nullable=True),
        sa.Column("monthly_fee_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("direct_bonus_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("attributes", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(30), nullable=False, server_default="VALID"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("competition_id", "source_key", name="uq_incentive_activation_source"),
    )
    for column in ("competition_id", "customer_id", "activation_date", "track", "status"):
        op.create_index(f"ix_incentive_activations_{column}", "incentive_activations", [column])


def downgrade():
    for column in ("status", "track", "activation_date", "customer_id", "competition_id"):
        op.drop_index(f"ix_incentive_activations_{column}", table_name="incentive_activations")
    op.drop_table("incentive_activations")
    for column in ("status", "end_date", "start_date", "operator", "name"):
        op.drop_index(f"ix_incentive_competitions_{column}", table_name="incentive_competitions")
    op.drop_table("incentive_competitions")
