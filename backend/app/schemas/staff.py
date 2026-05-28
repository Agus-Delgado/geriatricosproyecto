from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date, datetime, time
from typing import Optional, List


# ========== STAFF SCHEMAS ==========

class StaffCreate(BaseModel):
    facility_id: UUID
    first_name: str
    last_name: str
    dni: Optional[str] = None
    cuil: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None  # Cuidador, Enfermero, Médico, etc.
    specialty: Optional[str] = None
    license_number: Optional[str] = None
    hire_date: Optional[date] = None
    notes: Optional[str] = None


class StaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dni: Optional[str] = None
    cuil: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    specialty: Optional[str] = None
    license_number: Optional[str] = None
    hire_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(ACTIVE|LEAVE|INACTIVE)$")
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class StaffResponse(BaseModel):
    id: UUID
    facility_id: UUID
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
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========== SHIFT SCHEMAS ==========

class ShiftCreate(BaseModel):
    facility_id: UUID
    name: str
    start_time: time
    end_time: time
    color: Optional[str] = None


class ShiftUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class ShiftResponse(BaseModel):
    id: UUID
    facility_id: UUID
    name: str
    start_time: time
    end_time: time
    color: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========== SHIFT ASSIGNMENT SCHEMAS ==========

class ShiftAssignmentCreate(BaseModel):
    staff_id: UUID
    shift_id: UUID
    facility_id: UUID
    date: date
    notes: Optional[str] = None


class ShiftAssignmentUpdate(BaseModel):
    notes: Optional[str] = None


class ShiftAssignmentResponse(BaseModel):
    id: UUID
    staff_id: UUID
    shift_id: UUID
    facility_id: UUID
    date: date
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShiftAssignmentWithDetails(ShiftAssignmentResponse):
    """Incluye detalles del staff y shift"""
    staff_member: StaffResponse
    shift: ShiftResponse

    class Config:
        from_attributes = True


# ========== DASHBOARD SCHEMAS ==========

class CurrentlyWorkingStaff(BaseModel):
    """Personal actualmente trabajando"""
    id: UUID
    first_name: str
    last_name: str
    position: Optional[str]
    phone: Optional[str]
    shift_name: str
    shift_start: time
    shift_end: time
    check_in_time: Optional[datetime]
    is_checked_in: bool


class StaffWorkloadSummary(BaseModel):
    """Resumen de carga laboral del personal"""
    staff_id: UUID
    staff_name: str
    total_shifts_month: int
    total_hours_month: int
    shifts_this_week: int


class FacilityStaffDashboard(BaseModel):
    """Dashboard de personal por facility"""
    facility_id: UUID
    facility_name: str
    total_staff: int
    active_staff: int
    currently_working: List[CurrentlyWorkingStaff]
    shifts_today: int
    coverage_status: str  # FULL, UNDERSTAFFED, OVERSTAFFED
