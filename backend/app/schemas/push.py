from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class PushKeyPair(BaseModel):
    p256dh: str
    auth: str


class PushSubscribeRequest(BaseModel):
    facility_id: UUID
    endpoint: str
    keys: PushKeyPair
    user_agent: Optional[str] = None


class PushUnsubscribeRequest(BaseModel):
    facility_id: UUID
    endpoint: str


class PushPublicKeyResponse(BaseModel):
    public_key: str


class PushGenericResponse(BaseModel):
    message: str


class PushPreferencesResponse(BaseModel):
    facility_id: UUID
    disabled_event_types: List[str]


class PushPreferencesUpdateRequest(BaseModel):
    facility_id: UUID
    disabled_event_types: List[str]


class PushTestRequest(BaseModel):
    facility_id: UUID


class PushTestResponse(BaseModel):
    attempted: int
    delivered: int
    deleted: int
