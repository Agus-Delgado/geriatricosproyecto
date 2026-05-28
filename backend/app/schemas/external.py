from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ExternalPlatformCreate(BaseModel):
    code: str
    name: str
    base_url: Optional[str] = None
    is_active: bool = True


class ExternalPlatformUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    is_active: Optional[bool] = None


class ExternalPlatformResponse(BaseModel):
    id: UUID
    code: str
    name: str
    base_url: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class ResidentExternalEventCreate(BaseModel):
    platform_id: UUID
    event_type: str = "PRESCRIPTION"  # PRESCRIPTION / REFERRAL / OTHER
    used_url: Optional[str] = None
    notes: Optional[str] = None
    attachment_url: Optional[str] = None
    performed_at: datetime


class ResidentExternalEventResponse(BaseModel):
    id: UUID
    resident_id: UUID
    facility_id: UUID
    platform_id: UUID
    platform_name: str
    event_type: str
    used_url: Optional[str]
    notes: Optional[str]
    attachment_url: Optional[str]
    performed_at: datetime
    performed_by_user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
