from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from uuid import UUID
from typing import List, Optional
from datetime import datetime, date
from app.models.attendance import Attendance
from app.models.staff import Staff
from app.schemas.attendance import AttendanceCreate, AttendanceCheckOut, AttendanceReportResponse


def create_attendance(
    db: Session,
    attendance_data: AttendanceCreate,
    recorded_by_user_id: UUID
) -> Attendance:
    """Registrar entrada (check-in)"""
    attendance = Attendance(
        **attendance_data.model_dump(),
        recorded_by_user_id=recorded_by_user_id
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def check_out_attendance(
    db: Session,
    attendance_id: UUID,
    check_out_data: AttendanceCheckOut,
    recorded_by_user_id: UUID
) -> Attendance:
    """Registrar salida (check-out)"""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de asistencia no encontrado"
        )
    
    if attendance.check_out:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya se registró la salida para este registro"
        )
    
    attendance.check_out = check_out_data.check_out
    if check_out_data.notes:
        attendance.notes = (attendance.notes or "") + "\n" + check_out_data.notes if attendance.notes else check_out_data.notes
    attendance.recorded_by_user_id = recorded_by_user_id
    
    db.commit()
    db.refresh(attendance)
    return attendance


def get_attendances(
    db: Session,
    facility_id: UUID,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    staff_id: Optional[UUID] = None
) -> List[Attendance]:
    """Listar registros de asistencia"""
    query = db.query(Attendance).filter(Attendance.facility_id == facility_id)
    
    if staff_id:
        query = query.filter(Attendance.staff_id == staff_id)
    
    if from_date:
        query = query.filter(func.date(Attendance.check_in) >= from_date)
    
    if to_date:
        query = query.filter(func.date(Attendance.check_in) <= to_date)
    
    return query.order_by(Attendance.check_in.desc()).all()


def get_attendance_report(
    db: Session,
    facility_id: UUID,
    from_date: date,
    to_date: date
) -> List[AttendanceReportResponse]:
    """Generar reporte de asistencia por personal"""
    attendances = get_attendances(db, facility_id, from_date, to_date)
    
    # Agrupar por staff
    staff_data = {}
    for att in attendances:
        if att.staff_id not in staff_data:
            staff = db.query(Staff).filter(Staff.id == att.staff_id).first()
            staff_data[att.staff_id] = {
                "staff_id": att.staff_id,
                "staff_name": f"{staff.first_name} {staff.last_name}" if staff else "Desconocido",
                "check_ins": 0,
                "check_outs": 0,
                "incomplete_sessions": 0,
                "total_seconds": 0
            }
        
        staff_data[att.staff_id]["check_ins"] += 1
        if att.check_out:
            staff_data[att.staff_id]["check_outs"] += 1
            delta = att.check_out - att.check_in
            staff_data[att.staff_id]["total_seconds"] += delta.total_seconds()
        else:
            staff_data[att.staff_id]["incomplete_sessions"] += 1
    
    # Convertir a respuesta
    reports = []
    for data in staff_data.values():
        total_hours = data["total_seconds"] / 3600 if data["total_seconds"] > 0 else None
        reports.append(
            AttendanceReportResponse(
                staff_id=data["staff_id"],
                staff_name=data["staff_name"],
                total_hours=round(total_hours, 2) if total_hours else None,
                check_ins=data["check_ins"],
                check_outs=data["check_outs"],
                incomplete_sessions=data["incomplete_sessions"]
            )
        )
    
    return reports
