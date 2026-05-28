from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class AgendaEntryCreate(BaseModel):
    patient_id: UUID = Field(..., description="ID del paciente")
    facility_id: UUID = Field(..., description="ID de la facility (se valida que coincida con activeFacilityId)")
    seen_at: Optional[datetime] = Field(None, description="Fecha/hora de la atención (default: ahora)")
    note: Optional[str] = Field(None, description="Nota opcional sobre la atención")


class AgendaEntryUpdate(BaseModel):
    note: Optional[str] = Field(None, description="Nota opcional sobre la atención")
    seen_at: Optional[datetime] = Field(None, description="Fecha/hora de la atención")


class AgendaEntryResponse(BaseModel):
    id: UUID
    facility_id: UUID
    doctor_user_id: UUID
    patient_id: UUID
    seen_at: datetime
    note: Optional[str]
    created_at: datetime
    patient_name: Optional[str] = None  # Enriquecido con nombre del paciente
    doctor_name: Optional[str] = None  # Enriquecido con nombre del doctor
    
    class Config:
        from_attributes = True