"""Importazioni WINDTRE Business SME

Revision ID: 20260725_01
Revises:
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260725_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("segment", sa.String(40), nullable=False, server_default="BUSINESS_SME"),
        sa.Column("business_name", sa.String(255), nullable=False),
        sa.Column("tax_id", sa.String(32), nullable=True),
        sa.Column("fiscal_code", sa.String(32), nullable=True),
        sa.Column("windtre_customer_code", sa.String(80), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(80), nullable=True),
        sa.Column("portfolio_status", sa.String(40), nullable=False, server_default="ACTIVE"),
        sa.Column("first_seen_month", sa.String(7), nullable=True),
        sa.Column("last_seen_month", sa.String(7), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("tax_id", name="uq_customers_tax_id"),
    )
    op.create_index("ix_customers_business_name", "customers", ["business_name"])
    op.create_index("ix_customers_windtre_code", "customers", ["windtre_customer_code"])

    op.create_table(
        "windtre_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("competence_month", sa.String(7), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_sha256", sa.String(64), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="COMPLETED"),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("customer_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("new_customers", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("missing_customers", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("new_assets", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("removed_assets", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("field_changes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("campaign_changes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("competence_month", "file_sha256", name="uq_windtre_import_month_hash"),
    )
    op.create_index("ix_windtre_import_month", "windtre_imports", ["competence_month"])

    op.create_table(
        "windtre_import_rows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("import_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("windtre_imports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("customer_key", sa.String(255), nullable=False),
        sa.Column("asset_key", sa.String(255), nullable=False),
        sa.Column("business_name", sa.String(255), nullable=False),
        sa.Column("asset_type", sa.String(80), nullable=True),
        sa.Column("asset_number", sa.String(120), nullable=True),
        sa.Column("current_plan", sa.String(255), nullable=True),
        sa.Column("current_status", sa.String(80), nullable=True),
        sa.Column("monthly_fee", sa.String(80), nullable=True),
        sa.Column("raw_data", postgresql.JSONB(), nullable=False),
        sa.Column("campaigns", postgresql.JSONB(), nullable=False),
    )
    op.create_index("ix_windtre_rows_import", "windtre_import_rows", ["import_id"])
    op.create_index("ix_windtre_rows_customer_key", "windtre_import_rows", ["customer_key"])
    op.create_index("ix_windtre_rows_asset_key", "windtre_import_rows", ["asset_key"])

    op.create_table(
        "windtre_changes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("import_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("windtre_imports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("change_type", sa.String(50), nullable=False),
        sa.Column("customer_key", sa.String(255), nullable=False),
        sa.Column("asset_key", sa.String(255), nullable=True),
        sa.Column("field_name", sa.String(255), nullable=True),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_windtre_changes_import", "windtre_changes", ["import_id"])
    op.create_index("ix_windtre_changes_type", "windtre_changes", ["change_type"])


def downgrade():
    op.drop_table("windtre_changes")
    op.drop_table("windtre_import_rows")
    op.drop_table("windtre_imports")
    op.drop_table("customers")
