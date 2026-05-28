"""add_facility_slug

Revision ID: 002_add_slug
Revises: 001_initial
Create Date: 2024-01-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_add_slug'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar columna slug a facilities
    op.add_column('facilities', sa.Column('slug', sa.String(80), nullable=True))
    
    # Crear índice para búsquedas por slug
    op.create_index('ix_facilities_slug', 'facilities', ['slug'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_facilities_slug', table_name='facilities')
    op.drop_column('facilities', 'slug')
