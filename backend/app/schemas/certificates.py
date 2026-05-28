from pydantic import BaseModel
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime


class CertificateCreate(BaseModel):
    resident_id: UUID
    facility_id: UUID
    certificate_type: str  # CONTROL_CLINICO / OBITO / PRESENCIA
    body_text: str  # Texto del cuerpo de la constancia
    issued_at: datetime
    content_json: Optional[Dict[str, Any]] = None  # Campos adicionales opcionales


class CertificateUpdate(BaseModel):
    body_text: Optional[str] = None
    issued_at: Optional[datetime] = None
    content_json: Optional[Dict[str, Any]] = None


class CertificateResponse(BaseModel):
    id: UUID
    resident_id: UUID
    facility_id: UUID
    certificate_type: str
    issued_at: datetime
    issued_by_user_id: UUID
    body_text: str
    content_json: Optional[Dict[str, Any]] = None
    pdf_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
