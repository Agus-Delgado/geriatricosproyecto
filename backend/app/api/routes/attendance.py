from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access, require_role
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceCheckOut,
    AttendanceResponse,
    AttendanceReportResponse
)
from app.services.attendance_service import (
    create_attendance,
    check_out_attendance,
    get_attendances,
    get_attendance_report
)
from app.models.auth import User
from app.models.attendance import Attendance
from app.models.staff import Staff

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("", response_model=AttendanceResponse, status_code=201)
async def create_attendance_endpoint(
    attendance_data: AttendanceCreate,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Registrar entrada (check-in) (solo OWNER)"""
    require_facility_access(attendance_data.facility_id)(current_user, db)
    
    attendance = create_attendance(db, attendance_data, current_user.id)
    
    # Cargar nombre del staff
    staff = db.query(Staff).filter(Staff.id == attendance.staff_id).first()
    staff_name = f"{staff.first_name} {staff.last_name}" if staff else "Desconocido"
    
    return AttendanceResponse(
        id=attendance.id,
        facility_id=attendance.facility_id,
        staff_id=attendance.staff_id,
        staff_name=staff_name,
        check_in=attendance.check_in,
        check_out=attendance.check_out,
        notes=attendance.notes,
        recorded_by_user_id=attendance.recorded_by_user_id,
        created_at=attendance.created_at
    )


@router.post("/{attendance_id}/check-out", response_model=AttendanceResponse)
async def check_out_endpoint(
    attendance_id: UUID,
    check_out_data: AttendanceCheckOut,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Registrar salida (check-out) (solo OWNER)"""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de asistencia no encontrado"
        )
    
    require_facility_access(attendance.facility_id)(current_user, db)
    
    updated_attendance = check_out_attendance(db, attendance_id, check_out_data, current_user.id)
    
    # Cargar nombre del staff
    staff = db.query(Staff).filter(Staff.id == updated_attendance.staff_id).first()
    staff_name = f"{staff.first_name} {staff.last_name}" if staff else "Desconocido"
    
    return AttendanceResponse(
        id=updated_attendance.id,
        facility_id=updated_attendance.facility_id,
        staff_id=updated_attendance.staff_id,
        staff_name=staff_name,
        check_in=updated_attendance.check_in,
        check_out=updated_attendance.check_out,
        notes=updated_attendance.notes,
        recorded_by_user_id=updated_attendance.recorded_by_user_id,
        created_at=updated_attendance.created_at
    )


@router.get("", response_model=List[AttendanceResponse])
async def list_attendances(
    facility_id: UUID = Query(..., description="ID de la sede"),
    from_date: Optional[date] = Query(None, description="Fecha desde (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="Fecha hasta (YYYY-MM-DD)"),
    staff_id: Optional[UUID] = Query(None, description="Filtrar por personal"),
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Listar registros de asistencia (solo OWNER)"""
    require_facility_access(facility_id)(current_user, db)
    
    attendances = get_attendances(db, facility_id, from_date, to_date, staff_id)
    
    # Cargar nombres de staff
    staff_ids = {att.staff_id for att in attendances}
    staff_map = {
        s.id: f"{s.first_name} {s.last_name}"
        for s in db.query(Staff).filter(Staff.id.in_(staff_ids)).all()
    }
    
    return [
        AttendanceResponse(
            id=att.id,
            facility_id=att.facility_id,
            staff_id=att.staff_id,
            staff_name=staff_map.get(att.staff_id, "Desconocido"),
            check_in=att.check_in,
            check_out=att.check_out,
            notes=att.notes,
            recorded_by_user_id=att.recorded_by_user_id,
            created_at=att.created_at
        )
        for att in attendances
    ]


@router.get("/report", response_model=List[AttendanceReportResponse])
async def get_report(
    facility_id: UUID = Query(..., description="ID de la sede"),
    from_date: date = Query(..., description="Fecha desde (YYYY-MM-DD)"),
    to_date: date = Query(..., description="Fecha hasta (YYYY-MM-DD)"),
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Generar reporte de asistencia (solo OWNER)"""
    require_facility_access(facility_id)(current_user, db)
    
    report = get_attendance_report(db, facility_id, from_date, to_date)
    return report
