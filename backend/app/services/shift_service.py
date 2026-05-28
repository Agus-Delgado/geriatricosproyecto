from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
from typing import List, Optional
from datetime import date, datetime, time, timedelta

from app.models.staff import Shift, ShiftAssignment, Staff
from app.models.attendance import Attendance
from app.schemas.staff import (
    ShiftCreate, ShiftUpdate,
    ShiftAssignmentCreate, ShiftAssignmentUpdate,
    CurrentlyWorkingStaff, FacilityStaffDashboard
)
from app.services.activity_service import log_event


# ========== SHIFT CRUD ==========

def create_shift(db: Session, shift_data: ShiftCreate) -> Shift:
    """Crear nuevo turno"""
    shift = Shift(**shift_data.model_dump())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


def get_shifts_by_facility(db: Session, facility_id: UUID, active_only: bool = True) -> List[Shift]:
    """Obtener todos los turnos de una facility"""
    query = db.query(Shift).filter(Shift.facility_id == facility_id)

    if active_only:
        query = query.filter(Shift.is_active == True)

    return query.order_by(Shift.start_time).all()


def get_shift_by_id(db: Session, shift_id: UUID) -> Shift:
    """Obtener turno por ID"""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turno no encontrado"
        )
    return shift


def update_shift(db: Session, shift_id: UUID, shift_data: ShiftUpdate) -> Shift:
    """Actualizar turno"""
    shift = get_shift_by_id(db, shift_id)

    update_data = shift_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shift, field, value)

    db.commit()
    db.refresh(shift)
    return shift


def delete_shift(db: Session, shift_id: UUID) -> None:
    """Eliminar turno (solo si no tiene asignaciones)"""
    shift = get_shift_by_id(db, shift_id)

    # Verificar si tiene asignaciones
    assignments_count = db.query(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id
    ).count()

    if assignments_count > 0:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el turno porque tiene {assignments_count} asignaciones asociadas"
        )

    db.delete(shift)
    db.commit()


# ========== SHIFT ASSIGNMENT CRUD ==========

def create_shift_assignment(
    db: Session,
    assignment_data: ShiftAssignmentCreate,
    created_by_user_id: Optional[UUID] = None
) -> ShiftAssignment:
    """Crear nueva asignación de turno"""
    # Verificar que no exista ya una asignación para ese staff, shift y fecha
    existing = db.query(ShiftAssignment).filter(
        and_(
            ShiftAssignment.staff_id == assignment_data.staff_id,
            ShiftAssignment.shift_id == assignment_data.shift_id,
            ShiftAssignment.date == assignment_data.date
        )
    ).first()

    if existing:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una asignación para este personal en este turno y fecha"
        )

    assignment = ShiftAssignment(
        **assignment_data.model_dump(),
        created_by_user_id=created_by_user_id
    )
    db.add(assignment)
    db.flush()

    # Log activity
    if created_by_user_id:
        staff = db.query(Staff).filter(Staff.id == assignment_data.staff_id).first()
        shift = db.query(Shift).filter(Shift.id == assignment_data.shift_id).first()
        log_event(
            db,
            facility_id=assignment_data.facility_id,
            actor_user_id=created_by_user_id,
            event_type="SHIFT_ASSIGNED",
            entity_type="ShiftAssignment",
            entity_id=assignment.id,
            summary=f"Turno asignado: {staff.first_name} {staff.last_name} - {shift.name} ({assignment_data.date})",
            event_metadata={
                "staff_id": str(assignment_data.staff_id),
                "shift_id": str(assignment_data.shift_id),
                "date": str(assignment_data.date)
            },
        )

    db.commit()
    db.refresh(assignment)

    if created_by_user_id:
        try:
            from app.services.push_service import notify_activity_from_event

            notify_activity_from_event(
                db,
                facility_id=assignment_data.facility_id,
                event_type="SHIFT_ASSIGNED",
                summary=f"Turno asignado: {staff.first_name} {staff.last_name} - {shift.name} ({assignment_data.date})",
                meta={
                    "staff_id": str(assignment_data.staff_id),
                    "shift_id": str(assignment_data.shift_id),
                    "date": str(assignment_data.date),
                },
            )
        except Exception:
            pass
    return assignment


