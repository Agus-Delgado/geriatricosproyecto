from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access
from app.schemas.medications import (
    MedicationPlanCreate,
    MedicationPlanUpdate,
    MedicationPlanResponse,
    MedicationScheduleTimeCreate,
    MedicationScheduleTimeResponse,
    MedicationAdministrationCreate,
    MedicationAdministrationResponse,
    MedicationDueResponse
)
from app.services.medication_service import (
    create_medication_plan,
    get_medication_plans,
    update_medication_plan,
    get_medication_due,
    create_medication_administration
)
from app.models.auth import User
from app.models.residents import Resident
from app.models.medications import MedicationPlan, MedicationScheduleTime, MedicationAdministration

router = APIRouter(tags=["medications"])


# Medication Plans
@router.post("/residents/{resident_id}/medication-plans", response_model=MedicationPlanResponse, status_code=201)
async def create_medication_plan_endpoint(
    resident_id: UUID,
    plan_data: MedicationPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear plan de medicación"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    plan = create_medication_plan(
        db, resident_id, resident.facility_id, plan_data, current_user.id
    )
    return plan


@router.get("/residents/{resident_id}/medication-plans", response_model=List[MedicationPlanResponse])
async def list_medication_plans(
    resident_id: UUID,
    active_only: bool = Query(False, description="Solo planes activos"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar planes de medicación de un residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    plans = get_medication_plans(db, resident_id, active_only)
    return plans


@router.patch("/medication-plans/{plan_id}", response_model=MedicationPlanResponse)
async def update_medication_plan_endpoint(
    plan_id: UUID,
    plan_data: MedicationPlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar plan de medicación (activar/desactivar)"""
    plan = db.query(MedicationPlan).filter(MedicationPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan de medicación no encontrado"
        )
    
    require_facility_access(plan.facility_id)(current_user, db)
    
    updated_plan = update_medication_plan(db, plan_id, plan_data, current_user.id)
    return updated_plan


# Schedule Times
@router.post("/medication-plans/{plan_id}/times", response_model=MedicationScheduleTimeResponse, status_code=201)
async def create_schedule_time(
    plan_id: UUID,
    time_data: MedicationScheduleTimeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Agregar horario a un plan de medicación"""
    plan = db.query(MedicationPlan).filter(MedicationPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan de medicación no encontrado"
        )
    
    require_facility_access(plan.facility_id)(current_user, db)
    
    schedule_time = MedicationScheduleTime(
        medication_plan_id=plan_id,
        **time_data.model_dump()
    )
    db.add(schedule_time)
    db.commit()
    db.refresh(schedule_time)
    return schedule_time


@router.delete("/medication-times/{time_id}", status_code=204)
async def delete_schedule_time(
    time_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar horario de un plan"""
    schedule_time = db.query(MedicationScheduleTime).filter(
        MedicationScheduleTime.id == time_id
    ).first()
    
    if not schedule_time:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario no encontrado"
        )
    
    plan = db.query(MedicationPlan).filter(
        MedicationPlan.id == schedule_time.medication_plan_id
    ).first()
    
    require_facility_access(plan.facility_id)(current_user, db)
    
    db.delete(schedule_time)
    db.commit()
    return None


# Administrations
@router.post("/residents/{resident_id}/medication-administrations", response_model=MedicationAdministrationResponse, status_code=201)
async def create_administration(
    resident_id: UUID,
    admin_data: MedicationAdministrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registrar administración de medicación (MAR)"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    admin = create_medication_administration(
        db, resident_id, resident.facility_id, admin_data, current_user.id
    )
    return admin


@router.get("/residents/{resident_id}/medication-administrations", response_model=List[MedicationAdministrationResponse])
async def list_administrations(
    resident_id: UUID,
    date: Optional[date] = Query(None, description="Filtrar por fecha (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar administraciones de medicación de un residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    query = db.query(MedicationAdministration).filter(
        MedicationAdministration.resident_id == resident_id
    )
    
    if date:
        from datetime import datetime, time
        start_datetime = datetime.combine(date, time.min)
        end_datetime = datetime.combine(date, time.max)
        query = query.filter(
            MedicationAdministration.administered_at >= start_datetime,
            MedicationAdministration.administered_at <= end_datetime
        )
    
    administrations = query.order_by(MedicationAdministration.administered_at.desc()).all()
    return administrations


# Medication Due (pendientes del día)
@router.get("/facilities/{facility_id}/medication-due", response_model=List[MedicationDueResponse])
async def get_medication_due_endpoint(
    facility_id: UUID,
    date: date = Query(..., description="Fecha (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener medicaciones pendientes del día para una sede"""
    require_facility_access(facility_id)(current_user, db)
    
    due_list = get_medication_due(db, facility_id, date)
    return due_list
