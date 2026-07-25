"""Associazione SIM ai DDT

Revision ID: 20260725_05
Revises: 20260725_04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260725_05"
down_revision = "20260725_04"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ddt_shipment_sims",
        sa.Column("ddt_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ddt_shipments.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("sim_inventory_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sim_inventory.id", ondelete="RESTRICT"), primary_key=True),
    )
    op.create_index("ix_ddt_shipment_sims_inventory", "ddt_shipment_sims", ["sim_inventory_id"])


def downgrade():
    op.drop_table("ddt_shipment_sims")
