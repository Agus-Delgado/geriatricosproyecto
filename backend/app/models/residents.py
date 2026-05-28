from sqlalchemy import Column, String, Date, Text, DateTime, Boolean, ForeignKey, Index, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship as _relationship
from datetime import datetime
import uuid
from app.db.base import Base


class Resident(Base):
    __tablename__ = "residents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    dni = Column(String(16), nullable=True)
    birth_date = Column(Date, nullable=True)
    sex = Column(String(16), nullable=True)
    coverage_type = Column(String(32), nullable=True)  # PAMI/OBRA SOCIAL/PARTICULAR/IOMA/OTRA
    coverage_other = Column(String(128), nullable=True)  # Especificación cuando coverage_type == 'OTRA'
    coverage_number = Column(String(64), nullable=True)
    admission_date = Column(Date, nullable=False)

    # Campos sutiles para finalización de estadía (NO usar "death_date")
    stay_status = Column(String(24), nullable=False, default="ACTIVE")
    end_date = Column(Date, nullable=True)
    end_reason = Column(String(24), nullable=True)  # DISCHARGE / PASSING / TRANSFER
    notes = Column(Text, nullable=True)

    # Estado del paciente (visible en listados): ACTIVE | INACTIVE
    # Si INACTIVE, verificar end_reason para detalles (DISCHARGE/PASSING/TRANSFER)
    status = Column(String(24), nullable=False, default="ACTIVE")

    # Documento (carnet)
    document_url = Column(String(512), nullable=True)
    document_name = Column(String(255), nullable=True)
    document_mime = Column(String(80), nullable=True)
    document_size = Column(BigInteger, nullable=True)

    # Soft delete (Papelera)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    facility = _relationship("Facility", back_populates="residents")
    contacts = _relationship("ResidentContact", back_populates="resident", cascade="all, delete-orphan")
    clinical_summary = _relationship("ClinicalSummary", back_populates="resident", uselist=False, cascade="all, delete-orphan")
    clinical_notes = _relationship("ClinicalNote", back_populates="resident", cascade="all, delete-orphan")
    vital_signs = _relationship("VitalSign", back_populates="resident", cascade="all, delete-orphan")
    medication_plans = _relationship("MedicationPlan", back_populates="resident", cascade="all, delete-orphan")
    medication_administrations = _relationship("MedicationAdministration", back_populates="resident", cascade="all, delete-orphan")
    documents = _relationship("Document", back_populates="resident", cascade="all, delete-orphan")
    certificates = _relationship("Certificate", back_populates="resident", cascade="all, delete-orphan")
    external_events = _relationship("ResidentExternalEvent", back_populates="resident", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("ix_residents_facility_id", "facility_id"),
        Index("ix_residents_stay_status", "stay_status"),
        Index("ix_residents_status", "status"),
        Index("ix_residents_deleted_at", "deleted_at"),
        Index("ix_residents_name", "last_name", "first_name"),
    )


class ResidentContact(Base):
    __tablename__ = "resident_contacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    full_name = Column(String(160), nullable=False)
    relationship_type = Column(String(80), nullable=True)  # hijo/a, cónyuge, tutor, etc. (renombrado para evitar conflicto)
    phone = Column(String(32), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    resident = _relationship("Resident", back_populates="contacts")
    
    __table_args__ = (
        Index("ix_resident_contacts_resident_id", "resident_id"),
    )
