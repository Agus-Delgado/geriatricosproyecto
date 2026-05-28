from sqlalchemy import Column, String, Date, Text, DateTime, Boolean, Numeric, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class FinanceCategory(Base):
    __tablename__ = "finance_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_group_id = Column(UUID(as_uuid=True), ForeignKey("owner_groups.id"), nullable=False)
    name = Column(String(80), nullable=False)
    type = Column(String(16), nullable=False)  # INCOME / EXPENSE
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    owner_group = relationship("OwnerGroup", back_populates="finance_categories")
    transactions = relationship("FinanceTransaction", back_populates="category")
    
    __table_args__ = (
        UniqueConstraint("owner_group_id", "name", "type", name="uq_owner_group_name_type"),
    )


class FinanceTransaction(Base):
    __tablename__ = "finance_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("finance_categories.id"), nullable=False)
    type = Column(String(16), nullable=False)  # INCOME / EXPENSE
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(8), default="ARS", nullable=False)
    payment_method = Column(String(24), nullable=True)  # CASH / TRANSFER / CARD / OTHER
    occurred_on = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    attachment_url = Column(Text, nullable=True)  # foto factura/recibo
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    facility = relationship("Facility", back_populates="finance_transactions")
    category = relationship("FinanceCategory", back_populates="transactions")
    
    __table_args__ = (
        Index("ix_finance_transactions_facility_occurred", "facility_id", "occurred_on"),
        Index("ix_finance_transactions_category_occurred", "category_id", "occurred_on"),
    )
