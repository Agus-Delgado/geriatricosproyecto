from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class FacilityResponse(BaseModel):
    id: UUID
    owner_group_id: UUID
    name: str
    code: str
    slug: str | None
    address: str | None
    phone: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
