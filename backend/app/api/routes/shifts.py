from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date

from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access, require_role
from app.schemas.staff import (
    ShiftCreate, ShiftUpdate, ShiftResponse,
    ShiftAssignmentCreate, ShiftAssignmentUpdate, ShiftAssignmentResponse, ShiftAssignmentWithDetails,
    FacilityStaffDashboard, CurrentlyWorkingStaff
)
from app.services.shift_service import (
    create_shift, get_shifts_by_facility, get_shift_by_id, update_shift, delete_shift,
    create_shift_assignment, get_shift_assignments, get_shift_assignment_by_id,
    update_shift_assignment, delete_shift_assignment,
    get_facility_staff_dashboard, get_currently_working_staff,
    create_bulk_shift_assignments
)
from app.models.auth import User
from app.models.auth import UserRoleAssignment, UserRole
from app.models.activity import ActivityEvent
from app.services.activity_service import log_event

router = APIRouter(prefix="/shifts", tags=["shifts"])


def _is_global_owner(db: Session, user_id: UUID) -> bool:
    return (
        db.query(UserRoleAssignment)
        .join(UserRole)
        .filter(
            UserRoleAssignment.user_id == user_id,
            UserRole.code == "OWNER",
        )
        .first()
        is not None
    )


def _require_admin_or_owner_for_facility(db: Session, current_user: User, facility_id: UUID) -> None:
    """Permite acceso si el usuario es OWNER global, platform admin, o ADMIN en la facility."""
    if current_user.is_platform_admin:
        return
    if _is_global_owner(db, current_user.id):
        return

    # Fallback: exigir que sea ADMIN en la facility
    from app.api.deps import require_facility_role_any

    require_facility_role_any(["ADMIN"])(current_user, db)


# ========== SHIFT ENDPOINTS ==========

