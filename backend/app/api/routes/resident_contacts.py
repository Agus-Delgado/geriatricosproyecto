from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access
from app.schemas.residents import (
    ResidentContactCreate,
    ResidentContactUpdate,
    ResidentContactResponse
)
from app.models.auth import User
from app.models.residents import Resident, ResidentContact

router = APIRouter(prefix="/residents/{resident_id}/contacts", tags=["resident-contacts"])


@router.post("", response_model=ResidentContactResponse, status_code=201)
async def create_contact(
    resident_id: UUID,
    contact_data: ResidentContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear contacto familiar/responsable"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    # Validar acceso
    require_facility_access(resident.facility_id)(current_user, db)
    
    contact = ResidentContact(
        resident_id=resident_id,
        **contact_data.model_dump()
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("", response_model=List[ResidentContactResponse])
async def list_contacts(
    resident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar contactos de un residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    # Validar acceso
    require_facility_access(resident.facility_id)(current_user, db)
    
    contacts = db.query(ResidentContact).filter(
        ResidentContact.resident_id == resident_id
    ).all()
    return contacts


@router.patch("/{contact_id}", response_model=ResidentContactResponse)
async def update_contact(
    resident_id: UUID,
    contact_id: UUID,
    contact_data: ResidentContactUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar contacto"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    # Validar acceso
    require_facility_access(resident.facility_id)(current_user, db)
    
    contact = db.query(ResidentContact).filter(
        ResidentContact.id == contact_id,
        ResidentContact.resident_id == resident_id
    ).first()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contacto no encontrado"
        )
    
    update_data = contact_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)
    
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    resident_id: UUID,
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar contacto"""
    resident = db.query(Resident).filter(Resident.id == resident_id, Resident.deleted_at.is_(None)).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    # Validar acceso
    require_facility_access(resident.facility_id)(current_user, db)
    
    contact = db.query(ResidentContact).filter(
        ResidentContact.id == contact_id,
        ResidentContact.resident_id == resident_id
    ).first()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contacto no encontrado"
        )
    
    db.delete(contact)
    db.commit()
    return None
