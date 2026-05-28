from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta
from app.db.session import get_db
from app.api.deps import require_facility_access, require_role
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse
from app.schemas.staff_report import (
    StaffReportResponse,
    StaffReportStaff,
    StaffReportShiftAssignment,
    StaffReportAttendance,
    StaffReportSummary,
)
from app.services.staff_service import (
    create_staff,
    get_staff_list,
    get_staff_by_id,
    update_staff,
    transfer_staff,
)
from app.models.auth import User
from app.models.org import FacilityUserAccess, Facility
from app.models.staff import ShiftAssignment, Shift
from app.models.attendance import Attendance

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post("", response_model=StaffResponse, status_code=201)
async def create_staff_endpoint(
    staff_data: StaffCreate,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Crear nuevo miembro del personal (solo OWNER)"""
    require_facility_access(staff_data.facility_id)(current_user, db)
    
    staff = create_staff(db, staff_data, current_user.id)
    return staff


@router.get("", response_model=List[StaffResponse])
async def list_staff(
    facility_id: UUID = Query(..., description="ID de la sede"),
    active_only: bool = Query(True, description="Solo personal activo"),
    q: Optional[str] = Query(None, description="Búsqueda por nombre o DNI"),
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Listar personal (solo OWNER)"""
    require_facility_access(facility_id)(current_user, db)
    
    staff_list = get_staff_list(db, facility_id, active_only, q)
    return staff_list


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    staff_id: UUID,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Obtener detalle de personal (solo OWNER)"""
    staff = get_staff_by_id(db, staff_id)
    require_facility_access(staff.facility_id)(current_user, db)
    
    return staff


@router.patch("/{staff_id}", response_model=StaffResponse)
async def update_staff_endpoint(
    staff_id: UUID,
    staff_data: StaffUpdate,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Actualizar personal (solo OWNER)"""
    staff = get_staff_by_id(db, staff_id)
    require_facility_access(staff.facility_id)(current_user, db)
    
    updated_staff = update_staff(db, staff_id, staff_data, actor_user_id=current_user.id)
    return updated_staff


@router.post("/{staff_id}/transfer", response_model=StaffResponse)
async def transfer_staff_endpoint(
    staff_id: UUID,
    to_facility_id: UUID = Query(..., description="ID de la sede destino"),
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db),
):
    """Trasladar personal a otra sede (solo OWNER)."""
    staff = get_staff_by_id(db, staff_id)
    # Debe tener acceso a sede origen y destino
    require_facility_access(staff.facility_id)(current_user, db)
    require_facility_access(to_facility_id)(current_user, db)

    updated = transfer_staff(db, staff_id, to_facility_id, actor_user_id=current_user.id)
    return updated


