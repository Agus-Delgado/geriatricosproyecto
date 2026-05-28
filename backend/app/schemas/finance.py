from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


class FinanceCategoryCreate(BaseModel):
    name: str
    type: str  # INCOME / EXPENSE
    is_active: bool = True


class FinanceCategoryUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class FinanceCategoryResponse(BaseModel):
    id: UUID
    owner_group_id: UUID
    name: str
    type: str
    is_active: bool

    class Config:
        from_attributes = True


class FinanceTransactionCreate(BaseModel):
    facility_id: UUID
    category_id: UUID
    type: str = Field(..., pattern="^(INCOME|EXPENSE)$")  # INCOME / EXPENSE
    amount: Decimal = Field(..., gt=0, description="Monto debe ser mayor a cero")
    currency: str = "ARS"
    payment_method: Optional[str] = Field(None, pattern="^(CASH|TRANSFER|CARD|OTHER)$")
    occurred_on: date
    description: Optional[str] = None
    attachment_url: Optional[str] = None
    
    @field_validator("occurred_on")
    @classmethod
    def validate_occurred_on(cls, v):
        if v > date.today():
            raise ValueError("La fecha no puede ser futura")
        return v


class FinanceTransactionResponse(BaseModel):
    id: UUID
    facility_id: UUID
    category_id: UUID
    category_name: str
    type: str
    amount: Decimal
    currency: str
    payment_method: Optional[str]
    occurred_on: date
    description: Optional[str]
    attachment_url: Optional[str]
    created_by_user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class FinanceSummaryResponse(BaseModel):
    facility_id: UUID
    facility_name: str
    month: str
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    top_categories: List[dict]


class FinanceGroupSummaryResponse(BaseModel):
    month: str
    facilities: List[FinanceSummaryResponse]
    total_income: Decimal
    total_expense: Decimal
    total_balance: Decimal
