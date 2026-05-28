from sqlalchemy import Column, String, Date, Text, DateTime, Boolean, Time, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class MedicationPlan(Base):
    __tablename__ = "medication_plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    med_name = Column(String(160), nullable=False)
    dose = Column(String(80), nullable=False)
    route = Column(String(40), nullable=True)  # VO, IM, SC, etc.
    instructions = Column(Text, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    prescribed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    resident = relationship("Resident", back_populates="medication_plans")
    schedule_times = relationship("MedicationScheduleTime", back_populates="medication_plan", cascade="all, delete-orphan")
    administrations = relationship("MedicationAdministration", back_populates="medication_plan", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("ix_medication_plans_resident_active", "resident_id", "is_active"),
        Index("ix_medication_plans_facility_id", "facility_id"),
    )


class MedicationScheduleTime(Base):
    __tablename__ = "medication_schedule_times"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medication_plan_id = Column(UUID(as_uuid=True), ForeignKey("medication_plans.id"), nullable=False)
    time_of_day = Column(Time, nullable=False)  # 08:00, 14:00, 20:00
    days_mask = Column(String(16), nullable=True)  # opcional
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    medication_plan = relationship("MedicationPlan", back_populates="schedule_times")
    
    __table_args__ = (
        UniqueConstraint("medication_plan_id", "time_of_day", name="uq_plan_time"),
    )


class MedicationAdministration(Base):
    __tablename__ = "medication_administrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resident_id = Column(UUID(as_uuid=True), ForeignKey("residents.id"), nullable=False)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    medication_plan_id = Column(UUID(as_uuid=True), ForeignKey("medication_plans.id"), nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=True)  # si aplica
    administered_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(24), default="GIVEN", nullable=False)  # GIVEN / OMITTED / REFUSED
    dose_given = Column(String(80), nullable=True)
    notes = Column(Text, nullable=True)
    recorded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    resident = relationship("Resident", back_populates="medication_administrations")
    medication_plan = relationship("MedicationPlan", back_populates="administrations")
    
    __table_args__ = (
        Index("ix_medication_admin_resident_admin", "resident_id", "administered_at"),
        Index("ix_medication_admin_facility_admin", "facility_id", "administered_at"),
        Index("ix_medication_admin_plan_admin", "medication_plan_id", "administered_at"),
    )
