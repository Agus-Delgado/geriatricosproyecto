from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class ClinicalSummary(Base):
    __tablename__ = "clinical_summaries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), unique=True, nullable=False)
    main_diagnosis = Column(Text, nullable=True)
    comorbidities = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    current_treatment = Column(Text, nullable=True)
    care_instructions = Column(Text, nullable=True)  # dieta, movilidad, cuidados
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    resident = relationship("Resident", back_populates="clinical_summary")


class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)  # denormalización para filtros
    note_type = Column(String(32), default="EVOLUTION", nullable=False)  # EVOLUTION / INCIDENT / GENERAL
    content = Column(Text, nullable=False)
    recorded_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    author_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    resident = relationship("Resident", back_populates="clinical_notes")
    
    __table_args__ = (
        Index("ix_clinical_notes_resident_recorded", "resident_id", "recorded_at"),
        Index("ix_clinical_notes_facility_recorded", "facility_id", "recorded_at"),
    )


class VitalSign(Base):
    __tablename__ = "vital_signs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    temperature_c = Column(String(10), nullable=True)  # numeric 4,1 as string for simplicity
    bp_systolic = Column(String(10), nullable=True)  # int as string
    bp_diastolic = Column(String(10), nullable=True)  # int as string
    heart_rate = Column(String(10), nullable=True)  # int as string
    oxygen_saturation = Column(String(10), nullable=True)  # int as string
    glycemia = Column(String(10), nullable=True)  # int as string
    notes = Column(Text, nullable=True)
    recorded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    resident = relationship("Resident", back_populates="vital_signs")
    
    __table_args__ = (
        Index("ix_vital_signs_resident_recorded", "resident_id", "recorded_at"),
    )
