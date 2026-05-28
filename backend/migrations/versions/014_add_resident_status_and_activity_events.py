"""add resident.status and activity_events

Revision ID: 014_resident_status_activity
Revises: 013_password_reset
Create Date: 2025-12-31
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '014_resident_status_activity'
down_revision = '013_add_password_reset_tokens'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add status column to residents
    op.add_column('residents', sa.Column('status', sa.String(length=24), nullable=False, server_default='ACTIVE'))
    op.create_index('ix_residents_status', 'residents', ['status'])

    # Create activity_events table
    op.create_table(
        'activity_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('facilities.id'), nullable=False),
        sa.Column('actor_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('entity_type', sa.String(length=64), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )
    op.create_index('ix_activity_events_facility_created', 'activity_events', ['facility_id', 'created_at'])
    op.create_index('ix_activity_events_actor_created', 'activity_events', ['actor_user_id', 'created_at'])
    op.create_index('ix_activity_events_event_type_created', 'activity_events', ['event_type', 'created_at'])

    # Drop server default for residents.status after backfilling
    op.alter_column('residents', 'status', server_default=None)


def downgrade() -> None:
    op.drop_index('ix_activity_events_event_type_created', table_name='activity_events')
    op.drop_index('ix_activity_events_actor_created', table_name='activity_events')
    op.drop_index('ix_activity_events_facility_created', table_name='activity_events')
    op.drop_table('activity_events')

    op.drop_index('ix_residents_status', table_name='residents')
    op.drop_column('residents', 'status')

