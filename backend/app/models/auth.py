from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Date, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, date
import uuid
from app.db.base import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dni = Column(String(16), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(32), nullable=True)
    full_name = Column(String(160), nullable=False)
    birth_date = Column(Date, nullable=True)
    license_number = Column(String(32), nullable=True)  # Matrícula médica
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    is_platform_admin = Column(Boolean, default=False, nullable=False)
    active_facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    role_assignments = relationship("UserRoleAssignment", back_populates="user", cascade="all, delete-orphan")
    facility_accesses = relationship("FacilityUserAccess", back_populates="user", cascade="all, delete-orphan")


class UserRole(Base):
    __tablename__ = "user_roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(32), unique=True, nullable=False)
    name = Column(String(80), nullable=False)
    
    # Relationships
    assignments = relationship("UserRoleAssignment", back_populates="role", cascade="all, delete-orphan")


class UserRoleAssignment(Base):
    __tablename__ = "user_role_assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey("user_roles.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="role_assignments")
    role = relationship("UserRole", back_populates="assignments")
    
    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, index=True)  # SHA256 hex = 64 chars
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    last_sent_at = Column(DateTime(timezone=True), nullable=True)
    send_count = Column(Integer, default=0, nullable=False)
    window_started_at = Column(DateTime(timezone=True), nullable=True)  # Para rate limit por hora
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, index=True)  # SHA256 hex = 64 chars
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)  # Para invalidar token tras uso
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(64), nullable=False)
    ip_address = Column(String(45), nullable=True)  # IPv6 puede ser hasta 45 chars
    user_agent = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    actor_admin = relationship("User", foreign_keys=[actor_admin_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
