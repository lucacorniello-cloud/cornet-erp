"""activation customer and contract codes

Revision ID: 20260726_16
Revises: 20260726_15
"""

from alembic import op
import sqlalchemy as sa


revision = "20260726_16"
down_revision = "20260726_15"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("incentive_activations", sa.Column("customer_code", sa.String(120), nullable=True))
    op.add_column("incentive_activations", sa.Column("contract_code", sa.String(120), nullable=True))
    op.create_index("ix_incentive_activations_customer_code", "incentive_activations", ["customer_code"])
    op.create_index("ix_incentive_activations_contract_code", "incentive_activations", ["contract_code"])
    op.execute(
        """
        UPDATE incentive_activations
        SET customer_code = NULLIF(attributes->>'customer_code', ''),
            contract_code = NULLIF(attributes->>'contract_code', '')
        WHERE attributes IS NOT NULL
        """
    )


def downgrade():
    op.drop_index("ix_incentive_activations_contract_code", table_name="incentive_activations")
    op.drop_index("ix_incentive_activations_customer_code", table_name="incentive_activations")
    op.drop_column("incentive_activations", "contract_code")
    op.drop_column("incentive_activations", "customer_code")