def get_shift_assignments(
    db: Session,
    facility_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    staff_id: Optional[UUID] = None,
    shift_id: Optional[UUID] = None
) -> List[ShiftAssignment]:
    """Obtener asignaciones de turno con filtros opcionales"""
    query = db.query(ShiftAssignment).filter(
        ShiftAssignment.facility_id == facility_id
    )

    if start_date:
        query = query.filter(ShiftAssignment.date >= start_date)

    if end_date:
        query = query.filter(ShiftAssignment.date <= end_date)

    if staff_id:
        query = query.filter(ShiftAssignment.staff_id == staff_id)

    if shift_id:
        query = query.filter(ShiftAssignment.shift_id == shift_id)

    return query.order_by(ShiftAssignment.date, ShiftAssignment.shift_id).all()


def get_shift_assignment_by_id(db: Session, assignment_id: UUID) -> ShiftAssignment:
    """Obtener asignación por ID"""
    assignment = db.query(ShiftAssignment).filter(ShiftAssignment.id == assignment_id).first()
    if not assignment:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación no encontrada"
        )
    return assignment


def update_shift_assignment(
    db: Session,
    assignment_id: UUID,
    assignment_data: ShiftAssignmentUpdate
) -> ShiftAssignment:
    """Actualizar asignación de turno"""
    assignment = get_shift_assignment_by_id(db, assignment_id)

    update_data = assignment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assignment, field, value)

    db.commit()
    db.refresh(assignment)
    return assignment


def delete_shift_assignment(db: Session, assignment_id: UUID, actor_user_id: Optional[UUID] = None) -> None:
    """Eliminar asignación de turno"""
    assignment = get_shift_assignment_by_id(db, assignment_id)

    # Log activity
    if actor_user_id:
        staff = db.query(Staff).filter(Staff.id == assignment.staff_id).first()
        shift = db.query(Shift).filter(Shift.id == assignment.shift_id).first()
        log_event(
            db,
            facility_id=assignment.facility_id,
            actor_user_id=actor_user_id,
            event_type="SHIFT_UNASSIGNED",
            entity_type="ShiftAssignment",
            entity_id=assignment.id,
            summary=f"Turno removido: {staff.first_name} {staff.last_name} - {shift.name} ({assignment.date})",
            event_metadata={
                "staff_id": str(assignment.staff_id),
                "shift_id": str(assignment.shift_id),
                "date": str(assignment.date)
            },
        )

    db.delete(assignment)
    db.commit()

    if actor_user_id:
        try:
            from app.services.push_service import notify_activity_from_event

            notify_activity_from_event(
                db,
                facility_id=assignment.facility_id,
                event_type="SHIFT_UNASSIGNED",
                summary=f"Turno removido: {staff.first_name} {staff.last_name} - {shift.name} ({assignment.date})",
                meta={
                    "staff_id": str(assignment.staff_id),
                    "shift_id": str(assignment.shift_id),
                    "date": str(assignment.date),
                },
            )
        except Exception:
            pass


# ========== DASHBOARD: QUIÉN ESTÁ TRABAJANDO AHORA ==========