@router.post("", response_model=ShiftResponse, status_code=201)
async def create_shift_endpoint(
    shift_data: ShiftCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nuevo turno (ADMIN/OWNER)"""
    require_facility_access(shift_data.facility_id)(current_user, db)
    _require_admin_or_owner_for_facility(db, current_user, shift_data.facility_id)
    shift = create_shift(db, shift_data)
    return shift


@router.get("", response_model=List[ShiftResponse])
async def list_shifts(
    facility_id: UUID = Query(..., description="ID de la sede"),
    active_only: bool = Query(True, description="Solo turnos activos"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar turnos de una facility"""
    require_facility_access(facility_id)(current_user, db)
    shifts = get_shifts_by_facility(db, facility_id, active_only)
    return shifts


@router.get("/{shift_id:uuid}", response_model=ShiftResponse)
async def get_shift(
    shift_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de turno"""
    shift = get_shift_by_id(db, shift_id)
    require_facility_access(shift.facility_id)(current_user, db)
    return shift


@router.patch("/{shift_id:uuid}", response_model=ShiftResponse)
async def update_shift_endpoint(
    shift_id: UUID,
    shift_data: ShiftUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar turno (ADMIN/OWNER)"""
    shift = get_shift_by_id(db, shift_id)
    require_facility_access(shift.facility_id)(current_user, db)
    _require_admin_or_owner_for_facility(db, current_user, shift.facility_id)
    updated_shift = update_shift(db, shift_id, shift_data)
    return updated_shift


@router.delete("/{shift_id:uuid}", status_code=204)
async def delete_shift_endpoint(
    shift_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar turno (ADMIN/OWNER) - solo si no tiene asignaciones"""
    shift = get_shift_by_id(db, shift_id)
    require_facility_access(shift.facility_id)(current_user, db)
    _require_admin_or_owner_for_facility(db, current_user, shift.facility_id)
    delete_shift(db, shift_id)
    return None


# ========== SHIFT ASSIGNMENT ENDPOINTS ==========

@router.post("/assignments", response_model=ShiftAssignmentResponse, status_code=201)
async def create_assignment(
    assignment_data: ShiftAssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nueva asignación de turno (ADMIN/OWNER)"""
    require_facility_access(assignment_data.facility_id)(current_user, db)
    _require_admin_or_owner_for_facility(db, current_user, assignment_data.facility_id)
    assignment = create_shift_assignment(db, assignment_data, current_user.id)
    return assignment


@router.get("/assignments", response_model=List[ShiftAssignmentResponse])
async def list_assignments(
    facility_id: UUID = Query(..., description="ID de la sede"),
    start_date: Optional[date] = Query(None, description="Fecha inicio"),
    end_date: Optional[date] = Query(None, description="Fecha fin"),
    staff_id: Optional[UUID] = Query(None, description="Filtrar por personal"),
    shift_id: Optional[UUID] = Query(None, description="Filtrar por turno"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar asignaciones de turno"""
    require_facility_access(facility_id)(current_user, db)
    assignments = get_shift_assignments(db, facility_id, start_date, end_date, staff_id, shift_id)
    return assignments


@router.get("/assignments/{assignment_id}", response_model=ShiftAssignmentResponse)
async def get_assignment(
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de asignación"""
    assignment = get_shift_assignment_by_id(db, assignment_id)
    require_facility_access(assignment.facility_id)(current_user, db)
    return assignment


@router.patch("/assignments/{assignment_id}", response_model=ShiftAssignmentResponse)
async def update_assignment(
    assignment_id: UUID,
    assignment_data: ShiftAssignmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar asignación de turno (ADMIN/OWNER)"""
    assignment = get_shift_assignment_by_id(db, assignment_id)
    require_facility_access(assignment.facility_id)(current_user, db)
    _require_admin_or_owner_for_facility(db, current_user, assignment.facility_id)
    updated_assignment = update_shift_assignment(db, assignment_id, assignment_data)
    return updated_assignment


@router.delete("/assignments/{assignment_id}", status_code=204)
async def delete_assignment(
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar asignación de turno (ADMIN/OWNER)"""
    assignment = get_shift_assignment_by_id(db, assignment_id)
    require_facility_access(assignment.facility_id)(current_user, db)
    _require_admin_or_owner_for_facility(db, current_user, assignment.facility_id)
    delete_shift_assignment(db, assignment_id, current_user.id)
    return None


# ========== BULK ASSIGNMENT ENDPOINT ==========

@router.post("/assignments/bulk", response_model=List[ShiftAssignmentResponse], status_code=201)
async def create_bulk_assignments(
    facility_id: UUID,
    staff_id: UUID,
    shift_id: UUID,
    start_date: date,
    end_date: date,
    days_of_week: List[int] = Query(..., description="Días de la semana (0=Lunes, 6=Domingo)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear múltiples asignaciones para un rango de fechas (ADMIN/OWNER)"""
    require_facility_access(facility_id)(current_user, db)
    _require_admin_or_owner_for_facility(db, current_user, facility_id)
    assignments = create_bulk_shift_assignments(
        db, facility_id, staff_id, shift_id, start_date, end_date, days_of_week, current_user.id
    )
    return assignments


# ========== DASHBOARD ENDPOINTS ==========

@router.get("/dashboard/{facility_id}", response_model=FacilityStaffDashboard)
async def get_dashboard(
    facility_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dashboard de personal de una facility (ADMIN/OWNER)"""
    require_facility_access(facility_id)(current_user, db)
    _require_admin_or_owner_for_facility(db, current_user, facility_id)
    dashboard = get_facility_staff_dashboard(db, facility_id)

    # Aviso de cobertura insuficiente (rate-limited)
    try:
        if dashboard.coverage_status == "UNDERSTAFFED":
            from datetime import datetime, timedelta

            cutoff = datetime.utcnow() - timedelta(minutes=30)
            recent = (
                db.query(ActivityEvent)
                .filter(
                    ActivityEvent.facility_id == facility_id,
                    ActivityEvent.event_type == "COVERAGE_UNDERSTAFFED",
                    ActivityEvent.created_at >= cutoff,
                )
                .first()
            )
            if not recent:
                log_event(
                    db,
                    facility_id=facility_id,
                    actor_user_id=current_user.id,
                    event_type="COVERAGE_UNDERSTAFFED",
                    entity_type="Facility",
                    entity_id=facility_id,
                    summary="Cobertura insuficiente: no hay personal trabajando en este momento",
                    event_metadata={"facility_id": str(facility_id)},
                )
                db.commit()
    except Exception:
        pass

    return dashboard


@router.get("/currently-working/{facility_id}", response_model=List[CurrentlyWorkingStaff])
async def get_currently_working(
    facility_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener personal actualmente trabajando en una facility"""
    require_facility_access(facility_id)(current_user, db)
    working_staff = get_currently_working_staff(db, facility_id)
    return working_staff
