from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from uuid import UUID
from datetime import date, datetime, time
from app.models.medications import MedicationPlan, MedicationScheduleTime, MedicationAdministration
from app.models.residents import Resident
from app.models.audit import AuditLog
from app.services.activity_service import log_event
from app.schemas.medications import MedicationPlanCreate, MedicationPlanUpdate
from fastapi import HTTPException, status


def create_medication_plan(
    db: Session,
    resident_id: UUID,
    facility_id: UUID,
    plan_data: MedicationPlanCreate,
    user_id: UUID
) -> MedicationPlan:
    """Crear plan de medicación"""
    plan = MedicationPlan(
        resident_id=resident_id,
        facility_id=facility_id,
        prescribed_by_user_id=user_id,
        **plan_data.model_dump()
    )
    db.add(plan)
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=facility_id,
        actor_user_id=user_id,
        action="CREATE_MEDICATION_PLAN",
        entity_type="MedicationPlan",
        entity_id=plan.id,
        metadata_json={"med_name": plan_data.med_name, "resident_id": str(resident_id)}
    )
    db.add(audit_log)
    # Activity feed
    log_event(
        db,
        facility_id=facility_id,
        actor_user_id=user_id,
        event_type="MEDICATION_CHANGED",
        entity_type="MedicationPlan",
        entity_id=plan.id,
        summary=f"Nuevo plan: {plan_data.med_name}",
        event_metadata={"resident_id": str(resident_id), "dose": plan_data.dose},
    )
    db.commit()
    db.refresh(plan)

    try:
        from app.services.push_service import notify_activity_from_event

        notify_activity_from_event(
            db,
            facility_id=facility_id,
            event_type="MEDICATION_CHANGED",
            summary=f"Nuevo plan: {plan_data.med_name}",
            meta={"resident_id": str(resident_id), "dose": plan_data.dose},
        )
    except Exception:
        pass
    
    return plan


def get_medication_plans(
    db: Session,
    resident_id: UUID,
    active_only: bool = False
) -> list[MedicationPlan]:
    """Listar planes de medicación de un residente"""
    query = db.query(MedicationPlan).filter(MedicationPlan.resident_id == resident_id)
    
    if active_only:
        query = query.filter(MedicationPlan.is_active == True)
    
    return query.order_by(MedicationPlan.created_at.desc()).all()


def update_medication_plan(
    db: Session,
    plan_id: UUID,
    plan_data: MedicationPlanUpdate,
    user_id: UUID
) -> MedicationPlan:
    """Actualizar plan de medicación"""
    plan = db.query(MedicationPlan).filter(MedicationPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan de medicación no encontrado"
        )
    
    # Get Python objects for setting attributes
    update_data = plan_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)

    db.flush()

    # Get JSON-serializable version for audit log
    update_data_json = plan_data.model_dump(mode="json", exclude_unset=True)

    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=plan.facility_id,
        actor_user_id=user_id,
        action="UPDATE_MEDICATION_PLAN",
        entity_type="MedicationPlan",
        entity_id=plan.id,
        metadata_json={"changes": update_data_json}
    )
    db.add(audit_log)
    # Activity feed
    log_event(
        db,
        facility_id=plan.facility_id,
        actor_user_id=user_id,
        event_type="MEDICATION_CHANGED",
        entity_type="MedicationPlan",
        entity_id=plan.id,
        summary="Actualización plan de medicación",
        event_metadata={"changes": update_data_json},
    )
    db.commit()
    db.refresh(plan)

    try:
        from app.services.push_service import notify_activity_from_event

        notify_activity_from_event(
            db,
            facility_id=plan.facility_id,
            event_type="MEDICATION_CHANGED",
            summary="Actualización plan de medicación",
            meta={"changes": update_data_json},
        )
    except Exception:
        pass
    
    return plan


def get_medication_due(
    db: Session,
    facility_id: UUID,
    target_date: date
) -> list:
    """Obtener medicaciones pendientes del día para una facility"""
    # Obtener todos los planes activos de residentes activos en la facility
    active_plans = db.query(MedicationPlan).join(Resident).filter(
        MedicationPlan.facility_id == facility_id,
        MedicationPlan.is_active == True,
        Resident.stay_status == "ACTIVE",
        or_(
            MedicationPlan.start_date.is_(None),
            MedicationPlan.start_date <= target_date
        ),
        or_(
            MedicationPlan.end_date.is_(None),
            MedicationPlan.end_date >= target_date
        )
    ).all()
    
    results = []
    
    for plan in active_plans:
        # Obtener horarios del plan
        schedule_times = db.query(MedicationScheduleTime).filter(
            MedicationScheduleTime.medication_plan_id == plan.id
        ).all()
        
        for schedule_time in schedule_times:
            # Construir datetime para el horario del día
            scheduled_datetime = datetime.combine(target_date, schedule_time.time_of_day)
            
            # Verificar si ya fue administrada
            admin = db.query(MedicationAdministration).filter(
                MedicationAdministration.medication_plan_id == plan.id,
                MedicationAdministration.scheduled_time == scheduled_datetime
            ).first()
            
            results.append({
                "resident_id": plan.resident_id,
                "resident_name": f"{plan.resident.first_name} {plan.resident.last_name}",
                "medication_plan_id": plan.id,
                "med_name": plan.med_name,
                "dose": plan.dose,
                "scheduled_time": scheduled_datetime,
                "status": admin.status if admin else None
            })
    
    # Ordenar por horario
    results.sort(key=lambda x: x["scheduled_time"])
    
    return results


def create_medication_administration(
    db: Session,
    resident_id: UUID,
    facility_id: UUID,
    admin_data,
    user_id: UUID
) -> MedicationAdministration:
    """Registrar administración de medicación"""
    # Verificar que el plan pertenece al residente
    plan = db.query(MedicationPlan).filter(
        MedicationPlan.id == admin_data.medication_plan_id,
        MedicationPlan.resident_id == resident_id
    ).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan de medicación no encontrado para este residente"
        )
    
    admin = MedicationAdministration(
        resident_id=resident_id,
        facility_id=facility_id,
        recorded_by_user_id=user_id,
        **admin_data.model_dump()
    )
    db.add(admin)
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=facility_id,
        actor_user_id=user_id,
        action="RECORD_ADMINISTRATION",
        entity_type="MedicationAdministration",
        entity_id=admin.id,
        metadata_json={
            "resident_id": str(resident_id),
            "medication_plan_id": str(admin_data.medication_plan_id),
            "status": admin_data.status
        }
    )
    db.add(audit_log)
    # Activity feed
    log_event(
        db,
        facility_id=facility_id,
        actor_user_id=user_id,
        event_type="MEDICATION_CHANGED",
        entity_type="MedicationAdministration",
        entity_id=admin.id,
        summary="Administración registrada",
        event_metadata={
            "resident_id": str(resident_id),
            "medication_plan_id": str(admin_data.medication_plan_id),
            "status": admin_data.status,
        },
    )
    db.commit()
    db.refresh(admin)

    try:
        from app.services.push_service import notify_activity_from_event

        notify_activity_from_event(
            db,
            facility_id=facility_id,
            event_type="MEDICATION_CHANGED",
            summary="Administración registrada",
            meta={
                "resident_id": str(resident_id),
                "medication_plan_id": str(admin_data.medication_plan_id),
                "status": admin_data.status,
            },
        )
    except Exception:
        pass
    
    return admin
