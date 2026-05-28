from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_role
from app.schemas.external import (
    ExternalPlatformCreate,
    ExternalPlatformUpdate,
    ExternalPlatformResponse
)
from app.models.auth import User
from app.models.external import ExternalPlatform

router = APIRouter(prefix="/external-platforms", tags=["external-platforms"])


@router.get("", response_model=List[ExternalPlatformResponse])
async def list_platforms(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar plataformas externas (activas por defecto)"""
    query = db.query(ExternalPlatform)
    
    if active_only:
        query = query.filter(ExternalPlatform.is_active == True)
    
    platforms = query.order_by(ExternalPlatform.name).all()
    return platforms


@router.post("", response_model=ExternalPlatformResponse, status_code=201)
async def create_platform(
    platform_data: ExternalPlatformCreate,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Crear plataforma externa (solo OWNER)"""
    # Verificar que el código no exista
    existing = db.query(ExternalPlatform).filter(
        ExternalPlatform.code == platform_data.code
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una plataforma con este código"
        )
    
    platform = ExternalPlatform(**platform_data.model_dump())
    db.add(platform)
    db.commit()
    db.refresh(platform)
    return platform


@router.put("/{platform_id}", response_model=ExternalPlatformResponse)
async def update_platform(
    platform_id: UUID,
    platform_data: ExternalPlatformUpdate,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Actualizar plataforma externa (solo OWNER)"""
    platform = db.query(ExternalPlatform).filter(ExternalPlatform.id == platform_id).first()
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plataforma no encontrada"
        )
    
    update_data = platform_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(platform, field, value)
    
    db.commit()
    db.refresh(platform)
    return platform


@router.delete("/{platform_id}", status_code=204)
async def delete_platform(
    platform_id: UUID,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Desactivar plataforma externa (solo OWNER)"""
    platform = db.query(ExternalPlatform).filter(ExternalPlatform.id == platform_id).first()
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plataforma no encontrada"
        )
    
    # Soft delete - desactivar
    platform.is_active = False
    db.commit()
    return None
