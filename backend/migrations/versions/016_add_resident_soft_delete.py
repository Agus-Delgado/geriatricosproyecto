"""add resident soft delete

Revision ID: 016
Revises: 015
Create Date: 2026-01-03

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('residents', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('residents', sa.Column('deleted_by_user_id', postgresql.UUID(as_uuid=True), nullable=True))

    op.create_foreign_key(
        'fk_residents_deleted_by_user_id',
        'residents',
        'users',
        ['deleted_by_user_id'],
        ['id'],
        ondelete='SET NULL',
    )

    op.create_index('ix_residents_deleted_at', 'residents', ['deleted_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_residents_deleted_at', table_name='residents')
    op.drop_constraint('fk_residents_deleted_by_user_id', 'residents', type_='foreignkey')

    op.drop_column('residents', 'deleted_by_user_id')
    op.drop_column('residents', 'deleted_at')
