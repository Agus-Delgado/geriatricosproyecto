"""add_uniqueness_constraints

Revision ID: 009_uniqueness_constraints
Revises: 008_admin_audit_log
Create Date: 2024-01-07 00:00:01.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '009_uniqueness_constraints'
down_revision = '008_admin_audit_log'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Verificar que users.dni tenga índice único (ya existe en migración 001)
    # Verificar que users.email tenga índice único (ya existe en migración 001)
    # Crear índice único parcial para users.license_number (solo cuando no es NULL)
    op.create_index(
        'ix_users_license_number_unique',
        'users',
        ['license_number'],
        unique=True,
        postgresql_where=sa.text('license_number IS NOT NULL')
    )


def downgrade() -> None:
    op.drop_index('ix_users_license_number_unique', table_name='users')
