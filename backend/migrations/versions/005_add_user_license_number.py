"""add_user_license_number

Revision ID: 005_license_number
Revises: 004b_rbac_step2
Create Date: 2024-01-05 00:00:01.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_license_number'
down_revision = '004b_rbac_step2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('license_number', sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'license_number')
