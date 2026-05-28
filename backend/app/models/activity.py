from sqlalchemy import Column, String, DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.db.base import Base


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    event_type = Column(String(64), nullable=False)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    summary = Column(Text, nullable=True)
    meta = Column(JSONB, nullable=True)  # Usar columna 'meta' en la DB y atributo 'meta'
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_activity_events_facility_created", "facility_id", "created_at"),
        Index("ix_activity_events_actor_created", "actor_user_id", "created_at"),
        Index("ix_activity_events_event_type_created", "event_type", "created_at"),
    )


class ActivityEventSave(Base):
    __tablename__ = "activity_event_saves"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    activity_event_id = Column(UUID(as_uuid=True), ForeignKey("activity_events.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_activity_event_saves_facility_created", "facility_id", "created_at"),
        Index("ix_activity_event_saves_user_expires", "user_id", "expires_at"),
        Index("uix_activity_event_saves_user_event", "user_id", "activity_event_id", unique=True),
    )

