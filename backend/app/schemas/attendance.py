from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class AttendanceCreate(BaseModel):
    facility_id: UUID
    staff_id: UUID
    check_in: datetime
    notes: Optional[str] = None


class AttendanceCheckOut(BaseModel):
    check_out: datetime
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: UUID
    facility_id: UUID
    staff_id: UUID
    staff_name: str  # Denormalizado para facilitar listado
    check_in: datetime
    check_out: Optional[datetime]
    notes: Optional[str]
    recorded_by_user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceReportResponse(BaseModel):
    staff_id: UUID
    staff_name: str
    total_hours: Optional[float]
    check_ins: int
    check_outs: int
    incomplete_sessions: int
