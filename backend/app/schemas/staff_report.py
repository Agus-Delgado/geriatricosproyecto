from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime, time
from typing import Optional, List


class StaffReportStaff(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    dni: Optional[str]
    cuil: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    position: Optional[str]
    specialty: Optional[str]
    license_number: Optional[str]
    hire_date: Optional[date]
    end_date: Optional[date]
    status: str
    is_active: bool
    notes: Optional[str]


class StaffReportShiftAssignment(BaseModel):
    id: UUID
    facility_id: UUID
    facility_name: str
    date: date
    shift_name: str
    shift_start_time: time
    shift_end_time: time
    notes: Optional[str]
    attendance_status: str
    attendance_check_in: Optional[datetime]
    attendance_check_out: Optional[datetime]


class StaffReportAttendance(BaseModel):
    id: UUID
    facility_id: UUID
    facility_name: str
    check_in: datetime
    check_out: Optional[datetime]
    notes: Optional[str]


class StaffReportSummary(BaseModel):
    total_assignments: int
    assignments_covered: int
    assignments_incomplete: int
    assignments_no_record: int
    total_attendances: int
    total_hours: Optional[float]


class StaffReportResponse(BaseModel):
    staff: StaffReportStaff
    from_date: date
    to_date: date
    generated_at: datetime
    assignments: List[StaffReportShiftAssignment]
    attendances: List[StaffReportAttendance]
    summary: StaffReportSummary
