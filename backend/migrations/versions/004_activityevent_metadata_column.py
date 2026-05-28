"""
Alinear columna JSONB de activity_events a 'meta' (evita nombre reservado 'metadata' en SQLAlchemy)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# IMPORTANTE: revision <= 32 chars
revision = "015_actevt_meta"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = {col["name"] for col in insp.get_columns("activity_events")}

    with op.batch_alter_table("activity_events") as batch_op:
        # Caso más común en tu DB actual: existe 'metadata' (por 014) pero no 'meta'
        if "metadata" in columns and "meta" not in columns:
            batch_op.alter_column(
                "metadata",
                new_column_name="meta",
                existing_type=postgresql.JSONB,
            )
        # Si no existe ninguna, crear 'meta'
        elif "meta" not in columns and "metadata" not in columns:
            batch_op.add_column(sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = {col["name"] for col in insp.get_columns("activity_events")}

    with op.batch_alter_table("activity_events") as batch_op:
        # Revertir: meta -> metadata
        if "meta" in columns and "metadata" not in columns:
            batch_op.alter_column(
                "meta",
                new_column_name="metadata",
                existing_type=postgresql.JSONB,
            )