@router.get("/{staff_id}/report", response_model=StaffReportResponse)
async def get_staff_report(
    staff_id: UUID,
    from_date: date = Query(..., description="Fecha desde (YYYY-MM-DD)"),
    to_date: date = Query(..., description="Fecha hasta (YYYY-MM-DD)"),
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db),
):
    if from_date > to_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rango de fechas inválido")

    staff = get_staff_by_id(db, staff_id)
    require_facility_access(staff.facility_id)(current_user, db)

    accessible_facility_ids: Optional[List[UUID]] = None
    if not current_user.is_platform_admin:
        accessible_facility_ids = [
            r[0]
            for r in db.query(FacilityUserAccess.facility_id)
            .filter(FacilityUserAccess.user_id == current_user.id, FacilityUserAccess.is_active.is_(True))
            .all()
        ]

    assignments_q = (
        db.query(ShiftAssignment, Shift, Facility)
        .join(Shift, Shift.id == ShiftAssignment.shift_id)
        .join(Facility, Facility.id == ShiftAssignment.facility_id)
        .filter(
            ShiftAssignment.staff_id == staff_id,
            ShiftAssignment.date >= from_date,
            ShiftAssignment.date <= to_date,
        )
    )
    if accessible_facility_ids is not None:
        assignments_q = assignments_q.filter(ShiftAssignment.facility_id.in_(accessible_facility_ids))
    assignment_rows = assignments_q.order_by(ShiftAssignment.date.asc(), Shift.name.asc()).all()

    to_date_plus = to_date + timedelta(days=1)
    attendances_q = db.query(Attendance).filter(
        Attendance.staff_id == staff_id,
        func.date(Attendance.check_in) >= from_date,
        func.date(Attendance.check_in) <= to_date_plus,
    )
    if accessible_facility_ids is not None:
        attendances_q = attendances_q.filter(Attendance.facility_id.in_(accessible_facility_ids))
    attendances = attendances_q.order_by(Attendance.check_in.asc()).all()

    facility_ids_for_names = {r[0].facility_id for r in assignment_rows}
    facility_ids_for_names |= {a.facility_id for a in attendances}
    if accessible_facility_ids is not None:
        facility_ids_for_names |= set(accessible_facility_ids)

    facilities_by_id = {
        f.id: f
        for f in (
            db.query(Facility).filter(Facility.id.in_(list(facility_ids_for_names))).all()
            if facility_ids_for_names
            else []
        )
    }

    assignments: List[StaffReportShiftAssignment] = []
    covered = 0
    incomplete = 0
    no_record = 0

    for (assignment, shift, facility) in assignment_rows:
        window_start = datetime.combine(assignment.date, shift.start_time)
        if shift.end_time <= shift.start_time:
            window_end = datetime.combine(assignment.date + timedelta(days=1), shift.end_time)
        else:
            window_end = datetime.combine(assignment.date, shift.end_time)

        matched = None
        for att in attendances:
            if att.facility_id != assignment.facility_id:
                continue
            if att.check_in < window_start:
                continue
            if att.check_in > window_end:
                continue
            matched = att
            break

        if matched is None:
            attendance_status = "NO_RECORD"
            no_record += 1
            check_in_dt = None
            check_out_dt = None
        elif matched.check_out is None:
            attendance_status = "INCOMPLETE"
            incomplete += 1
            check_in_dt = matched.check_in
            check_out_dt = None
        else:
            attendance_status = "COVERED"
            covered += 1
            check_in_dt = matched.check_in
            check_out_dt = matched.check_out

        assignments.append(
            StaffReportShiftAssignment(
                id=assignment.id,
                facility_id=assignment.facility_id,
                facility_name=(facility.name if facility else facilities_by_id.get(assignment.facility_id).name if facilities_by_id.get(assignment.facility_id) else ""),
                date=assignment.date,
                shift_name=shift.name,
                shift_start_time=shift.start_time,
                shift_end_time=shift.end_time,
                notes=assignment.notes,
                attendance_status=attendance_status,
                attendance_check_in=check_in_dt,
                attendance_check_out=check_out_dt,
            )
        )

    attendances_out: List[StaffReportAttendance] = []
    total_seconds = 0.0
    for att in attendances:
        if att.check_out is not None:
            total_seconds += (att.check_out - att.check_in).total_seconds()

        fac = facilities_by_id.get(att.facility_id)
        attendances_out.append(
            StaffReportAttendance(
                id=att.id,
                facility_id=att.facility_id,
                facility_name=(fac.name if fac else ""),
                check_in=att.check_in,
                check_out=att.check_out,
                notes=att.notes,
            )
        )

    total_hours = total_seconds / 3600 if total_seconds > 0 else None
    summary = StaffReportSummary(
        total_assignments=len(assignments),
        assignments_covered=int(covered),
        assignments_incomplete=int(incomplete),
        assignments_no_record=int(no_record),
        total_attendances=len(attendances_out),
        total_hours=(round(float(total_hours), 2) if total_hours is not None else None),
    )

    staff_out = StaffReportStaff(
        id=staff.id,
        first_name=staff.first_name,
        last_name=staff.last_name,
        dni=staff.dni,
        cuil=getattr(staff, "cuil", None),
        phone=staff.phone,
        email=staff.email,
        position=staff.position,
        specialty=getattr(staff, "specialty", None),
        license_number=getattr(staff, "license_number", None),
        hire_date=staff.hire_date,
        end_date=getattr(staff, "end_date", None),
        status=getattr(staff, "status", ""),
        is_active=bool(staff.is_active),
        notes=staff.notes,
    )

    return StaffReportResponse(
        staff=staff_out,
        from_date=from_date,
        to_date=to_date,
        generated_at=datetime.utcnow(),
        assignments=assignments,
        attendances=attendances_out,
        summary=summary,
    )
