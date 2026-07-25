"""Configurazione punto vendita

Revision ID: 20260725_02
Revises: 20260725_01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260725_02"
down_revision = "20260725_01"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "store_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("store_name", sa.String(255), nullable=False, server_default="Cornet Solutions"),
        sa.Column("legal_name", sa.String(255), nullable=True),
        sa.Column("tax_id", sa.String(32), nullable=True),
        sa.Column("fiscal_code", sa.String(32), nullable=True),
        sa.Column("dealer_code", sa.String(80), nullable=True),
        sa.Column("address", sa.String(255), nullable=True),
        sa.Column("city", sa.String(120), nullable=True),
        sa.Column("postal_code", sa.String(12), nullable=True),
        sa.Column("province", sa.String(8), nullable=True),
        sa.Column("phone", sa.String(80), nullable=True),
        sa.Column("whatsapp", sa.String(80), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("website", sa.String(255), nullable=True),
        sa.Column("logo_path", sa.String(500), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("store_settings")
