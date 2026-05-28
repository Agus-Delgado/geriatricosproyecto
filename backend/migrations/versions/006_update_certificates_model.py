"""update_certificates_model

Revision ID: 006_certificates_update
Revises: 005_license_number
Create Date: 2024-01-05 00:00:02.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = '006_certificates_update'
down_revision = '005_license_number'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar body_text (NOT NULL con valor por defecto temporal)
    op.add_column('certificates', sa.Column('body_text', sa.Text(), nullable=True))
    
    # Migrar datos existentes: extraer texto de content_json si existe
    op.execute(sa.text("""
        UPDATE certificates
        SET body_text = COALESCE(
            content_json->>'body_text',
            content_json->>'text',
            'Texto no disponible'
        )
        WHERE body_text IS NULL
    """))
    
    # Hacer body_text NOT NULL
    op.alter_column('certificates', 'body_text', nullable=False)
    
    # Hacer content_json nullable
    op.alter_column('certificates', 'content_json', nullable=True, existing_type=JSONB)
    
    # Hacer pdf_url nullable
    op.alter_column('certificates', 'pdf_url', nullable=True)


def downgrade() -> None:
    # Restaurar pdf_url como NOT NULL (con valor por defecto)
    op.alter_column('certificates', 'pdf_url', nullable=False, server_default='')
    
    # Restaurar content_json como NOT NULL
    op.alter_column('certificates', 'content_json', nullable=False, existing_type=JSONB)
    
    # Eliminar body_text
    op.drop_column('certificates', 'body_text')
