from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class OwnerGroup(Base):
    __tablename__ = "owner_groups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    facilities = relationship("Facility", back_populates="owner_group", cascade="all, delete-orphan")
    finance_categories = relationship("FinanceCategory", back_populates="owner_group", cascade="all, delete-orphan")


class Facility(Base):
    __tablename__ = "facilities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_group_id = Column(UUID(as_uuid=True), ForeignKey("owner_groups.id"), nullable=False)
    name = Column(String(120), nullable=False)
    code = Column(String(32), nullable=False)
    slug = Column(String(80), nullable=True, unique=True, index=True)
    address = Column(String(255), nullable=True)
    phone = Column(String(32), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    owner_group = relationship("OwnerGroup", back_populates="facilities")
    user_accesses = relationship("FacilityUserAccess", back_populates="facility", cascade="all, delete-orphan")
    residents = relationship("Resident", back_populates="facility", cascade="all, delete-orphan")
    finance_transactions = relationship("FinanceTransaction", back_populates="facility", cascade="all, delete-orphan")
    staff = relationship("Staff", back_populates="facility", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="facility", cascade="all, delete-orphan")
    shifts = relationship("Shift", back_populates="facility", cascade="all, delete-orphan")
    shift_assignments = relationship("ShiftAssignment", back_populates="facility", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("owner_group_id", "code", name="uq_owner_group_code"),
        Index("ix_facilities_owner_group_id", "owner_group_id"),
    )


class FacilityUserAccess(Base):
    __tablename__ = "facility_user_access"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String(32), nullable=False)  # 'ADMIN', 'MEDICO', 'STAFF'
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    facility = relationship("Facility", back_populates="user_accesses")
    user = relationship("User", back_populates="facility_accesses")
    
    __table_args__ = (
        UniqueConstraint("facility_id", "user_id", name="uq_facility_user"),
        Index("ix_facility_user_access_facility_id", "facility_id"),
        Index("ix_facility_user_access_user_id", "user_id"),
    )
