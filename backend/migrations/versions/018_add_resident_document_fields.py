"""add resident document fields

Revision ID: 018_add_resident_document_fields
Revises: 017_merge_heads
Create Date: 2024-01-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '018_add_resident_document_fields'
down_revision = '017_merge_heads'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar columnas para documento (carnet) en tabla residents
    op.add_column('residents', sa.Column('document_url', sa.String(length=512), nullable=True))
    op.add_column('residents', sa.Column('document_name', sa.String(length=255), nullable=True))
    op.add_column('residents', sa.Column('document_mime', sa.String(length=80), nullable=True))
    op.add_column('residents', sa.Column('document_size', sa.BigInteger(), nullable=True))


def downgrade() -> None:
    # Eliminar columnas de documento
    op.drop_column('residents', 'document_size')
    op.drop_column('residents', 'document_mime')
    op.drop_column('residents', 'document_name')
    op.drop_column('residents', 'document_url')
