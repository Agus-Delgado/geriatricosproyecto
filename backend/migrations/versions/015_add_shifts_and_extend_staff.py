"""add shifts and extend staff

Revision ID: 015
Revises: 014_resident_status_activity
Create Date: 2026-01-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '015'
down_revision = '014_resident_status_activity'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extender tabla staff con nuevos campos
    op.add_column('staff', sa.Column('cuil', sa.String(length=16), nullable=True))
    op.add_column('staff', sa.Column('specialty', sa.String(length=128), nullable=True))
    op.add_column('staff', sa.Column('license_number', sa.String(length=64), nullable=True))
    op.add_column('staff', sa.Column('end_date', sa.Date(), nullable=True))
    op.add_column('staff', sa.Column('status', sa.String(length=24), nullable=False, server_default='ACTIVE'))
    op.add_column('staff', sa.Column('updated_by_user_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Crear índices adicionales en staff
    op.create_index('ix_staff_status', 'staff', ['status'], unique=False)
    op.create_index('ix_staff_dni', 'staff', ['dni'], unique=False)

    # Crear foreign key para updated_by_user_id
    op.create_foreign_key(
        'fk_staff_updated_by_user_id',
        'staff', 'users',
        ['updated_by_user_id'], ['id'],
        ondelete='SET NULL'
    )

    # Crear tabla shifts
    op.create_table(
        'shifts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('color', sa.String(length=16), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Crear índices en shifts
    op.create_index('ix_shifts_facility_id', 'shifts', ['facility_id'], unique=False)
    op.create_index('ix_shifts_active', 'shifts', ['is_active'], unique=False)

    # Crear tabla shift_assignments
    op.create_table(
        'shift_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('staff_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shift_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('notes', sa.String(length=256), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shift_id'], ['shifts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Crear índices en shift_assignments
    op.create_index('ix_shift_assignments_staff_id', 'shift_assignments', ['staff_id'], unique=False)
    op.create_index('ix_shift_assignments_shift_id', 'shift_assignments', ['shift_id'], unique=False)
    op.create_index('ix_shift_assignments_facility_id', 'shift_assignments', ['facility_id'], unique=False)
    op.create_index('ix_shift_assignments_date', 'shift_assignments', ['date'], unique=False)

    # Crear índice único para evitar duplicados: mismo staff, mismo turno, misma fecha
    op.create_index(
        'uix_shift_assignment_unique',
        'shift_assignments',
        ['staff_id', 'shift_id', 'date'],
        unique=True
    )


def downgrade() -> None:
    # Eliminar tabla shift_assignments
    op.drop_index('uix_shift_assignment_unique', table_name='shift_assignments')
    op.drop_index('ix_shift_assignments_date', table_name='shift_assignments')
    op.drop_index('ix_shift_assignments_facility_id', table_name='shift_assignments')
    op.drop_index('ix_shift_assignments_shift_id', table_name='shift_assignments')
    op.drop_index('ix_shift_assignments_staff_id', table_name='shift_assignments')
    op.drop_table('shift_assignments')

    # Eliminar tabla shifts
    op.drop_index('ix_shifts_active', table_name='shifts')
    op.drop_index('ix_shifts_facility_id', table_name='shifts')
    op.drop_table('shifts')

    # Eliminar columnas agregadas a staff
    op.drop_constraint('fk_staff_updated_by_user_id', 'staff', type_='foreignkey')
    op.drop_index('ix_staff_dni', table_name='staff')
    op.drop_index('ix_staff_status', table_name='staff')
    op.drop_column('staff', 'updated_by_user_id')
    op.drop_column('staff', 'status')
    op.drop_column('staff', 'end_date')
    op.drop_column('staff', 'license_number')
    op.drop_column('staff', 'specialty')
    op.drop_column('staff', 'cuil')
