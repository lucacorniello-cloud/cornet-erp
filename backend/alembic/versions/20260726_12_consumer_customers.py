"""consumer customer profile fields

Revision ID: 20260726_12
Revises: 20260726_11
"""

from alembic import op
import sqlalchemy as sa


revision = "20260726_12"
down_revision = "20260726_11"
branch_labels = None
depends_on = None


def upgrade():
    for name, column_type in (
        ("first_name", sa.String(120)), ("last_name", sa.String(120)),
        ("postal_code", sa.String(12)), ("city", sa.String(120)), ("province", sa.String(8)),
        ("birth_date", sa.Date()), ("birth_place", sa.String(120)), ("birth_province", sa.String(8)),
        ("gender", sa.String(10)), ("document_type", sa.String(80)), ("document_number", sa.String(80)),
        ("document_issue_date", sa.Date()), ("document_expiry_date", sa.Date()), ("document_issuer", sa.String(160)),
    ):
        op.add_column("customers", sa.Column(name, column_type, nullable=True))


def downgrade():
    for name in (
        "document_issuer", "document_expiry_date", "document_issue_date", "document_number", "document_type",
        "gender", "birth_province", "birth_place", "birth_date", "province", "city", "postal_code",
        "last_name", "first_name",
    ):
        op.drop_column("customers", name)
