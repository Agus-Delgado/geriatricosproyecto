from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime, time


class MedicationPlanCreate(BaseModel):
    med_name: str
    dose: str
    route: Optional[str] = None
    instructions: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class MedicationPlanUpdate(BaseModel):
    med_name: Optional[str] = None
    dose: Optional[str] = None
    route: Optional[str] = None
    instructions: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class MedicationPlanResponse(BaseModel):
    id: UUID
    resident_id: UUID
    facility_id: UUID
    med_name: str
    dose: str
    route: Optional[str]
    instructions: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    is_active: bool
    prescribed_by_user_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MedicationScheduleTimeCreate(BaseModel):
    time_of_day: time
    days_mask: Optional[str] = None


class MedicationScheduleTimeResponse(BaseModel):
    id: UUID
    medication_plan_id: UUID
    time_of_day: time
    days_mask: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MedicationAdministrationCreate(BaseModel):
    medication_plan_id: UUID
    scheduled_time: Optional[datetime] = None
    administered_at: datetime
    status: str = "GIVEN"  # GIVEN / OMITTED / REFUSED
    dose_given: Optional[str] = None
    notes: Optional[str] = None


class MedicationAdministrationResponse(BaseModel):
    id: UUID
    resident_id: UUID
    facility_id: UUID
    medication_plan_id: UUID
    scheduled_time: Optional[datetime]
    administered_at: datetime
    status: str
    dose_given: Optional[str]
    notes: Optional[str]
    recorded_by_user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class MedicationDueResponse(BaseModel):
    resident_id: UUID
    resident_name: str
    medication_plan_id: UUID
    med_name: str
    dose: str
    scheduled_time: datetime
    status: Optional[str] = None  # GIVEN / OMITTED / REFUSED si ya fue administrada

    class Config:
        from_attributes = True
