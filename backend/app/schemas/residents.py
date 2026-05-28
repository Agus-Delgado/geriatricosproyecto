from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime


class ResidentCreate(BaseModel):
    facility_id: UUID
    first_name: str
    last_name: str
    dni: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[str] = None
    coverage_type: Optional[str] = Field(None, description="PAMI, OBRA SOCIAL, PARTICULAR, IOMA, OTRA")
    coverage_other: Optional[str] = Field(None, description="Especificación cuando coverage_type == 'OTRA'")
    coverage_number: Optional[str] = None
    admission_date: date
    notes: Optional[str] = None
    contacts: Optional[List['ResidentContactCreate']] = Field(default_factory=list, description="Lista de contactos/familiares")

    @model_validator(mode='after')
    def validate_coverage_other(self):
        if self.coverage_type == 'OTRA' and not self.coverage_other:
            raise ValueError("coverage_other es requerido cuando coverage_type es 'OTRA'")
        return self


class ResidentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dni: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[str] = None
    coverage_type: Optional[str] = Field(None, description="PAMI, OBRA SOCIAL, PARTICULAR, IOMA, OTRA")
    coverage_other: Optional[str] = Field(None, description="Especificación cuando coverage_type == 'OTRA'")
    coverage_number: Optional[str] = None
    admission_date: Optional[date] = None
    stay_status: Optional[str] = Field(None, pattern="^(ACTIVE|ENDED)$")
    status: Optional[str] = Field(None, pattern="^(ACTIVE|INACTIVE)$", description="ACTIVE o INACTIVE (si inactivo, ver end_reason para detalles)")
    end_date: Optional[date] = None
    end_reason: Optional[str] = Field(None, pattern="^(DISCHARGE|PASSING|TRANSFER)$", description="DISCHARGE (alta), PASSING (fallecimiento), TRANSFER (traslado)")
    notes: Optional[str] = None
    
    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v, info):
        if v and "admission_date" in info.data and info.data["admission_date"]:
            if v < info.data["admission_date"]:
                raise ValueError("La fecha de finalización no puede ser anterior a la fecha de ingreso")
        return v

    @model_validator(mode='after')
    def validate_coverage_other(self):
        if self.coverage_type == 'OTRA' and not self.coverage_other:
            raise ValueError("coverage_other es requerido cuando coverage_type es 'OTRA'")
        return self


class ResidentResponse(BaseModel):
    id: UUID
    facility_id: UUID
    first_name: str
    last_name: str
    dni: Optional[str]
    birth_date: Optional[date]
    sex: Optional[str]
    coverage_type: Optional[str]
    coverage_other: Optional[str]
    coverage_number: Optional[str]
    admission_date: date
    stay_status: str
    status: str
    end_date: Optional[date]
    end_reason: Optional[str]
    notes: Optional[str]
    document_url: Optional[str] = None
    document_name: Optional[str] = None
    document_mime: Optional[str] = None
    document_size: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    created_by_user_id: Optional[UUID]
    updated_by_user_id: Optional[UUID]
    deleted_at: Optional[datetime] = None
    deleted_by_user_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class ResidentContactCreate(BaseModel):
    full_name: str
    relationship_type: Optional[str] = None  # Renombrado para evitar conflicto
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_primary: bool = False


class ResidentContactUpdate(BaseModel):
    full_name: Optional[str] = None
    relationship_type: Optional[str] = None  # Renombrado para evitar conflicto
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_primary: Optional[bool] = None


class ResidentContactResponse(BaseModel):
    id: UUID
    resident_id: UUID
    full_name: str
    relationship_type: Optional[str]  # Renombrado para evitar conflicto
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    is_primary: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Resolver referencias forward para ResidentCreate.contacts
ResidentCreate.model_rebuild()
