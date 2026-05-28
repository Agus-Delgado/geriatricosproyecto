from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from uuid import UUID
from datetime import datetime, timedelta
from app.models.residents import Resident, ResidentContact
from app.models.audit import AuditLog
from app.services.activity_service import log_event
from app.schemas.residents import ResidentCreate, ResidentUpdate
from fastapi import HTTPException, status


def create_resident(db: Session, resident_data: ResidentCreate, user_id: UUID) -> Resident:
    """Crear nuevo residente con contactos opcionales"""
    # Extraer contactos del payload
    contacts_data = resident_data.contacts or []
    resident_dict = resident_data.model_dump(exclude={'contacts'})
    
    resident = Resident(
        **resident_dict,
        created_by_user_id=user_id,
        updated_by_user_id=user_id
    )
    db.add(resident)
    db.flush()
    
    # Crear contactos si se proporcionaron
    for contact_data in contacts_data:
        # Validar que al menos tenga nombre completo
        if contact_data.full_name and contact_data.full_name.strip():
            contact = ResidentContact(
                resident_id=resident.id,
                full_name=contact_data.full_name.strip(),
                relationship_type=contact_data.relationship_type,
                phone=contact_data.phone,
                email=contact_data.email,
                address=contact_data.address,
                is_primary=contact_data.is_primary
            )
            db.add(contact)
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=resident.facility_id,
        actor_user_id=user_id,
        action="CREATE_RESIDENT",
        entity_type="Resident",
        entity_id=resident.id,
        metadata_json={"resident_name": f"{resident.first_name} {resident.last_name}"}
    )
    db.add(audit_log)
    # Activity feed
    log_event(
        db,
        facility_id=resident.facility_id,
        actor_user_id=user_id,
        event_type="PATIENT_CREATED",
        entity_type="Resident",
        entity_id=resident.id,
        summary=f"Alta de paciente: {resident.last_name}, {resident.first_name}",
        event_metadata={"resident_id": str(resident.id), "dni": resident.dni},
    )
    db.commit()
    db.refresh(resident)

    try:
        from app.services.push_service import notify_activity_from_event

        notify_activity_from_event(
            db,
            facility_id=resident.facility_id,
            event_type="PATIENT_CREATED",
            summary=f"Alta de paciente: {resident.last_name}, {resident.first_name}",
            meta={"resident_id": str(resident.id), "dni": resident.dni},
        )
    except Exception:
        pass
    
    return resident


def get_residents(
    db: Session,
    facility_id: UUID,
    q: str = None,
    stay_status: str = None,
    status: str = None,
) -> list[Resident]:
    """Listar residentes con filtros"""
    query = db.query(Resident).filter(
        Resident.facility_id == facility_id,
        Resident.deleted_at.is_(None),
    )

    if stay_status:
        query = query.filter(Resident.stay_status == stay_status)
    if status:
        query = query.filter(Resident.status == status)
    
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Resident.first_name.ilike(search_term),
                Resident.last_name.ilike(search_term),
                Resident.dni.ilike(search_term)
            )
        )
    
    return query.order_by(Resident.last_name, Resident.first_name).all()


def get_resident_by_id(db: Session, resident_id: UUID, include_deleted: bool = False) -> Resident:
    """Obtener residente por ID"""
    query = db.query(Resident).filter(Resident.id == resident_id)
    if not include_deleted:
        query = query.filter(Resident.deleted_at.is_(None))
    resident = query.first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    return resident


def update_resident(
    db: Session,
    resident_id: UUID,
    resident_data: ResidentUpdate,
    user_id: UUID
) -> Resident:
    """Actualizar residente"""
    resident = get_resident_by_id(db, resident_id)

    # Get Python objects for setting attributes
    update_data = resident_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resident, field, value)

    resident.updated_by_user_id = user_id
    db.flush()

    # Get JSON-serializable version for audit log
    update_data_json = resident_data.model_dump(mode="json", exclude_unset=True)

    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=resident.facility_id,
        actor_user_id=user_id,
        action="UPDATE_RESIDENT",
        entity_type="Resident",
        entity_id=resident.id,
        metadata_json={"changes": update_data_json}
    )
    db.add(audit_log)
    # Activity feed
    try:
        if "status" in update_data_json:
            log_event(
                db,
                facility_id=resident.facility_id,
                actor_user_id=user_id,
                event_type="PATIENT_STATUS_CHANGED",
                entity_type="Resident",
                entity_id=resident.id,
                summary=f"Estado: {resident.last_name}, {resident.first_name} → {update_data_json['status']}",
                event_metadata={
                    "resident_id": str(resident.id),
                    "resident_name": f"{resident.last_name}, {resident.first_name}",
                    "changes": {"status": update_data_json["status"]},
                },
            )
        else:
            log_event(
                db,
                facility_id=resident.facility_id,
                actor_user_id=user_id,
                event_type="PATIENT_UPDATED",
                entity_type="Resident",
                entity_id=resident.id,
                summary=f"Edición de paciente: {resident.last_name}, {resident.first_name}",
                event_metadata={"changes": update_data_json},
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"log_event failed: {e}")
    db.commit()
    db.refresh(resident)

    try:
        from app.services.push_service import notify_activity_from_event

        if "status" in update_data_json:
            notify_activity_from_event(
                db,
                facility_id=resident.facility_id,
                event_type="PATIENT_STATUS_CHANGED",
                summary=f"Estado: {resident.last_name}, {resident.first_name} → {update_data_json['status']}",
                meta={
                    "resident_id": str(resident.id),
                    "resident_name": f"{resident.last_name}, {resident.first_name}",
                    "changes": {"status": update_data_json["status"]},
                },
            )
        else:
            notify_activity_from_event(
                db,
                facility_id=resident.facility_id,
                event_type="PATIENT_UPDATED",
                summary=f"Edición de paciente: {resident.last_name}, {resident.first_name}",
                meta={"changes": update_data_json},
            )
    except Exception:
        pass

    return resident


