"""add_rbac_fields_step1

Revision ID: 004a_rbac_step1
Revises: 003_staff_attendance
Create Date: 2024-01-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004a_rbac_step1'
down_revision = '003_staff_attendance'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar campos a users
    op.add_column('users', sa.Column('is_platform_admin', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('active_facility_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_users_active_facility_id', 'users', 'facilities', ['active_facility_id'], ['id'])
    op.create_index('ix_users_active_facility_id', 'users', ['active_facility_id'])
    
    # Agregar campos a facility_user_access
    op.add_column('facility_user_access', sa.Column('role', sa.String(32), nullable=True))
    op.add_column('facility_user_access', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    # Revertir cambios en facility_user_access
    op.drop_column('facility_user_access', 'is_active')
    op.drop_column('facility_user_access', 'role')
    
    # Revertir cambios en users
    op.drop_index('ix_users_active_facility_id', table_name='users')
    op.drop_constraint('fk_users_active_facility_id', 'users', type_='foreignkey')
    op.drop_column('users', 'active_facility_id')
    op.drop_column('users', 'is_platform_admin')
