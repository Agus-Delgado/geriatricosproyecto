from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class DocumentCreate(BaseModel):
    doc_type: str = "OTHER"  # STUDY / REPORT / ID / OTHER
    title: str
    description: Optional[str] = None
    file_url: str  # Storage placeholder - URL del archivo
    file_mime: Optional[str] = None
    file_size: Optional[int] = None


class DocumentResponse(BaseModel):
    id: UUID
    resident_id: UUID
    facility_id: UUID
    doc_type: str
    title: str
    description: Optional[str]
    file_url: str
    file_mime: Optional[str]
    file_size: Optional[int]
    uploaded_by_user_id: UUID
    uploaded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
