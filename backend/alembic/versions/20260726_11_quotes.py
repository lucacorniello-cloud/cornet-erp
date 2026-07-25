"""quotes and generated configurators

Revision ID: 20260726_11
Revises: 20260726_10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_11"
down_revision = "20260726_10"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "quotes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quote_type", sa.String(length=40), nullable=False, server_default="CONFIGURATORE"),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="GENERATO"),
        sa.Column("line_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_mrr_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("proposed_mrr_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payload", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quotes_customer_id", "quotes", ["customer_id"])
    op.create_index("ix_quotes_quote_type", "quotes", ["quote_type"])
    op.create_index("ix_quotes_status", "quotes", ["status"])
    op.create_index("ix_quotes_created_at", "quotes", ["created_at"])


def downgrade():
    op.drop_index("ix_quotes_created_at", table_name="quotes")
    op.drop_index("ix_quotes_status", table_name="quotes")
    op.drop_index("ix_quotes_quote_type", table_name="quotes")
    op.drop_index("ix_quotes_customer_id", table_name="quotes")
    op.drop_table("quotes")
