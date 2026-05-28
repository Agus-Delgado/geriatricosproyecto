from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class PrescriptionLog(Base):
    __tablename__ = "prescription_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    author_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    medications_text = Column(Text, nullable=False)
    instructions = Column(Text, nullable=True)
    source = Column(String(16), nullable=False, default="OTHER")  # PAMI | MISRX | RECETO | OTHER
    repeat_of = Column(UUID(as_uuid=True), ForeignKey("prescription_logs.id"), nullable=True)
    
    # Relationships
    patient = relationship("Resident", foreign_keys=[patient_id])
    facility = relationship("Facility")
    author = relationship("User", foreign_keys=[author_user_id])
    original_prescription = relationship("PrescriptionLog", remote_side=[id], foreign_keys=[repeat_of])
    
    __table_args__ = (
        Index("ix_prescription_logs_patient_created", "patient_id", "created_at"),
        Index("ix_prescription_logs_facility_created", "facility_id", "created_at"),
    )