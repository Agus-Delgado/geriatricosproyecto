"""add_staff_and_attendance

Revision ID: 003_staff_attendance
Revises: 002_add_slug
Create Date: 2024-01-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_staff_attendance'
down_revision = '002_add_slug'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tabla staff
    op.create_table(
        'staff',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('first_name', sa.String(80), nullable=False),
        sa.Column('last_name', sa.String(80), nullable=False),
        sa.Column('dni', sa.String(16), nullable=True),
        sa.Column('phone', sa.String(32), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('position', sa.String(80), nullable=True),
        sa.Column('hire_date', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
    )
    op.create_index('ix_staff_facility_id', 'staff', ['facility_id'])
    op.create_index('ix_staff_active', 'staff', ['facility_id', 'is_active'])
    op.create_index('ix_staff_name', 'staff', ['last_name', 'first_name'])

    # Tabla attendances
    op.create_table(
        'attendances',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('staff_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('check_in', sa.DateTime(timezone=True), nullable=False),
        sa.Column('check_out', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ),
        sa.ForeignKeyConstraint(['recorded_by_user_id'], ['users.id'], ),
    )
    op.create_index('ix_attendances_facility_date', 'attendances', ['facility_id', 'check_in'])
    op.create_index('ix_attendances_staff_date', 'attendances', ['staff_id', 'check_in'])
    op.create_index('ix_attendances_date_range', 'attendances', ['check_in', 'check_out'])


def downgrade() -> None:
    op.drop_table('attendances')
    op.drop_table('staff')
