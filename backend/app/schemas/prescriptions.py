from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class PrescriptionLogCreate(BaseModel):
    medications_text: str = Field(..., min_length=10, description="Texto de medicamentos, mínimo 10 caracteres")
    instructions: Optional[str] = Field(None, description="Instrucciones adicionales")
    source: Optional[str] = Field("OTHER", description="Fuente de la receta: PAMI, MISRX, RECETO, OTHER")
    repeat_of: Optional[UUID] = Field(None, description="ID de la receta original si es una repetición")


class PrescriptionLogResponse(BaseModel):
    id: UUID
    patient_id: UUID
    facility_id: UUID
    author_user_id: UUID
    created_at: datetime
    medications_text: str
    instructions: Optional[str]
    source: str
    repeat_of: Optional[UUID]
    author_name: Optional[str] = None  # Para incluir nombre del autor si se incluye en el query
    
    class Config:
        from_attributes = True