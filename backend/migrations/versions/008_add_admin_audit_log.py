"""add_admin_audit_log

Revision ID: 008_admin_audit_log
Revises: 007_email_verification
Create Date: 2024-01-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '008_admin_audit_log'
down_revision = '007_email_verification'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Crear tabla admin_audit_log
    op.create_table(
        'admin_audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('actor_admin_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(64), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),  # IPv6 puede ser hasta 45 chars
        sa.Column('user_agent', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['actor_admin_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_admin_audit_log_actor_admin_id', 'admin_audit_log', ['actor_admin_id'])
    op.create_index('ix_admin_audit_log_target_user_id', 'admin_audit_log', ['target_user_id'])
    op.create_index('ix_admin_audit_log_created_at', 'admin_audit_log', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_admin_audit_log_created_at', table_name='admin_audit_log')
    op.drop_index('ix_admin_audit_log_target_user_id', table_name='admin_audit_log')
    op.drop_index('ix_admin_audit_log_actor_admin_id', table_name='admin_audit_log')
    op.drop_table('admin_audit_log')
