"""initial_schema

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # A) Auth / Identidad
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('dni', sa.String(16), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(32), nullable=True),
        sa.Column('full_name', sa.String(160), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_users_dni', 'users', ['dni'], unique=True)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    op.create_table(
        'user_roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('code', sa.String(32), nullable=False, unique=True),
        sa.Column('name', sa.String(80), nullable=False),
    )

    op.create_table(
        'user_role_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['user_roles.id'], ),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role'),
    )

    # B) Organización / Sedes
    op.create_table(
        'owner_groups',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    op.create_table(
        'facilities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_group_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('code', sa.String(32), nullable=False),
        sa.Column('address', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(32), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['owner_group_id'], ['owner_groups.id'], ),
        sa.UniqueConstraint('owner_group_id', 'code', name='uq_owner_group_code'),
    )
    op.create_index('ix_facilities_owner_group_id', 'facilities', ['owner_group_id'])

    op.create_table(
        'facility_user_access',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('access_level', sa.String(32), nullable=False, server_default='CLINICAL'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.UniqueConstraint('facility_id', 'user_id', name='uq_facility_user'),
    )
    op.create_index('ix_facility_user_access_facility_id', 'facility_user_access', ['facility_id'])
    op.create_index('ix_facility_user_access_user_id', 'facility_user_access', ['user_id'])

    # C) Residentes + Contactos
    op.create_table(
        'residents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('first_name', sa.String(80), nullable=False),
        sa.Column('last_name', sa.String(80), nullable=False),
        sa.Column('dni', sa.String(16), nullable=True),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('sex', sa.String(16), nullable=True),
        sa.Column('coverage_type', sa.String(32), nullable=True),
        sa.Column('coverage_number', sa.String(64), nullable=True),
        sa.Column('admission_date', sa.Date(), nullable=False),
        sa.Column('stay_status', sa.String(24), nullable=False, server_default='ACTIVE'),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('end_reason', sa.String(24), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('updated_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['updated_by_user_id'], ['users.id'], ),
    )
    op.create_index('ix_residents_facility_id', 'residents', ['facility_id'])
    op.create_index('ix_residents_stay_status', 'residents', ['stay_status'])
    op.create_index('ix_residents_name', 'residents', ['last_name', 'first_name'])

    op.create_table(
        'resident_contacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resident_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('full_name', sa.String(160), nullable=False),
        sa.Column('relationship_type', sa.String(80), nullable=True),  # Renombrado para evitar conflicto con relationship() de SQLAlchemy
        sa.Column('phone', sa.String(32), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('address', sa.String(255), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['resident_id'], ['residents.id'], ),
    )
    op.create_index('ix_resident_contacts_resident_id', 'resident_contacts', ['resident_id'])

    # D) Clínica
    op.create_table(
        'clinical_summaries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resident_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('main_diagnosis', sa.Text(), nullable=True),
        sa.Column('comorbidities', sa.Text(), nullable=True),
        sa.Column('allergies', sa.Text(), nullable=True),
        sa.Column('current_treatment', sa.Text(), nullable=True),
        sa.Column('care_instructions', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['resident_id'], ['residents.id'], ),
        sa.ForeignKeyConstraint(['updated_by_user_id'], ['users.id'], ),
    )

    op.create_table(
        'clinical_notes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resident_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('note_type', sa.String(32), nullable=False, server_default='EVOLUTION'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('author_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['resident_id'], ['residents.id'], ),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['author_user_id'], ['users.id'], ),
    )
    op.create_index('ix_clinical_notes_resident_recorded', 'clinical_notes', ['resident_id', 'recorded_at'])
    op.create_index('ix_clinical_notes_facility_recorded', 'clinical_notes', ['facility_id', 'recorded_at'])

    op.create_table(
        'vital_signs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resident_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('temperature_c', sa.String(10), nullable=True),
        sa.Column('bp_systolic', sa.String(10), nullable=True),
        sa.Column('bp_diastolic', sa.String(10), nullable=True),
        sa.Column('heart_rate', sa.String(10), nullable=True),
        sa.Column('oxygen_saturation', sa.String(10), nullable=True),
        sa.Column('glycemia', sa.String(10), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['resident_id'], ['residents.id'], ),
        sa.ForeignKeyConstraint(['recorded_by_user_id'], ['users.id'], ),
    )
    op.create_index('ix_vital_signs_resident_recorded', 'vital_signs', ['resident_id', 'recorded_at'])

    # E) Medicación
    op.create_table(
        'medication_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resident_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('med_name', sa.String(160), nullable=False),
        sa.Column('dose', sa.String(80), nullable=False),
        sa.Column('route', sa.String(40), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('prescribed_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['resident_id'], ['residents.id'], ),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['prescribed_by_user_id'], ['users.id'], ),
    )
    op.create_index('ix_medication_plans_resident_active', 'medication_plans', ['resident_id', 'is_active'])
    op.create_index('ix_medication_plans_facility_id', 'medication_plans', ['facility_id'])

    op.create_table(
        'medication_schedule_times',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('medication_plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('time_of_day', sa.Time(), nullable=False),
        sa.Column('days_mask', sa.String(16), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['medication_plan_id'], ['medication_plans.id'], ),
        sa.UniqueConstraint('medication_plan_id', 'time_of_day', name='uq_plan_time'),
    )

    op.create_table(
        'medication_administrations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resident_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('medication_plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scheduled_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('administered_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(24), nullable=False, server_default='GIVEN'),
        sa.Column('dose_given', sa.String(80), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['resident_id'], ['residents.id'], ),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['medication_plan_id'], ['medication_plans.id'], ),
        sa.ForeignKeyConstraint(['recorded_by_user_id'], ['users.id'], ),
    )
    op.create_index('ix_medication_admin_resident_admin', 'medication_administrations', ['resident_id', 'administered_at'])
    op.create_index('ix_medication_admin_facility_admin', 'medication_administrations', ['facility_id', 'administered_at'])
    op.create_index('ix_medication_admin_plan_admin', 'medication_administrations', ['medication_plan_id', 'administered_at'])

    # F) Documentos
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resident_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('doc_type', sa.String(32), nullable=False, server_default='OTHER'),
        sa.Column('title', sa.String(160), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('file_url', sa.Text(), nullable=False),
        sa.Column('file_mime', sa.String(80), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('uploaded_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['resident_id'], ['residents.id'], ),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by_user_id'], ['users.id'], ),
    )
    op.create_index('ix_documents_resident_type', 'documents', ['resident_id', 'doc_type'])
    op.create_index('ix_documents_facility_uploaded', 'documents', ['facility_id', 'uploaded_at'])

    # G) Certificados
    op.create_table(
        'certificates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resident_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('certificate_type', sa.String(24), nullable=False),
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('issued_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content_json', postgresql.JSONB(), nullable=False),
        sa.Column('pdf_url', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['resident_id'], ['residents.id'], ),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['issued_by_user_id'], ['users.id'], ),
    )
    op.create_index('ix_certificates_resident_type', 'certificates', ['resident_id', 'certificate_type'])
    op.create_index('ix_certificates_facility_issued', 'certificates', ['facility_id', 'issued_at'])

    # H) Plataformas Externas
    op.create_table(
        'external_platforms',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('code', sa.String(32), nullable=False, unique=True),
        sa.Column('name', sa.String(80), nullable=False),
        sa.Column('base_url', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
    )

    op.create_table(
        'resident_external_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resident_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(24), nullable=False, server_default='PRESCRIPTION'),
        sa.Column('used_url', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('attachment_url', sa.Text(), nullable=True),
        sa.Column('performed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('performed_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['resident_id'], ['residents.id'], ),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['platform_id'], ['external_platforms.id'], ),
        sa.ForeignKeyConstraint(['performed_by_user_id'], ['users.id'], ),
    )
    op.create_index('ix_resident_external_events_resident_performed', 'resident_external_events', ['resident_id', 'performed_at'])
    op.create_index('ix_resident_external_events_facility_performed', 'resident_external_events', ['facility_id', 'performed_at'])

    # I) Economía / Caja
    op.create_table(
        'finance_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_group_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(80), nullable=False),
        sa.Column('type', sa.String(16), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['owner_group_id'], ['owner_groups.id'], ),
        sa.UniqueConstraint('owner_group_id', 'name', 'type', name='uq_owner_group_name_type'),
    )

    op.create_table(
        'finance_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(16), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(8), nullable=False, server_default='ARS'),
        sa.Column('payment_method', sa.String(24), nullable=True),
        sa.Column('occurred_on', sa.Date(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('attachment_url', sa.Text(), nullable=True),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['category_id'], ['finance_categories.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
    )
    op.create_index('ix_finance_transactions_facility_occurred', 'finance_transactions', ['facility_id', 'occurred_on'])
    op.create_index('ix_finance_transactions_category_occurred', 'finance_transactions', ['category_id', 'occurred_on'])

    # J) Auditoría
    op.create_table(
        'audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facility_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('actor_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(64), nullable=False),
        sa.Column('entity_type', sa.String(64), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('metadata_json', postgresql.JSONB(), nullable=True),  # Renombrado para evitar conflicto con metadata reservado
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ),
    )
    op.create_index('ix_audit_log_facility_created', 'audit_log', ['facility_id', 'created_at'])
    op.create_index('ix_audit_log_actor_created', 'audit_log', ['actor_user_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('audit_log')
    op.drop_table('finance_transactions')
    op.drop_table('finance_categories')
    op.drop_table('resident_external_events')
    op.drop_table('external_platforms')
    op.drop_table('certificates')
    op.drop_table('documents')
    op.drop_table('medication_administrations')
    op.drop_table('medication_schedule_times')
    op.drop_table('medication_plans')
    op.drop_table('vital_signs')
    op.drop_table('clinical_notes')
    op.drop_table('clinical_summaries')
    op.drop_table('resident_contacts')
    op.drop_table('residents')
    op.drop_table('facility_user_access')
    op.drop_table('facilities')
    op.drop_table('owner_groups')
    op.drop_table('user_role_assignments')
    op.drop_table('user_roles')
    op.drop_table('users')
