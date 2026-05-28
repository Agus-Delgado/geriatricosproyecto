"""add_rbac_fields_step2

Revision ID: 004b_rbac_step2
Revises: 004a_rbac_step1
Create Date: 2024-01-04 00:00:01.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '004b_rbac_step2'
down_revision = '004a_rbac_step1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Backfill: mapear access_level existentes a role
    # CLINICAL -> ADMIN (usuarios con acceso clínico son admins del geriátrico)
    # ADMIN -> ADMIN (mantener)
    # Otros valores -> STAFF (por defecto)
    op.execute(text("""
        UPDATE facility_user_access
        SET role = CASE
            WHEN access_level IN ('CLINICAL', 'ADMIN') THEN 'ADMIN'
            ELSE 'STAFF'
        END
        WHERE role IS NULL
    """))
    
    # Asegurar que no queden valores NULL
    op.execute(text("""
        UPDATE facility_user_access
        SET role = 'STAFF'
        WHERE role IS NULL
    """))
    
    # Alterar role a NOT NULL
    op.alter_column('facility_user_access', 'role', nullable=False)
    
    # Eliminar columna access_level
    op.drop_column('facility_user_access', 'access_level')


def downgrade() -> None:
    # Restaurar columna access_level
    op.add_column('facility_user_access', sa.Column('access_level', sa.String(32), nullable=False, server_default='CLINICAL'))
    
    # Backfill inverso: mapear role a access_level
    op.execute(text("""
        UPDATE facility_user_access
        SET access_level = CASE
            WHEN role = 'ADMIN' THEN 'CLINICAL'
            WHEN role = 'MEDICO' THEN 'CLINICAL'
            ELSE 'CLINICAL'
        END
    """))
    
    # Alterar role a nullable para permitir downgrade
    op.alter_column('facility_user_access', 'role', nullable=True)
