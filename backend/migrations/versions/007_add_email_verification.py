"""add_email_verification

Revision ID: 007_email_verification
Revises: 006_certificates_update
Create Date: 2024-01-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007_email_verification'
down_revision = '006_certificates_update'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Crear tabla email_verification_tokens
    op.create_table(
        'email_verification_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('consumed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('send_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('window_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_email_verification_tokens_user_id', 'email_verification_tokens', ['user_id'])
    op.create_index('ix_email_verification_tokens_token_hash', 'email_verification_tokens', ['token_hash'])
    
    # Agregar columna birth_date a users
    op.add_column('users', sa.Column('birth_date', sa.Date(), nullable=True))
    
    # Cambiar default de is_verified a False para nuevos usuarios
    # Los usuarios existentes mantienen su valor actual (True)
    # Esto se hace cambiando el server_default, no afecta a registros existentes
    op.alter_column('users', 'is_verified',
                    server_default='false',
                    existing_type=sa.Boolean(),
                    existing_nullable=False)


def downgrade() -> None:
    # Eliminar columna birth_date
    op.drop_column('users', 'birth_date')
    
    # Restaurar default de is_verified
    op.alter_column('users', 'is_verified',
                    server_default='true',
                    existing_type=sa.Boolean(),
                    existing_nullable=False)
    
    # Eliminar tabla email_verification_tokens
    op.drop_index('ix_email_verification_tokens_token_hash', table_name='email_verification_tokens')
    op.drop_index('ix_email_verification_tokens_user_id', table_name='email_verification_tokens')
    op.drop_table('email_verification_tokens')
