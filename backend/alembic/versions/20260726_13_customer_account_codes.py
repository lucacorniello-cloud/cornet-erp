"""customer codes by operator and market

Revision ID: 20260726_13
Revises: 20260726_12
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_13"
down_revision = "20260726_12"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customer_account_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("operator", sa.String(length=80), nullable=False),
        sa.Column("market", sa.String(length=40), nullable=False),
        sa.Column("customer_code", sa.String(length=80), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("operator", "market", "customer_code", name="uq_customer_account_code_market"),
    )
    op.create_index("ix_customer_account_codes_customer_id", "customer_account_codes", ["customer_id"])
    op.create_index("ix_customer_account_codes_operator", "customer_account_codes", ["operator"])
    op.create_index("ix_customer_account_codes_market", "customer_account_codes", ["market"])
    op.create_index("ix_customer_account_codes_customer_code", "customer_account_codes", ["customer_code"])
    op.execute(
        """
        INSERT INTO customer_account_codes
            (id, customer_id, operator, market, customer_code, is_primary, created_at, updated_at)
        SELECT gen_random_uuid(), id, 'WINDTRE', 'BUSINESS_SME', windtre_customer_code, true, now(), now()
        FROM customers
        WHERE windtre_customer_code IS NOT NULL AND btrim(windtre_customer_code) <> ''
        ON CONFLICT (operator, market, customer_code) DO NOTHING
        """
    )


def downgrade():
    op.drop_index("ix_customer_account_codes_customer_code", table_name="customer_account_codes")
    op.drop_index("ix_customer_account_codes_market", table_name="customer_account_codes")
    op.drop_index("ix_customer_account_codes_operator", table_name="customer_account_codes")
    op.drop_index("ix_customer_account_codes_customer_id", table_name="customer_account_codes")
    op.drop_table("customer_account_codes")
