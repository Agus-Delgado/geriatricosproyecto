from pydantic import BaseModel, Field
from pydantic.config import ConfigDict
from typing import Optional, Any, List
from uuid import UUID
from datetime import datetime


class ActivityEventResponse(BaseModel):
    id: UUID
    facility_id: UUID
    actor_user_id: UUID
    event_type: str
    entity_type: str
    entity_id: UUID
    summary: Optional[str]
    meta: Optional[Any] = Field(default=None, validation_alias='meta')
    created_at: datetime
    is_saved: bool = False
    saved_note: Optional[str] = None
    saved_expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ActivityQuery(BaseModel):
    facility_id: UUID
    since: Optional[datetime] = None
    limit: Optional[int] = 50
    event_types: Optional[List[str]] = None


class SaveActivityEventRequest(BaseModel):
    note: Optional[str] = None


class SaveActivityEventResponse(BaseModel):
    message: str
    expires_at: datetime


class UnsaveActivityEventResponse(BaseModel):
    message: str

