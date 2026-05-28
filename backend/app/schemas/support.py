from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class BugReportRequest(BaseModel):
    message: str = Field(..., min_length=3, max_length=5000)
    path: Optional[str] = Field(None, max_length=512)
    facility_id: Optional[UUID] = None
    build_id: Optional[str] = Field(None, max_length=128)
    build_time: Optional[str] = Field(None, max_length=64)
    user_agent: Optional[str] = Field(None, max_length=512)


class BugReportResponse(BaseModel):
    message: str
