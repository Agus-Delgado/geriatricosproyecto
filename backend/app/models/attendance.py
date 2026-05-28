from sqlalchemy import Column, String, DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class Attendance(Base):
    __tablename__ = "attendances"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    check_in = Column(DateTime(timezone=True), nullable=False)
    check_out = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    recorded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    facility = relationship("Facility", back_populates="attendances")
    staff = relationship("Staff", back_populates="attendances")
    
    __table_args__ = (
        Index("ix_attendances_facility_date", "facility_id", "check_in"),
        Index("ix_attendances_staff_date", "staff_id", "check_in"),
        Index("ix_attendances_date_range", "check_in", "check_out"),
    )
