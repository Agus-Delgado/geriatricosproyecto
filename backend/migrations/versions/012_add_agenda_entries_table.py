"""add_agenda_entries_table

Revision ID: 012_agenda_entries
Revises: 011_prescription_logs
Create Date: 2024-01-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '012_agenda_entries'
down_revision = '011_prescription_logs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'agenda_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('doctor_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('seen_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['doctor_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['patient_id'], ['residents.id'], ),
    )
    
    op.create_index(
        'ix_agenda_entries_facility_doctor_seen',
        'agenda_entries',
        ['facility_id', 'doctor_user_id', 'seen_at'],
    )
    
    op.create_index(
        'ix_agenda_entries_facility_patient_seen',
        'agenda_entries',
        ['facility_id', 'patient_id', 'seen_at'],
    )


def downgrade() -> None:
    op.drop_index('ix_agenda_entries_facility_patient_seen', table_name='agenda_entries')
    op.drop_index('ix_agenda_entries_facility_doctor_seen', table_name='agenda_entries')
    op.drop_table('agenda_entries')