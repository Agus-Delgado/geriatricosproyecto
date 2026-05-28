from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ClinicalSummaryUpdate(BaseModel):
    main_diagnosis: Optional[str] = None
    comorbidities: Optional[str] = None
    allergies: Optional[str] = None
    current_treatment: Optional[str] = None
    care_instructions: Optional[str] = None


class ClinicalSummaryResponse(BaseModel):
    id: UUID
    resident_id: UUID
    main_diagnosis: Optional[str]
    comorbidities: Optional[str]
    allergies: Optional[str]
    current_treatment: Optional[str]
    care_instructions: Optional[str]
    updated_at: datetime
    updated_by_user_id: Optional[UUID]

    class Config:
        from_attributes = True


class ClinicalNoteCreate(BaseModel):
    note_type: str = "EVOLUTION"  # EVOLUTION / INCIDENT / GENERAL
    content: str
    recorded_at: Optional[datetime] = None


class ClinicalNoteResponse(BaseModel):
    id: UUID
    resident_id: UUID
    facility_id: UUID
    note_type: str
    content: str
    recorded_at: datetime
    author_user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class VitalSignCreate(BaseModel):
    recorded_at: datetime
    temperature_c: Optional[str] = None
    bp_systolic: Optional[str] = None
    bp_diastolic: Optional[str] = None
    heart_rate: Optional[str] = None
    oxygen_saturation: Optional[str] = None
    glycemia: Optional[str] = None
    notes: Optional[str] = None


class VitalSignResponse(BaseModel):
    id: UUID
    resident_id: UUID
    recorded_at: datetime
    temperature_c: Optional[str]
    bp_systolic: Optional[str]
    bp_diastolic: Optional[str]
    heart_rate: Optional[str]
    oxygen_saturation: Optional[str]
    glycemia: Optional[str]
    notes: Optional[str]
    recorded_by_user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
