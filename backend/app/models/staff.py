from sqlalchemy import Column, String, Date, Text, DateTime, Boolean, ForeignKey, Index, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class Staff(Base):
    __tablename__ = "staff"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    dni = Column(String(16), nullable=True)
    cuil = Column(String(16), nullable=True)
    phone = Column(String(32), nullable=True)
    email = Column(String(255), nullable=True)

    # Clasificación profesional
    position = Column(String(80), nullable=True)  # Cuidador, Enfermero, etc.
    specialty = Column(String(128), nullable=True)  # Especialidad médica
    license_number = Column(String(64), nullable=True)  # Matrícula profesional

    # Empleo
    hire_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(24), nullable=False, default="ACTIVE")  # ACTIVE, LEAVE (licencia), INACTIVE

    # Compatibilidad con código antiguo
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)

    # Auditoría
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    facility = relationship("Facility", back_populates="staff")
    attendances = relationship("Attendance", back_populates="staff", cascade="all, delete-orphan")
    shift_assignments = relationship("ShiftAssignment", back_populates="staff_member", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_staff_facility_id", "facility_id"),
        Index("ix_staff_active", "facility_id", "is_active"),
        Index("ix_staff_status", "status"),
        Index("ix_staff_name", "last_name", "first_name"),
        Index("ix_staff_dni", "dni"),
    )


class Shift(Base):
    """Turnos de trabajo (mañana, tarde, noche)"""
    __tablename__ = "shifts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    name = Column(String(64), nullable=False)  # Ej: "Mañana", "Tarde", "Noche"
    start_time = Column(Time, nullable=False)  # Ej: 06:00
    end_time = Column(Time, nullable=False)  # Ej: 14:00
    color = Column(String(16), nullable=True)  # Color hex para visualización
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    facility = relationship("Facility", back_populates="shifts")
    shift_assignments = relationship("ShiftAssignment", back_populates="shift", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_shifts_facility_id", "facility_id"),
        Index("ix_shifts_active", "is_active"),
    )


class ShiftAssignment(Base):
    """Asignación de personal a turnos específicos en fechas específicas"""
    __tablename__ = "shift_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    shift_id = Column(UUID(as_uuid=True), ForeignKey("shifts.id"), nullable=False)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)

    # Fecha del turno
    date = Column(Date, nullable=False)

    # Notas para ese turno específico
    notes = Column(String(256), nullable=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    staff_member = relationship("Staff", back_populates="shift_assignments")
    shift = relationship("Shift", back_populates="shift_assignments")
    facility = relationship("Facility", back_populates="shift_assignments")

    __table_args__ = (
        Index("ix_shift_assignments_staff_id", "staff_id"),
        Index("ix_shift_assignments_shift_id", "shift_id"),
        Index("ix_shift_assignments_facility_id", "facility_id"),
        Index("ix_shift_assignments_date", "date"),
        # Evitar duplicados: mismo staff, mismo turno, misma fecha
        Index("uix_shift_assignment_unique", "staff_id", "shift_id", "date", unique=True),
    )
