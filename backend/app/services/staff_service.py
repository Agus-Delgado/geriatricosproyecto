from sqlalchemy.orm import Session
from sqlalchemy import or_
from uuid import UUID
from typing import List, Optional
from datetime import date

from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffUpdate
from app.services.activity_service import log_event
from app.models.staff import ShiftAssignment


def create_staff(db: Session, staff_data: StaffCreate, created_by_user_id: UUID) -> Staff:
    """Crear nuevo miembro del personal"""
    staff = Staff(
        **staff_data.model_dump(),
        created_by_user_id=created_by_user_id
    )
    db.add(staff)
    db.flush()
    # Log activity event
    log_event(
        db,
        facility_id=staff.facility_id,
        actor_user_id=created_by_user_id,
        event_type="STAFF_CREATED",
        entity_type="Staff",
        entity_id=staff.id,
        summary=f"{staff.last_name}, {staff.first_name}",
        event_metadata={
            "staff_id": str(staff.id),
            "staff_name": f"{staff.last_name}, {staff.first_name}",
            "dni": staff.dni,
        },
    )
    db.commit()
    db.refresh(staff)

    try:
        from app.services.push_service import notify_activity_from_event

        notify_activity_from_event(
            db,
            facility_id=staff.facility_id,
            event_type="STAFF_CREATED",
            summary=f"{staff.last_name}, {staff.first_name}",
            meta={
                "staff_id": str(staff.id),
                "staff_name": f"{staff.last_name}, {staff.first_name}",
                "dni": staff.dni,
            },
        )
    except Exception:
        pass
    return staff


def transfer_staff(
    db: Session,
    staff_id: UUID,
    to_facility_id: UUID,
    actor_user_id: UUID,
    effective_date: Optional[date] = None,
) -> Staff:
    """Trasladar personal a otra facility (sin duplicar).

    Nota: como los turnos (shifts) son por facility, se eliminan asignaciones futuras
    del staff para evitar que queden apuntando a un hogar anterior.
    """
    staff = get_staff_by_id(db, staff_id)
    from_facility_id = staff.facility_id
    if from_facility_id == to_facility_id:
        return staff

    cutoff = effective_date or date.today()

    # Eliminar asignaciones futuras del hogar origen (y cualquiera) para este staff
    db.query(ShiftAssignment).filter(
        ShiftAssignment.staff_id == staff_id,
        ShiftAssignment.date >= cutoff,
    ).delete(synchronize_session=False)

    staff.facility_id = to_facility_id
    staff.updated_by_user_id = actor_user_id

    log_event(
        db,
        facility_id=to_facility_id,
        actor_user_id=actor_user_id,
        event_type="STAFF_TRANSFERRED",
        entity_type="Staff",
        entity_id=staff.id,
        summary=f"Traslado de personal a otra sede: {staff.last_name}, {staff.first_name}",
        event_metadata={
            "staff_id": str(staff.id),
            "from_facility_id": str(from_facility_id),
            "to_facility_id": str(to_facility_id),
            "effective_date": str(cutoff),
        },
    )

    db.commit()
    db.refresh(staff)

    try:
        from app.services.push_service import notify_activity_from_event

        notify_activity_from_event(
            db,
            facility_id=to_facility_id,
            event_type="STAFF_TRANSFERRED",
            summary=f"Traslado de personal a otra sede: {staff.last_name}, {staff.first_name}",
            meta={
                "staff_id": str(staff.id),
                "from_facility_id": str(from_facility_id),
                "to_facility_id": str(to_facility_id),
                "effective_date": str(cutoff),
            },
        )
    except Exception:
        pass
    return staff


def get_staff_list(
    db: Session,
    facility_id: UUID,
    active_only: bool = True,
    q: Optional[str] = None
) -> List[Staff]:
    """Listar personal de una facility"""
    query = db.query(Staff).filter(Staff.facility_id == facility_id)
    
    if active_only:
        query = query.filter(Staff.is_active == True)
    
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Staff.first_name.ilike(search_term),
                Staff.last_name.ilike(search_term),
                Staff.dni.ilike(search_term)
            )
        )
    
    return query.order_by(Staff.last_name, Staff.first_name).all()


def get_staff_by_id(db: Session, staff_id: UUID) -> Staff:
    """Obtener personal por ID"""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personal no encontrado"
        )
    return staff


def update_staff(
    db: Session,
    staff_id: UUID,
    staff_data: StaffUpdate,
    actor_user_id: UUID = None
) -> Staff:
    """Actualizar personal"""
    staff = get_staff_by_id(db, staff_id)

    # Get Python objects for setting attributes
    update_data = staff_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(staff, field, value)

    # Get JSON-serializable version for activity log
    update_data_json = staff_data.model_dump(mode="json", exclude_unset=True)

    # Log activity event
    if actor_user_id:
        if "is_active" in update_data_json and update_data_json["is_active"] is False:
            log_event(
                db,
                facility_id=staff.facility_id,
                actor_user_id=actor_user_id,
                event_type="STAFF_ARCHIVED",
                entity_type="Staff",
                entity_id=staff.id,
                summary=f"Baja de personal: {staff.last_name}, {staff.first_name}",
                event_metadata={"changes": update_data_json},
            )
        else:
            log_event(
                db,
                facility_id=staff.facility_id,
                actor_user_id=actor_user_id,
                event_type="STAFF_UPDATED",
                entity_type="Staff",
                entity_id=staff.id,
                summary=f"Edición de personal: {staff.last_name}, {staff.first_name}",
                event_metadata={"changes": update_data_json},
            )

    db.commit()
    db.refresh(staff)

    if actor_user_id:
        try:
            from app.services.push_service import notify_activity_from_event

            if "is_active" in update_data_json and update_data_json["is_active"] is False:
                notify_activity_from_event(
                    db,
                    facility_id=staff.facility_id,
                    event_type="STAFF_ARCHIVED",
                    summary=f"Baja de personal: {staff.last_name}, {staff.first_name}",
                    meta={"changes": update_data_json},
                )
            else:
                notify_activity_from_event(
                    db,
                    facility_id=staff.facility_id,
                    event_type="STAFF_UPDATED",
                    summary=f"Edición de personal: {staff.last_name}, {staff.first_name}",
                    meta={"changes": update_data_json},
                )
        except Exception:
            pass
    return staff
