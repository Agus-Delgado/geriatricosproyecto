"""add_prescription_logs_table

Revision ID: 011_prescription_logs
Revises: 010_add_coverage_other
Create Date: 2024-12-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '011_prescription_logs'
down_revision = '010_add_coverage_other'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Crear tabla prescription_logs
    op.create_table(
        'prescription_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('author_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('medications_text', sa.Text(), nullable=False),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('source', sa.String(16), nullable=False, server_default='OTHER'),
        sa.Column('repeat_of', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['patient_id'], ['residents.id'], ),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['author_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['repeat_of'], ['prescription_logs.id'], ),
    )
    
    # Crear índices
    op.create_index(
        'ix_prescription_logs_patient_created',
        'prescription_logs',
        ['patient_id', 'created_at']
    )
    op.create_index(
        'ix_prescription_logs_facility_created',
        'prescription_logs',
        ['facility_id', 'created_at']
    )


def downgrade() -> None:
    # Eliminar índices
    op.drop_index('ix_prescription_logs_facility_created', table_name='prescription_logs')
    op.drop_index('ix_prescription_logs_patient_created', table_name='prescription_logs')
    
    # Eliminar tabla
    op.drop_table('prescription_logs')