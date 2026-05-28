from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access
from app.schemas.external import ResidentExternalEventCreate, ResidentExternalEventResponse
from app.models.auth import User
from app.models.residents import Resident
from app.models.external import ResidentExternalEvent, ExternalPlatform

router = APIRouter(prefix="/residents/{resident_id}/external-events", tags=["external-events"])


@router.post("", response_model=ResidentExternalEventResponse, status_code=201)
async def create_external_event(
    resident_id: UUID,
    event_data: ResidentExternalEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registrar evento de plataforma externa (receta como evento)"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    # Verificar que la plataforma existe
    platform = db.query(ExternalPlatform).filter(
        ExternalPlatform.id == event_data.platform_id
    ).first()
    
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plataforma no encontrada"
        )
    
    event = ResidentExternalEvent(
        resident_id=resident_id,
        facility_id=resident.facility_id,
        performed_by_user_id=current_user.id,
        **event_data.model_dump()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    # Retornar con nombre de plataforma
    return ResidentExternalEventResponse(
        id=event.id,
        resident_id=event.resident_id,
        facility_id=event.facility_id,
        platform_id=event.platform_id,
        platform_name=platform.name,
        event_type=event.event_type,
        used_url=event.used_url,
        notes=event.notes,
        attachment_url=event.attachment_url,
        performed_at=event.performed_at,
        performed_by_user_id=event.performed_by_user_id,
        created_at=event.created_at
    )


@router.get("", response_model=List[ResidentExternalEventResponse])
async def list_external_events(
    resident_id: UUID,
    platform_id: UUID = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar eventos de plataformas externas de un residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    query = db.query(ResidentExternalEvent).filter(
        ResidentExternalEvent.resident_id == resident_id
    )
    
    if platform_id:
        query = query.filter(ResidentExternalEvent.platform_id == platform_id)
    
    events = query.order_by(ResidentExternalEvent.performed_at.desc()).all()
    
    # Cargar nombres de plataformas
    platform_ids = {event.platform_id for event in events}
    platforms = {p.id: p.name for p in db.query(ExternalPlatform).filter(
        ExternalPlatform.id.in_(platform_ids)
    ).all()}
    
    return [
        ResidentExternalEventResponse(
            id=event.id,
            resident_id=event.resident_id,
            facility_id=event.facility_id,
            platform_id=event.platform_id,
            platform_name=platforms.get(event.platform_id, "Desconocida"),
            event_type=event.event_type,
            used_url=event.used_url,
            notes=event.notes,
            attachment_url=event.attachment_url,
            performed_at=event.performed_at,
            performed_by_user_id=event.performed_by_user_id,
            created_at=event.created_at
        )
        for event in events
    ]
