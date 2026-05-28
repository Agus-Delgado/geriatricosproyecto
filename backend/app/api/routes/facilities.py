from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, get_user_facilities
from app.schemas.facilities import FacilityResponse
from app.models.auth import User
from app.models.org import Facility

router = APIRouter(prefix="/facilities", tags=["facilities"])


@router.get("", response_model=List[FacilityResponse])
async def list_facilities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista de sedes accesibles por el usuario actual"""
    facility_accesses = get_user_facilities(db, current_user.id)
    facility_ids = [access.facility_id for access in facility_accesses]
    
    facilities = db.query(Facility).filter(
        Facility.id.in_(facility_ids),
        Facility.is_active == True
    ).all()
    
    return facilities


@router.get("/by-slug/{slug}", response_model=FacilityResponse)
async def get_facility_by_slug(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener facility por slug (solo si el usuario tiene acceso)"""
    from app.api.deps import require_facility_access
    
    facility = db.query(Facility).filter(Facility.slug == slug).first()
    if not facility:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Geriátrico no encontrado"
        )
    
    # Validar acceso
    require_facility_access(facility.id)(current_user, db)
    
    return facility


@router.get("/{facility_id}", response_model=FacilityResponse)
async def get_facility(
    facility_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de una sede (solo si el usuario tiene acceso)"""
    from app.api.deps import require_facility_access
    
    # Validar acceso
    require_facility_access(facility_id)(current_user, db)
    
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sede no encontrada"
        )
    
    return facility
