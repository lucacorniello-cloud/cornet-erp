"""incentive PDC imports

Revision ID: 20260726_15
Revises: 20260726_14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260726_15"
down_revision = "20260726_14"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "incentive_pdc_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competition_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("incentive_competitions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_sha256", sa.String(64), nullable=False),
        sa.Column("stored_path", sa.String(500), nullable=False),
        sa.Column("document_type", sa.String(80), nullable=False, server_default="WINDTRE_PDC"),
        sa.Column("status", sa.String(30), nullable=False, server_default="IMPORTED"),
        sa.Column("extracted_data", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("activation_ids", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("competition_id", "file_sha256", name="uq_incentive_pdc_import_file"),
    )
    for column in ("competition_id", "customer_id", "file_sha256"):
        op.create_index(f"ix_incentive_pdc_imports_{column}", "incentive_pdc_imports", [column])


def downgrade():
    for column in ("file_sha256", "customer_id", "competition_id"):
        op.drop_index(f"ix_incentive_pdc_imports_{column}", table_name="incentive_pdc_imports")
    op.drop_table("incentive_pdc_imports")