def delete_resident(db: Session, resident_id: UUID) -> None:
    """Mover residente a papelera (soft-delete). Mantener compatibilidad."""
    soft_delete_resident(db, resident_id, user_id=None)


def soft_delete_resident(db: Session, resident_id: UUID, user_id: UUID | None) -> None:
    """Mover residente a papelera (soft-delete)."""
    resident = get_resident_by_id(db, resident_id)

    if resident.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El residente ya está eliminado"
        )

    resident.deleted_at = datetime.utcnow()
    resident.deleted_by_user_id = user_id
    resident.updated_by_user_id = user_id
    db.flush()

    if user_id is not None:
        audit_log = AuditLog(
            facility_id=resident.facility_id,
            actor_user_id=user_id,
            action="SOFT_DELETE_RESIDENT",
            entity_type="Resident",
            entity_id=resident.id,
            metadata_json={"resident_name": f"{resident.first_name} {resident.last_name}"}
        )
        db.add(audit_log)

    if user_id is not None:
        try:
            log_event(
                db,
                facility_id=resident.facility_id,
                actor_user_id=user_id,
                event_type="PATIENT_DELETED",
                entity_type="Resident",
                entity_id=resident.id,
                summary=f"Paciente eliminado: {resident.last_name}, {resident.first_name}",
                event_metadata={"resident_id": str(resident.id)},
            )
        except Exception:
            pass

    db.commit()


def list_deleted_residents(
    db: Session,
    facility_id: UUID,
    q: str = None,
    within_days: int = 3,
) -> list[Resident]:
    """Listar residentes en papelera (eliminados recientemente)"""
    cutoff = datetime.utcnow() - timedelta(days=within_days)

    query = db.query(Resident).filter(
        Resident.facility_id == facility_id,
        Resident.deleted_at.is_not(None),
        Resident.deleted_at >= cutoff,
    )

    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Resident.first_name.ilike(search_term),
                Resident.last_name.ilike(search_term),
                Resident.dni.ilike(search_term)
            )
        )

    return query.order_by(Resident.deleted_at.desc().nullslast(), Resident.last_name, Resident.first_name).all()


def restore_resident(db: Session, resident_id: UUID, user_id: UUID, within_days: int = 3) -> Resident:
    """Restaurar un residente desde papelera dentro de una ventana de tiempo."""
    resident = get_resident_by_id(db, resident_id, include_deleted=True)

    if resident.deleted_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El residente no está eliminado"
        )

    cutoff = datetime.utcnow() - timedelta(days=within_days)
    if resident.deleted_at < cutoff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El período de restauración expiró"
        )

    resident.deleted_at = None
    resident.deleted_by_user_id = None
    resident.updated_by_user_id = user_id
    db.flush()

    audit_log = AuditLog(
        facility_id=resident.facility_id,
        actor_user_id=user_id,
        action="RESTORE_RESIDENT",
        entity_type="Resident",
        entity_id=resident.id,
        metadata_json={"resident_name": f"{resident.first_name} {resident.last_name}"}
    )
    db.add(audit_log)

    try:
        log_event(
            db,
            facility_id=resident.facility_id,
            actor_user_id=user_id,
            event_type="PATIENT_RESTORED",
            entity_type="Resident",
            entity_id=resident.id,
            summary=f"Paciente restaurado: {resident.last_name}, {resident.first_name}",
            event_metadata={"resident_id": str(resident.id)},
        )
    except Exception:
        pass

    db.commit()
    db.refresh(resident)
    return resident
