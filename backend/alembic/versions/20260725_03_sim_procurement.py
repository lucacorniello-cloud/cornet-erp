"""Catalogo prodotti, ordini e magazzino SIM

Revision ID: 20260725_03
Revises: 20260725_02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260725_03"
down_revision = "20260725_02"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("customers", sa.Column("address", sa.String(255), nullable=True))
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("sku", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("unit_cost_cents", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_products_sku", "products", ["sku"])
    op.create_index("ix_products_name", "products", ["name"])

    op.create_table(
        "sim_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_number", sa.String(80), nullable=False, unique=True),
        sa.Column("order_date", sa.Date(), nullable=False),
        sa.Column("supplier", sa.String(255), nullable=True),
        sa.Column("status", sa.String(40), nullable=False, server_default="INVIATO"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_sim_orders_number", "sim_orders", ["order_number"])

    op.create_table(
        "sim_order_lines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sim_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_index("ix_sim_order_lines_order", "sim_order_lines", ["order_id"])
    op.create_index("ix_sim_order_lines_product", "sim_order_lines", ["product_id"])

    op.create_table(
        "sim_inventory",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("iccid", sa.String(20), nullable=False, unique=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sim_orders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(40), nullable=False, server_default="IN_MAGAZZINO"),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("msisdn", sa.String(30), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_sim_inventory_iccid", "sim_inventory", ["iccid"])
    op.create_index("ix_sim_inventory_product", "sim_inventory", ["product_id"])
    op.create_index("ix_sim_inventory_order", "sim_inventory", ["order_id"])
    op.create_index("ix_sim_inventory_status", "sim_inventory", ["status"])
    op.create_index("ix_sim_inventory_customer", "sim_inventory", ["customer_id"])
    op.create_index("ix_sim_inventory_msisdn", "sim_inventory", ["msisdn"])

    op.create_table(
        "sim_inventory_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("added_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rejected_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("errors", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("sim_inventory_imports")
    op.drop_table("sim_inventory")
    op.drop_table("sim_order_lines")
    op.drop_table("sim_orders")
    op.drop_table("products")
    op.drop_column("customers", "address")
