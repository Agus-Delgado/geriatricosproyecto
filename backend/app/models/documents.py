from sqlalchemy import Column, String, Text, DateTime, BigInteger, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    doc_type = Column(String(32), default="OTHER", nullable=False)  # STUDY / REPORT / ID / OTHER
    title = Column(String(160), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(Text, nullable=False)
    file_mime = Column(String(80), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    uploaded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    resident = relationship("Resident", back_populates="documents")
    
    __table_args__ = (
        Index("ix_documents_resident_type", "resident_id", "doc_type"),
        Index("ix_documents_facility_uploaded", "facility_id", "uploaded_at"),
    )
