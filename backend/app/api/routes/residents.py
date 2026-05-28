from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access, require_facility_role_any, require_role
from app.schemas.residents import ResidentCreate, ResidentUpdate, ResidentResponse
from app.services.residents_service import (
    create_resident,
    get_residents,
    get_resident_by_id,
    update_resident,
    soft_delete_resident,
    list_deleted_residents,
    restore_resident,
)
from app.services.cloudinary_service import upload_document
from app.models.auth import User
from app.core.config import settings

router = APIRouter(prefix="/residents", tags=["residents"])


@router.post("", response_model=ResidentResponse, status_code=201)
async def create_resident_endpoint(
    resident_data: ResidentCreate,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Crear nuevo residente (requiere rol MEDICO o ADMIN en la facility activa)"""
    # Validar acceso a la facility
    require_facility_access(resident_data.facility_id)(current_user, db)
    
    resident = create_resident(db, resident_data, current_user.id)
    return resident


@router.get("", response_model=List[ResidentResponse])
async def list_residents(
    facility_id: UUID = Query(..., description="ID de la sede"),
    q: Optional[str] = Query(None, description="Búsqueda por nombre o DNI"),
    stay_status: Optional[str] = Query(None, description="Filtrar por estadía: ACTIVE o ENDED"),
    status: Optional[str] = Query(None, description="Filtrar por status del paciente: ACTIVE, INACTIVE, DECEASED"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar residentes con búsqueda y filtros"""
    # Validar acceso a la facility
    require_facility_access(facility_id)(current_user, db)
    
    residents = get_residents(db, facility_id, q, stay_status, status)
    return residents


@router.get("/deleted", response_model=List[ResidentResponse])
async def list_deleted_residents_endpoint(
    facility_id: UUID = Query(..., description="ID de la sede"),
    q: Optional[str] = Query(None, description="Búsqueda por nombre o DNI"),
    within_days: int = Query(3, ge=1, le=30, description="Ventana de restauración en días"),
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Listar pacientes en papelera (eliminados recientemente)"""
    require_facility_access(facility_id)(current_user, db)
    residents = list_deleted_residents(db, facility_id, q=q, within_days=within_days)
    return residents


@router.post("/{resident_id}/restore", response_model=ResidentResponse)
async def restore_resident_endpoint(
    resident_id: UUID,
    within_days: int = Query(3, ge=1, le=30, description="Ventana de restauración en días"),
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Restaurar paciente desde papelera (dentro de la ventana configurada)"""
    resident_any = get_resident_by_id(db, resident_id, include_deleted=True)
    require_facility_access(resident_any.facility_id)(current_user, db)
    restored = restore_resident(db, resident_id, current_user.id, within_days=within_days)
    return restored


@router.get("/{resident_id}", response_model=ResidentResponse)
async def get_resident(
    resident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un residente"""
    resident = get_resident_by_id(db, resident_id)
    
    # Validar acceso a la facility del residente
    require_facility_access(resident.facility_id)(current_user, db)
    
    return resident


@router.patch("/{resident_id}", response_model=ResidentResponse)
async def update_resident_endpoint(
    resident_id: UUID,
    resident_data: ResidentUpdate,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Actualizar residente (requiere rol MEDICO o ADMIN en la facility activa)"""
    resident = get_resident_by_id(db, resident_id)
    
    # Validar acceso a la facility del residente
    require_facility_access(resident.facility_id)(current_user, db)
    
    updated_resident = update_resident(db, resident_id, resident_data, current_user.id)
    return updated_resident


@router.delete("/{resident_id}", status_code=204)
async def delete_resident_endpoint(
    resident_id: UUID,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Eliminar residente (papelera) (requiere rol MEDICO o ADMIN en la facility activa)"""
    # Nota: Validar acceso a la facility del residente
    resident = get_resident_by_id(db, resident_id)
    require_facility_access(resident.facility_id)(current_user, db)
    soft_delete_resident(db, resident_id, current_user.id)
    return


@router.post("/{resident_id}/document", response_model=ResidentResponse, status_code=200)
async def upload_resident_document(
    resident_id: UUID,
    file: UploadFile = File(..., description="Archivo del documento (JPG, PNG, PDF, máx 10MB)"),
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Subir documento (carnet) para un residente (requiere rol MEDICO o ADMIN)"""
    # Validar acceso al residente
    resident = get_resident_by_id(db, resident_id)
    require_facility_access(resident.facility_id)(current_user, db)
    
    # Validar MIME type
    allowed_mimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if file.content_type not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido. Tipos permitidos: {', '.join(allowed_mimes)}"
        )
    
    # Leer contenido del archivo
    file_content = await file.read()
    
    # Validar tamaño (10MB máximo)
    max_size = 10 * 1024 * 1024  # 10MB
    file_size = len(file_content)
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El archivo es demasiado grande. Tamaño máximo: 10MB. Tamaño actual: {file_size / (1024 * 1024):.2f}MB"
        )
    
    try:
        # Subir a Cloudinary
        document_url, document_name, document_size = upload_document(
            file_content=file_content,
            filename=file.filename or f"document_{resident_id}",
            mime_type=file.content_type or 'application/pdf',
            folder=settings.CLOUDINARY_FOLDER
        )
        
        # Actualizar residente con información del documento
        resident.document_url = document_url
        resident.document_name = document_name
        resident.document_mime = file.content_type
        resident.document_size = document_size
        resident.updated_by_user_id = current_user.id
        
        db.commit()
        db.refresh(resident)
        
        return resident
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al subir documento: {str(e)}"
        )
