from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class ExternalPlatform(Base):
    __tablename__ = "external_platforms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(32), unique=True, nullable=False)  # PAMI, VCRX, etc.
    name = Column(String(80), nullable=False)
    base_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    events = relationship("ResidentExternalEvent", back_populates="platform")


class ResidentExternalEvent(Base):
    __tablename__ = "resident_external_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    platform_id = Column(UUID(as_uuid=True), ForeignKey("external_platforms.id"), nullable=False)
    event_type = Column(String(24), default="PRESCRIPTION", nullable=False)  # PRESCRIPTION / REFERRAL / OTHER
    used_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    attachment_url = Column(Text, nullable=True)  # foto/pdf opcional
    performed_at = Column(DateTime(timezone=True), nullable=False)
    performed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    resident = relationship("Resident", back_populates="external_events")
    platform = relationship("ExternalPlatform", back_populates="events")
    
    __table_args__ = (
        Index("ix_resident_external_events_resident_performed", "resident_id", "performed_at"),
        Index("ix_resident_external_events_facility_performed", "facility_id", "performed_at"),
    )
