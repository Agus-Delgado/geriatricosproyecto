from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True)  # acciones globales también
    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String(64), nullable=False)  # CREATE_RESIDENT, UPDATE_TREATMENT, CREATE_CERTIFICATE, etc.
    entity_type = Column(String(64), nullable=False)  # Resident, ClinicalNote, FinanceTransaction, etc.
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    metadata_json = Column(JSONB, nullable=True)  # ip, user_agent, diff, etc. (renombrado para evitar conflicto con metadata reservado)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index("ix_audit_log_facility_created", "facility_id", "created_at"),
        Index("ix_audit_log_actor_created", "actor_user_id", "created_at"),
    )
