"""Catalogo piani tariffari B2B

Revision ID: 20260725_06
Revises: 20260725_05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260725_06"
down_revision = "20260725_05"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tariff_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("plan_type", sa.String(30), nullable=False),
        sa.Column("ga_list_code", sa.String(80)), sa.Column("cb_list_code", sa.String(80)),
        sa.Column("valid_from", sa.Date()), sa.Column("valid_to", sa.Date()),
        sa.Column("subscribable", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("monthly_fee_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("secure_web_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("activation_cost_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sim_cost_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("national_gb", sa.String(100)), sa.Column("national_minutes", sa.String(100)), sa.Column("national_sms", sa.String(100)),
        sa.Column("eu_limited", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("eu_gb", sa.String(100)), sa.Column("eu_minutes", sa.String(100)), sa.Column("eu_sms", sa.String(100)),
        sa.Column("eu_international_calls", sa.Text()), sa.Column("roaming_countries", sa.Text()),
        sa.Column("international_included", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("international_countries", sa.Text()),
        sa.Column("custom_discounts", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("technical_pdf_path", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_tariff_plans_plan_code", "tariff_plans", ["plan_code"], unique=True)
    op.create_index("ix_tariff_plans_name", "tariff_plans", ["name"], unique=True)
    op.create_index("ix_tariff_plans_plan_type", "tariff_plans", ["plan_type"])
    op.create_index("ix_tariff_plans_subscribable", "tariff_plans", ["subscribable"])
    op.create_index("ix_tariff_plans_ga_list_code", "tariff_plans", ["ga_list_code"])
    op.create_index("ix_tariff_plans_cb_list_code", "tariff_plans", ["cb_list_code"])


def downgrade():
    op.drop_table("tariff_plans")
