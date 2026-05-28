"""merge heads

Revision ID: 017_merge_heads
Revises: 016, 015_actevt_meta
Create Date: 2026-01-03

"""

# This is an Alembic merge revision.

from alembic import op


# revision identifiers, used by Alembic.
revision = '017_merge_heads'
down_revision = ('016', '015_actevt_meta')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
