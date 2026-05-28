"""add_coverage_other

Revision ID: 010_add_coverage_other
Revises: 009_add_uniqueness_constraints
Create Date: 2024-12-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '010_add_coverage_other'
down_revision = '009_uniqueness_constraints'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar columna coverage_other a la tabla residents
    op.add_column(
        'residents',
        sa.Column('coverage_other', sa.String(128), nullable=True)
    )


def downgrade() -> None:
    # Eliminar columna coverage_other
    op.drop_column('residents', 'coverage_other')
