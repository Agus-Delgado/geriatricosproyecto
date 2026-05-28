from pydantic import BaseModel
from typing import Optional


class DayStatsResponse(BaseModel):
    facilityId: str
    date: str
    patients_viewed_today: Optional[int] = None
    prescriptions_created_today: int
    clinical_notes_created_today: int
    agenda_entries_today: Optional[int] = None