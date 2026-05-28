from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class Certificate(Base):
    __tablename__ = "certificates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    certificate_type = Column(String(24), nullable=False)  # CONTROL_CLINICO / OBITO / PRESENCIA
    issued_at = Column(DateTime(timezone=True), nullable=False)
    issued_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    body_text = Column(Text, nullable=False)  # Texto del cuerpo de la constancia
    content_json = Column(JSONB, nullable=True)  # Campos adicionales (opcional, para compatibilidad)
    pdf_url = Column(Text, nullable=True)  # Opcional, ya que usamos HTML/CSS para impresión
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    resident = relationship("Resident", back_populates="certificates")
    
    __table_args__ = (
        Index("ix_certificates_resident_type", "resident_id", "certificate_type"),
        Index("ix_certificates_facility_issued", "facility_id", "issued_at"),
    )
