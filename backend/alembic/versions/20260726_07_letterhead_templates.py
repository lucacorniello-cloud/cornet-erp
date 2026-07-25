"""Template carta e busta intestata

Revision ID: 20260726_07
Revises: 20260725_06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260726_07"
down_revision = "20260725_06"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "letterhead_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_name", sa.String(255), nullable=False, server_default="Cornet Solutions"),
        sa.Column("company_address", sa.String(500)), sa.Column("tax_id", sa.String(80)),
        sa.Column("phone", sa.String(100)), sa.Column("email", sa.String(255)),
        sa.Column("pec", sa.String(255)), sa.Column("website", sa.String(255)),
        sa.Column("logo_url", sa.String(500)), sa.Column("logo_size", sa.Integer(), nullable=False, server_default="80"),
        sa.Column("logo_horizontal", sa.String(20), nullable=False, server_default="left"),
        sa.Column("logo_vertical", sa.String(20), nullable=False, server_default="top"),
        sa.Column("recipient_offset_mm", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("primary_color", sa.String(20), nullable=False, server_default="#4f46e5"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("letterhead_templates")