def get_currently_working_staff(db: Session, facility_id: UUID) -> List[CurrentlyWorkingStaff]:
    """Obtener personal actualmente trabajando en una facility"""
    now = datetime.utcnow()
    today = now.date()
    current_time = now.time()

    # Obtener asignaciones de hoy
    assignments = db.query(ShiftAssignment, Shift, Staff).join(
        Shift, ShiftAssignment.shift_id == Shift.id
    ).join(
        Staff, ShiftAssignment.staff_id == Staff.id
    ).filter(
        and_(
            ShiftAssignment.facility_id == facility_id,
            ShiftAssignment.date == today,
            Staff.is_active == True,
            # El turno incluye la hora actual
            Shift.start_time <= current_time,
            Shift.end_time >= current_time
        )
    ).all()

    result = []
    for assignment, shift, staff in assignments:
        # Verificar si tiene check-in hoy
        attendance = db.query(Attendance).filter(
            and_(
                Attendance.staff_id == staff.id,
                Attendance.facility_id == facility_id,
                Attendance.check_in >= datetime.combine(today, time.min),
                Attendance.check_out == None  # Aún no ha hecho check-out
            )
        ).first()

        result.append(CurrentlyWorkingStaff(
            id=staff.id,
            first_name=staff.first_name,
            last_name=staff.last_name,
            position=staff.position,
            phone=staff.phone,
            shift_name=shift.name,
            shift_start=shift.start_time,
            shift_end=shift.end_time,
            check_in_time=attendance.check_in if attendance else None,
            is_checked_in=attendance is not None
        ))

    return result


def get_facility_staff_dashboard(db: Session, facility_id: UUID) -> FacilityStaffDashboard:
    """Dashboard completo de personal de una facility"""
    # Contar personal total y activo
    total_staff = db.query(Staff).filter(Staff.facility_id == facility_id).count()
    active_staff = db.query(Staff).filter(
        and_(
            Staff.facility_id == facility_id,
            Staff.is_active == True
        )
    ).count()

    # Personal actualmente trabajando
    currently_working = get_currently_working_staff(db, facility_id)

    # Turnos de hoy
    today = datetime.utcnow().date()
    shifts_today = db.query(ShiftAssignment).filter(
        and_(
            ShiftAssignment.facility_id == facility_id,
            ShiftAssignment.date == today
        )
    ).count()

    # Determinar estado de cobertura (simplificado)
    coverage_status = "FULL"
    if len(currently_working) == 0:
        coverage_status = "UNDERSTAFFED"
    elif len(currently_working) > active_staff * 0.8:
        coverage_status = "OVERSTAFFED"

    # Obtener nombre de facility
    from app.models.org import Facility
    facility = db.query(Facility).filter(Facility.id == facility_id).first()

    return FacilityStaffDashboard(
        facility_id=facility_id,
        facility_name=facility.name if facility else "Desconocido",
        total_staff=total_staff,
        active_staff=active_staff,
        currently_working=currently_working,
        shifts_today=shifts_today,
        coverage_status=coverage_status
    )


# ========== BULK ASSIGNMENT ==========

def create_bulk_shift_assignments(
    db: Session,
    facility_id: UUID,
    staff_id: UUID,
    shift_id: UUID,
    start_date: date,
    end_date: date,
    days_of_week: List[int],  # 0=Lunes, 6=Domingo
    created_by_user_id: Optional[UUID] = None
) -> List[ShiftAssignment]:
    """Crear múltiples asignaciones de turno para un rango de fechas"""
    assignments = []
    current_date = start_date

    while current_date <= end_date:
        # Verificar si el día de la semana está en la lista
        if current_date.weekday() in days_of_week:
            # Verificar si ya existe
            existing = db.query(ShiftAssignment).filter(
                and_(
                    ShiftAssignment.staff_id == staff_id,
                    ShiftAssignment.shift_id == shift_id,
                    ShiftAssignment.date == current_date
                )
            ).first()

            if not existing:
                assignment = ShiftAssignment(
                    staff_id=staff_id,
                    shift_id=shift_id,
                    facility_id=facility_id,
                    date=current_date,
                    created_by_user_id=created_by_user_id
                )
                db.add(assignment)
                assignments.append(assignment)

        current_date += timedelta(days=1)

    if assignments:
        db.commit()
        for assignment in assignments:
            db.refresh(assignment)

    return assignments
