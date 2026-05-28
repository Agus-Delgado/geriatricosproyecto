from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class AgendaEntry(Base):
    __tablename__ = "agenda_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    doctor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    seen_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    facility = relationship("Facility")
    doctor = relationship("User", foreign_keys=[doctor_user_id])
    patient = relationship("Resident", foreign_keys=[patient_id])
    
    __table_args__ = (
        Index("ix_agenda_entries_facility_doctor_seen", "facility_id", "doctor_user_id", "seen_at"),
        Index("ix_agenda_entries_facility_patient_seen", "facility_id", "patient_id", "seen_at"),
    )